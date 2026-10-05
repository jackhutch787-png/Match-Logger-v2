const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('llBridge', {
  fetchFotmobMatches: (date) => ipcRenderer.invoke('fotmob-matches', date),
  fetchFotmobMatchDetails: (matchId) => ipcRenderer.invoke('fotmob-match-details', matchId),
  fetchSky: (url) => ipcRenderer.invoke('http-fetch', url),
  resolveSkyFixture: (fixture) => ipcRenderer.invoke('sky-resolve-fixture', fixture)
});
