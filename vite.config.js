import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'SkillBridge', 'vite-cache'),
  server: { host: '0.0.0.0', port: 5173 },
});
