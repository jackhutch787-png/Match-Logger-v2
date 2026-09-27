const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url)
});
