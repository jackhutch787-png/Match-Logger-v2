const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchFotmobMatches: (date) => ipcRenderer.invoke('fotmob-matches', date),
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url),
  resolveSkyFixture: (fixture) => ipcRenderer.invoke('sky-resolve-fixture', fixture)
});
