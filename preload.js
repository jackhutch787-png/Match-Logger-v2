const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url),
  resolveSkyTeams: (url) => ipcRenderer.invoke('sky-resolve-teams', url)
});
