const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url),
    resolveTeams: (url) => ipcRenderer.invoke('resolve-teams', url)
});
