const { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage, shell } = require('electron');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const netModule = require('node:net');

protocol.registerSchemesAsPrivileged([{
  scheme: 'skillbridge',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

let mainWindow;
let backendProcess;
let backendLog;
let apiUrl;
let smtpSettings;
let shutdownStarted = false;

const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'email-settings.enc');
}

function getPublicStatus() {
  return {
    desktop: true,
    backendReady: Boolean(backendProcess && backendProcess.exitCode === null),
    emailSetupRequired: !smtpSettings?.host,
    smtp: smtpSettings ? {
      configured: Boolean(smtpSettings.host),
      host: smtpSettings.host,
      port: String(smtpSettings.port),
      username: smtpSettings.username,
      passwordConfigured: Boolean(smtpSettings.password),
      from: smtpSettings.from,
      auth: smtpSettings.auth,
      demoOtpRecipient: smtpSettings.demoOtpRecipient,
    } : null,
  };
}

async function loadSettings() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is unavailable. Restart SkillBridge and try again.');
  }
  const encrypted = await fs.promises.readFile(file);
  return JSON.parse(safeStorage.decryptString(encrypted));
}

async function storeSettings(settings) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is unavailable. Your email settings were not saved.');
  }
  const file = settingsPath();
  const temporary = `${file}.tmp`;
  await fs.promises.writeFile(temporary, safeStorage.encryptString(JSON.stringify(settings)));
  await fs.promises.rename(temporary, file);
}

function validateSettings(input, previous) {
  const host = String(input?.host || '').trim();
  const port = Number(input?.port);
  const username = String(input?.username || '').trim();
  const from = String(input?.from || '').trim();
  const demoOtpRecipient = String(input?.demoOtpRecipient || '').trim();
  const auth = input?.auth !== false;
  const passwordInput = String(input?.password || '');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!host || host.length > 255 || /[\r\n\s]/.test(host)) throw new Error('Enter a valid SMTP server hostname.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Enter an SMTP port between 1 and 65535.');
  if (auth && (!username || username.length > 254)) throw new Error('Enter your SMTP username.');
  if (auth && !passwordInput && !previous?.password) throw new Error('Enter your SMTP password or app password.');
  if (passwordInput.length > 500 || /[\r\n]/.test(passwordInput)) throw new Error('The SMTP password is invalid.');
  if (!emailPattern.test(from)) throw new Error('Enter a valid sender email address.');
  if (demoOtpRecipient && !emailPattern.test(demoOtpRecipient)) throw new Error('Enter a valid demo sign-in inbox address.');

  return {
    host,
    port,
    username: auth ? username : '',
    password: auth ? (passwordInput || previous?.password || '') : '',
    from,
    auth,
    demoOtpRecipient,
  };
}

async function findAvailablePort() {
  const server = netModule.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function backendPaths() {
  if (app.isPackaged) {
    return {
      jar: path.join(process.resourcesPath, 'backend', 'skillbridge-api-runtime.jar'),
      java: path.join(process.resourcesPath, 'runtime', 'bin', 'java.exe'),
    };
  }
  const root = path.resolve(__dirname, '..');
  const javaHome = process.env.JAVA_HOME;
  return {
    jar: path.join(root, 'backend', 'target', 'skillbridge-api-runtime.jar'),
    java: javaHome ? path.join(javaHome, 'bin', 'java.exe') : 'java',
  };
}

async function waitForBackend(child) {
  const deadline = Date.now() + 90000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('The SkillBridge data service stopped unexpectedly. Check the application log for details.');
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The SkillBridge data service did not start in time.${lastError ? ` ${lastError.message}` : ''}`);
}

async function startBackend(settings = smtpSettings) {
  const { jar, java } = backendPaths();
  if (!fs.existsSync(jar)) throw new Error(`SkillBridge's local data service is missing: ${jar}`);
  if (java !== 'java' && !fs.existsSync(java)) throw new Error(`The bundled Java runtime is missing: ${java}`);

  const port = await findAvailablePort();
  apiUrl = `http://127.0.0.1:${port}/api`;
  const userData = app.getPath('userData').replace(/\\/g, '/');
  const dataDirectory = path.join(userData, 'data');
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  const databaseUrl = `jdbc:h2:file:${path.join(dataDirectory, 'skillbridge').replace(/\\/g, '/')};MODE=MySQL;DB_CLOSE_ON_EXIT=FALSE`;
  const logPath = path.join(app.getPath('userData'), 'backend.log');
  backendLog = fs.createWriteStream(logPath, { flags: 'a' });

  const child = spawn(java, ['-jar', jar], {
    cwd: app.getPath('userData'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SPRING_PROFILES_ACTIVE: 'desktop,demo',
      SKILLBRIDGE_DEMO_SEED_ENABLED: 'true',
      SKILLBRIDGE_JWT_SECRET: randomBytes(48).toString('hex'),
      SERVER_ADDRESS: '127.0.0.1',
      PORT: String(port),
      CORS_ALLOWED_ORIGINS: 'skillbridge://localhost',
      DATABASE_URL: databaseUrl,
      DATABASE_USERNAME: 'sa',
      DATABASE_PASSWORD: '',
      MAIL_HOST: settings?.host || '',
      MAIL_PORT: String(settings?.port || 587),
      MAIL_USERNAME: settings?.username || '',
      MAIL_PASSWORD: settings?.password || '',
      MAIL_FROM: settings?.from || 'noreply@skillbridge.local',
      MAIL_SMTP_AUTH: String(settings?.auth !== false),
      MAIL_SMTP_STARTTLS: 'true',
      DEMO_OTP_RECIPIENT: settings?.demoOtpRecipient || '',
    },
  });

  child.stdout.on('data', (data) => backendLog?.write(data));
  child.stderr.on('data', (data) => backendLog?.write(data));
  child.on('error', (error) => backendLog?.write(`Backend process error: ${error.message}\n`));
  child.on('exit', (code) => backendLog?.write(`Backend stopped with exit code ${code}.\n`));
  backendProcess = child;
  await waitForBackend(child);
}

async function stopBackend() {
  const child = backendProcess;
  backendProcess = null;
  if (backendLog) {
    backendLog.end();
    backendLog = null;
  }
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill();
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

async function restartBackend(settings) {
  await stopBackend();
  smtpSettings = settings;
  await startBackend(settings);
  return getPublicStatus();
}

function mimeType(file) {
  return mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function serveApp(request) {
  const root = path.resolve(app.getAppPath(), 'dist');
  const url = new URL(request.url);
  let relativePath = decodeURIComponent(url.pathname).replace(/^[/\\]+/, '');
  if (!relativePath) relativePath = 'index.html';
  let file = path.resolve(root, relativePath);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const contents = await fs.promises.readFile(file);
    return new Response(contents, { headers: { 'Content-Type': mimeType(file) } });
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
    file = path.join(root, 'index.html');
    const contents = await fs.promises.readFile(file);
    return new Response(contents, { headers: { 'Content-Type': mimeType(file) } });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 700,
    show: false,
    backgroundColor: '#f7f8fc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('skillbridge://localhost/')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  mainWindow.loadURL('skillbridge://localhost/');
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('desktop:get-api-url', () => apiUrl);
ipcMain.handle('desktop:get-status', () => getPublicStatus());
ipcMain.handle('desktop:save-email-settings', async (_event, input) => {
  const updated = validateSettings(input, smtpSettings);
  await storeSettings(updated);
  return restartBackend(updated);
});

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  try {
    smtpSettings = await loadSettings();
    await protocol.handle('skillbridge', serveApp);
    await startBackend(smtpSettings);
    createWindow();
  } catch (error) {
    dialog.showErrorBox('SkillBridge could not start', `${error.message}\n\nSee the SkillBridge application data folder for diagnostic logs.`);
    app.quit();
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', (event) => {
  if (!backendProcess || shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  stopBackend().finally(() => app.exit(0));
});

app.on('window-all-closed', () => app.quit());
