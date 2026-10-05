const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let skyWindow = null;
let skyLoadPromise = null;
const SKY_ORIGIN_RE=/^https:\/\/(?:www\.)?skysports\.com\//i;

const FOTMOB_MATCHES_URL='https://www.fotmob.com/api/data/matches';
async function fetchFotmobMatches(date){
  const d=String(date||'').replace(/-/g,'');
  if(!/^\d{8}$/.test(d)) throw new Error('FotMob date must be YYYY-MM-DD or YYYYMMDD');
  const url=`${FOTMOB_MATCHES_URL}?date=${encodeURIComponent(d)}&timezone=Europe%2FLondon&ccode3=GBR`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{
      signal:controller.signal,
      headers:{
        'accept':'application/json,text/plain,*/*',
        'accept-language':'en-GB,en;q=0.9',
        'referer':'https://www.fotmob.com/en-GB',
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36'
      }
    });
    if(!response.ok) throw new Error(`FotMob returned HTTP ${response.status}`);
    const data=await response.json();
    if(!data || !Array.isArray(data.leagues)) throw new Error('FotMob returned an unexpected matches payload');
    return {ok:true,url,date:d,data};
  } finally { clearTimeout(timeout); }
}


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
  if(!SKY_ORIGIN_RE.test(url)) throw new Error('Only Sky Sports HTTPS URLs are permitted');
  const win=ensureSkyWindow();
  if(skyLoadPromise) await skyLoadPromise;
  let resolveLoad, rejectLoad;
  skyLoadPromise=new Promise((resolve,reject)=>{resolveLoad=resolve;rejectLoad=reject;});
  const timeout=setTimeout(()=>rejectLoad(new Error('Sky page load timed out')),35000);
  const done=()=>{clearTimeout(timeout);resolveLoad();};
  win.webContents.once('did-finish-load',done);
  try{
    await win.loadURL(url,{extraHeaders:'Accept-Language: en-GB,en;q=0.9\r\n'});
    const started=Date.now();
    while(Date.now()-started<20000){
      const ready=await win.webContents.executeJavaScript(`(() => {
        const t=(document.body?.innerText||'');
        return /Scores & Fixtures|Football Calendar|Teams|Starting Lineups/i.test(t) && t.length>500;
      })()`,true).catch(()=>false);
      if(ready) break;
      await wait(500);
    }
    await wait(750);
    const result=await win.webContents.executeJavaScript(`(() => ({
      html: document.documentElement.outerHTML,
      text: document.body ? document.body.innerText : '',
      title: document.title,
      url: location.href,
      links: [...document.querySelectorAll('a[href]')].map(a=>({href:a.href,text:(a.innerText||a.textContent||'').trim(),aria:a.getAttribute('aria-label')||''})).slice(0,2000)
    }))()`,true);
    if(!result?.html || result.html.length<500) throw new Error('Sky returned an empty page');
    return result;
  } finally {
    clearTimeout(timeout);
    skyLoadPromise=null;
  }
}

function teamSlug(name){
  return String(name||'').toLowerCase()
    .replace(/&/g,' and ').replace(/[’']/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function normTeam(name){
  return String(name||'').toLowerCase().replace(/[’']/g,'').replace(/\b(fc|afc|women|womens|ladies)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
async function resolveSkyFixture(fixture){
  const home=String(fixture?.home||'').trim(), away=String(fixture?.away||'').trim();
  if(!home||!away) throw new Error('Both teams are required');
  const candidates=[];
  if(fixture?.href && SKY_ORIGIN_RE.test(fixture.href)) candidates.push(fixture.href);
  candidates.push(`https://www.skysports.com/${teamSlug(home)}`);
  candidates.push(`https://www.skysports.com/${teamSlug(away)}`);
  const H=normTeam(home), A=normTeam(away);
  for(const url of [...new Set(candidates)]){
    try{
      const page=await loadSkyRendered(url);
      const found=await ensureSkyWindow().webContents.executeJavaScript(`(() => {
        const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/\\b(fc|afc|women|womens|ladies)\\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();
        const H=${JSON.stringify(H)}, A=${JSON.stringify(A)};
        const hasTeams=t=>{const n=norm(t);return H&&A&&n.includes(H)&&n.includes(A)};
        const els=[...document.querySelectorAll('a[href],article,li,div')].filter(e=>hasTeams(e.innerText||e.textContent||''));
        els.sort((a,b)=>(a.innerText||'').length-(b.innerText||'').length);
        for(const el of els.slice(0,80)){
          const text=(el.innerText||el.textContent||'').trim();
          const anchors=[...(el.matches?.('a[href]')?[el]:[]),...el.querySelectorAll?.('a[href]')||[]];
          const links=anchors.map(a=>a.href).filter(Boolean);
          const match=links.find(h=>/\\/football\\/[^/]+\\/(?:report\\/|teams\\/|stats\\/)?\\d+\\/?(?:$|[?#])/i.test(h));
          if(match || /\\b(?:\\d{1,2}[:.]\\d{2}\\s*(?:am|pm)|kick-off at)\\b/i.test(text)) return {text,href:match||'',links};
        }
        return null;
      })()`,true).catch(()=>null);
      if(found){
        let href=found.href||'';
        if(href && /\/(?:report|stats)\/(\d+)/i.test(href)) href=href.replace(/\/(?:report|stats)\//i,'/teams/');
        return {ok:true,href,text:found.text||'',sourceUrl:page.url||url};
      }
    }catch(e){}
  }
  return {ok:false,href:'',text:'',sourceUrl:''};
}

ipcMain.handle('fotmob-matches', async (_event, date) => fetchFotmobMatches(date));
ipcMain.handle('http-fetch', async (_event, url) => loadSkyRendered(url));
ipcMain.handle('sky-resolve-fixture', async (_event, fixture) => resolveSkyFixture(fixture));

app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback)=>callback(false));
  createWindow();
  app.on('activate', ()=>{if(BrowserWindow.getAllWindows().length===0) createWindow();});
});
app.on('window-all-closed', ()=>{if(process.platform!=='darwin') app.quit();});
