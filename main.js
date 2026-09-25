const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let skyWindow = null;
let skyLoadPromise = null;

function createWindow(){
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#081019',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

function ensureSkyWindow(){
  if(skyWindow && !skyWindow.isDestroyed()) return skyWindow;
  skyWindow = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  skyWindow.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36');
  skyWindow.on('closed', ()=>{ skyWindow = null; });
  return skyWindow;
}

function wait(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }

async function loadSkyRendered(url){
  if(!/^https:\/\/(www\.)?skysports\.com\//i.test(url)) throw new Error('Only Sky Sports HTTPS URLs are permitted');
  const win=ensureSkyWindow();
  if(skyLoadPromise) await skyLoadPromise;
  let resolveLoad, rejectLoad;
  skyLoadPromise=new Promise((resolve,reject)=>{resolveLoad=resolve;rejectLoad=reject;});
  const timeout=setTimeout(()=>rejectLoad(new Error('Sky page load timed out')),30000);
  const done=()=>{clearTimeout(timeout);resolveLoad();};
  win.webContents.once('did-finish-load',done);
  try{
    await win.loadURL(url,{
      extraHeaders:'Accept-Language: en-GB,en;q=0.9\r\n'
    });
    // Sky's Scores & Fixtures page is client-rendered. Give its data layer time to populate.
    // Wait until Sky's fixture content has rendered. The page is client-rendered,
    // and a fixed short delay was not reliable on slower work machines.
    const started=Date.now();
    while(Date.now()-started<12000){
      const ready=await win.webContents.executeJavaScript(`document.body && /Scores & Fixtures|Football Calendar/i.test(document.body.innerText||'')`,true).catch(()=>false);
      if(ready) break;
      await wait(500);
    }
    await wait(1000);
    const result=await win.webContents.executeJavaScript(`(() => ({
      html: document.documentElement.outerHTML,
      text: document.body ? document.body.innerText : '',
      title: document.title,
      url: location.href
    }))()`,true);
    if(!result?.html || result.html.length<500) throw new Error('Sky returned an empty page');
    return result;
  } finally {
    clearTimeout(timeout);
    skyLoadPromise=null;
  }
}

ipcMain.handle('http-fetch', async (_event, url) => loadSkyRendered(url));

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback)=>callback(false));
  createWindow();
  app.on('activate', ()=>{if(BrowserWindow.getAllWindows().length===0) createWindow();});
});
app.on('window-all-closed', ()=>{if(process.platform!=='darwin') app.quit();});
