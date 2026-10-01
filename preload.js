const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url),
  resolveSkyFixture: (fixture) => ipcRenderer.invoke('sky-resolve-fixture', fixture)
});
