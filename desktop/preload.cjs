const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skillbridgeDesktop', {
  getApiUrl: () => ipcRenderer.invoke('desktop:get-api-url'),
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  saveEmailSettings: (settings) => ipcRenderer.invoke('desktop:save-email-settings', settings),
});
