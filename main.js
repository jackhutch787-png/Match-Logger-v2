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
      const ready=await win.webContents.executeJavaScript(`document.body && /Scores & Fixtures|Football Calendar|\bTeams\b|Match Officials|Substitutes/i.test(document.body.innerText||'')`,true).catch(()=>false);
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

async function findTeamsUrlOnCurrentPage(){
  const win=ensureSkyWindow();
  return await win.webContents.executeJavaScript(`(() => {
    const abs=h=>{try{return new URL(h,location.href).href}catch(e){return ''}};
    const links=[...document.querySelectorAll('a[href]')];
    const score=a=>{
      const t=(a.innerText||a.textContent||a.getAttribute('aria-label')||'').trim();
      const h=a.getAttribute('href')||'';
      const parts=h.split('/teams/'); if(parts.length<2 || !Number.isInteger(Number(parts[1].split('/')[0].split('?')[0].split('#')[0]))) return -1;
      let n=0; if(/^teams$/i.test(t)) n+=100; if(/teams/i.test(t)) n+=20; if(h.toLowerCase().includes('/football/')) n+=10; return n;
    };
    const ranked=links.map(a=>({a,n:score(a)})).filter(x=>x.n>=0).sort((a,b)=>b.n-a.n);
    return ranked.length ? abs(ranked[0].a.getAttribute('href')) : '';
  })()`,true).catch(()=> '');
}

async function waitForTeamsPage(){
  const win=ensureSkyWindow();
  const started=Date.now();
  while(Date.now()-started<15000){
    const state=await win.webContents.executeJavaScript(`(() => ({url:location.href, text:document.body?.innerText||''}))()`,true).catch(()=>({url:win.webContents.getURL(),text:''}));
    if(state.url.toLowerCase().includes('/teams/') && state.text.toLowerCase().includes('teams')) return state;
    if(/\\bTeams\\b[\\s\\S]*\\bSubstitutes\\b/i.test(state.text)) return state;
    await wait(500);
  }
  return await win.webContents.executeJavaScript(`(() => ({url:location.href,text:document.body?.innerText||'',html:document.documentElement.outerHTML}))()`,true).catch(()=>({url:win.webContents.getURL(),text:'',html:''}));
}

ipcMain.handle('resolve-teams', async (_event, url) => {
  const page=await loadSkyRendered(url);
  const win=ensureSkyWindow();

  // 1) Prefer Sky's actual Teams URL if it is present in the rendered match-centre DOM.
  let teamsUrl=await findTeamsUrlOnCurrentPage();
  if(teamsUrl) return teamsUrl;

  // 2) If Sky exposes Teams as a tab/button rather than a direct anchor, click that tab.
  const clicked=await win.webContents.executeJavaScript(`(() => {
    const els=[...document.querySelectorAll('a,button,[role="tab"],[role="button"]')];
    const el=els.find(x=>(x.innerText||x.textContent||x.getAttribute('aria-label')||'').trim().toLowerCase()==='teams');
    if(!el)return false; el.scrollIntoView({block:'center'}); el.click(); return true;
  })()`,true).catch(()=>false);
  if(clicked){
    const state=await waitForTeamsPage();
    if(state.url.toLowerCase().includes('/teams/')) return state.url;
    teamsUrl=await findTeamsUrlOnCurrentPage();
    if(teamsUrl) return teamsUrl;
  }

  // 3) Search all loaded source attributes for an embedded Teams route.
  const embedded=await win.webContents.executeJavaScript(`(() => {
    const links=[...document.querySelectorAll('a[href]')];
    const x=links.find(a=>{const h=a.getAttribute('href')||''; const p=h.toLowerCase().split('/teams/'); return p.length>1 && Number.isInteger(Number(p[1].split('/')[0].split('?')[0].split('#')[0]));});
    if(!x)return ''; try{return new URL(x.getAttribute('href'),location.href).href}catch(e){return ''}
  })()`,true).catch(()=> '');
  if(embedded) return embedded;
  throw new Error('Sky match centre did not expose its Teams page');
});


ipcMain.handle('get-sky-lineups-page', async (_event, url) => {
  await loadSkyRendered(url);
  const win=ensureSkyWindow();
  let teamsUrl=await findTeamsUrlOnCurrentPage();
  if(teamsUrl){
    const result=await loadSkyRendered(teamsUrl);
    return {url:result.url||teamsUrl,text:result.text,html:result.html};
  }
  const clicked=await win.webContents.executeJavaScript(`(() => {
    const els=[...document.querySelectorAll('a,button,[role="tab"],[role="button"]')];
    const el=els.find(x=>(x.innerText||x.textContent||x.getAttribute('aria-label')||'').trim().toLowerCase()==='teams');
    if(!el)return false; el.scrollIntoView({block:'center'}); el.click(); return true;
  })()`,true).catch(()=>false);
  if(!clicked) throw new Error('Sky match centre has no Teams tab/link');
  const state=await waitForTeamsPage();
  const currentText=state.text||'';
  if(!currentText.toLowerCase().includes('teams')) throw new Error('Sky Teams section did not load');
  return {url:state.url||win.webContents.getURL(),text:currentText,html:state.html||''};
});

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback)=>callback(false));
  createWindow();
  app.on('activate', ()=>{if(BrowserWindow.getAllWindows().length===0) createWindow();});
});
app.on('window-all-closed', ()=>{if(process.platform!=='darwin') app.quit();});
