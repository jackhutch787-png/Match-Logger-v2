
const SKY_DAILY='https://www.skysports.com/football-scores-fixtures/';
const STORE='LLMatchLoggerSkyDesktopV2';
const COMPETITIONS=['Premier League','Championship','League One','League Two','WSL','EFL Trophy','Carabao Cup','UEFA Europa League','UEFA Europa Conference League'];
const COMP_ALIASES={
 'Premier League':'premier league',
 'Championship':'championship',
 'League One':'league one',
 'League Two':'league two',
 'WSL':"women's super league",
 'EFL Trophy':'efl trophy',
 'Carabao Cup':'carabao cup',
 'UEFA Europa League':'uefa europa league',
 'UEFA Europa Conference League':'uefa europa conference league'
};

const KEYWORDS=['GOAL','SHOT','CHANCE','CROSS','TACKLE','INTERCEPTION','CLEARANCE','RUN / SKILL','PASS','POST / BAR HIT','TEAM SHAPE','PRESSING','HOLD UP PLAY','FOUL','PENALTY INCIDENT','SAVE','AERIAL DUEL','WING PLAY','CLOSE UP','YELLOW CARD','RED CARD','SUBSTITUTION','BLOCK','PASSING FROM BACK'];
const TOPICS=['TEAM NEWS','INJURY','TRANSFER','CONTRACT','PERFORMANCE','TACTICS','REFEREE / VAR','PRAISE','CRITICISM','EMOTIONAL','CONTROVERSY','FUTURE / NEXT GAME','FANS','OWNERSHIP','INDIVIDUAL PLAYER','QUOTE OF THE DAY'];

let db=loadDB(), fixtures=[], current=null, activeEventId=null, currentTab='fixtures', interviewState=null, fixtureSourceState='';
function emptyDB(){return {logs:{},sheets:{},manual:[],interviews:{},settings:{},cameraPresets:{},fixtureCache:{}}}
function loadDB(){try{const x=JSON.parse(localStorage.getItem(STORE));return x?{...emptyDB(),...x,fixtureCache:x.fixtureCache||{}}:emptyDB()}catch(e){return emptyDB()}}
function saveDB(){localStorage.setItem(STORE,JSON.stringify(db));document.getElementById('saveStatus').textContent='Saved '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});}

function nowTc(){const d=new Date();const ff=Math.floor(d.getMilliseconds()/40);return [d.getHours(),d.getMinutes(),d.getSeconds(),ff].map(n=>String(n).padStart(2,'0')).join(':')}
function tick(){document.getElementById('globalTc').textContent=nowTc();document.getElementById('globalStatus').textContent=fixtureSourceState|| (fixtures.length?`${fixtures.length} fixtures`:'Sky Sports · ready');if(interviewState?.running){document.getElementById('intTod').textContent=nowTc();document.getElementById('intDur').textContent=fmtDur((Date.now()-interviewState.started)/1000)}}setInterval(tick,40);tick();
function fmtDur(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),1800)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date())}
function ukDateObj(s){return new Date(s+'T12:00:00')}
function localHref(h){if(!h)return'';if(h.startsWith('http'))return h;if(h.startsWith('//'))return 'https:'+h;return 'https://www.skysports.com'+(h.startsWith('/')?h:'/'+h)}

async function getTextDirect(url){
 if(window.llBridge?.fetchSky){const x=await window.llBridge.fetchSky(url);if(!x?.html||x.html.length<200)throw Error('Empty Sky page');return x.html}
 const r=await fetch(url,{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length<200)throw Error('Empty response');return t
}
async function fetchSkyPage(url){
 if(window.llBridge?.fetchSky){try{return {text:await getTextDirect(url),via:'native-rendered'}}catch(e){throw Error('Sky Sports could not be reached by the desktop app: '+e.message)}}
 throw Error('Sky Sports desktop connection unavailable');
}
function cleanText(x){return String(x||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date())}
function localHref(h){if(!h)return'';if(h.startsWith('http'))return h;if(h.startsWith('//'))return 'https:'+h;return 'https://www.skysports.com'+(h.startsWith('/')?h:'/'+h)}
function dateHeadingToISO(text,year){
 const m=cleanText(text).match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})(?:st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?$/i);
 if(!m)return null;const months={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};return `${m[3]||year}-${String(months[m[2].toLowerCase()]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`
}
function normalizeCompetition(text){
 const t=cleanText(text).toLowerCase().replace(/\s+/g,' ');
 if(t.includes('premier league') && !t.includes('women'))return 'Premier League';
 if(t.includes('championship') && !t.includes('scottish'))return 'Championship';
 if(t.includes('league one') && !t.includes('scottish'))return 'League One';
 if(t.includes('league two') && !t.includes('scottish'))return 'League Two';
 if(t.includes("women's super league") || t.includes('women’s super league'))return 'WSL';
 if(t.includes('efl trophy'))return 'EFL Trophy';
 if(t.includes('carabao cup') || t.includes('efl cup'))return 'Carabao Cup';
 if(t.includes('europa conference league') && !t.includes('women'))return 'UEFA Europa Conference League';
 if(t.includes('europa league') && !t.includes('conference') && !t.includes('women'))return 'UEFA Europa League';
 return null;
}
function normaliseKickoff(t){const x=cleanText(t||'');if(!x)return '';return x.replace(/^(\d{1,2})\.(\d{2})(am|pm)$/i,'$1:$2$3')}
function makeFixture(home,away,time,comp,date,href='',raw=''){
 home=cleanText(home).replace(/^.*?(?:app\.football\.scores_fixtures\.[a-z_]+\s+)+/i,'').trim();
 away=cleanText(away).replace(/\s+(?:Kick-off at.*)$/i,'').trim();
 if(!home||!away||home.length>70||away.length>70||home.toLowerCase()===away.toLowerCase())return null;
 const key=`${comp}|${home}|${away}|${time||''}`.toLowerCase();
 const normalizedHref=localHref(href||'');
 const matchId=extractSkyMatchId(normalizedHref);
 return {home,away,time:normaliseKickoff(time),comp,date,href:normalizedHref,matchId,status:/postponed/i.test(raw)?'Postponed':'',id:'sky_'+btoa(unescape(encodeURIComponent(key))).replace(/[^a-z0-9]/gi,'').slice(0,28)};
}
function fixtureFromRaw(raw,comp,date,href=''){
 raw=cleanText(raw); if(!raw)return null;
 raw=raw.replace(/app\.football\.scores_fixtures\.[a-z_]+/gi,' ').replace(/\s+/g,' ').trim();
 // Scheduled fixture: Team A vs Team B Kick-off at 3:00pm
 let m=raw.match(/^(.+?)\s+vs\s+(.+?)(?:\s+Kick-off at\s+([0-9:.]+(?:am|pm)))?\s*\.?$/i);
 if(m)return makeFixture(m[1],m[2],m[3]||'',comp,date,href,raw);
 // Postponed fixture: Team A P Team B P
 m=raw.match(/^(.+?)\s+P\s+(.+?)\s+P(?:\s+Postponed.*)?$/i);
 if(m)return makeFixture(m[1],m[2],'',comp,date,href,raw+' Postponed');
 // Completed/live fixture: Team A 2 Team B 1 FT/HT/AET or a live minute.
 // Use the first two standalone score numbers and strip the status suffix.
 m=raw.match(/^(.+?)\s+(\d+)\s+(.+?)\s+(\d+)\s+(?=(?:FT|HT|AET|\d+\s*\+\s*\d+\'|\d+\'|$))/i);
 if(m){
   const status=raw.slice(m[0].length).trim();
   return makeFixture(m[1],m[3],'',comp,date,href,raw+' '+status);
 }
 return null;
}
function fixtureFromAnchor(a,comp,date){
 const parent=a.closest('li,article,div') || a.parentElement || a;
 const parentText=cleanText(parent.innerText||parent.textContent||'');
 const href=a.getAttribute('href')||a.href||'';
 const dataId=a.getAttribute('data-fixture-id')||a.getAttribute('data-match-id')||a.getAttribute('data-id')||parent.getAttribute?.('data-fixture-id')||parent.getAttribute?.('data-match-id')||'';
 const candidates=[a.getAttribute('aria-label'),a.getAttribute('title'),a.textContent,parentText].filter(Boolean);
 for(const raw of candidates){
   const f=fixtureFromRaw(raw,comp,date,href);
   if(f){
     if(!f.matchId && dataId && /^\d+$/.test(dataId))f.matchId=dataId;
     return f;
   }
 }
 return null;
}
function parseSkyDailyPage(raw,date){
 const out=[],seen=new Set();
 const doc=new DOMParser().parseFromString(String(raw),'text/html');
 const add=(f)=>{if(!f)return;const key=`${f.comp}|${f.home}|${f.away}|${f.time}`.toLowerCase();if(seen.has(key))return;seen.add(key);out.push(f)};
 const bodyLines=String(doc.body?.innerText||'').split(/\n+/).map(cleanText).filter(Boolean);
 const supported=new Set(COMPETITIONS);
 const headingName=(line)=>normalizeCompetition(line);
 const isKnownUnsupportedHeading=(line)=>{
   const t=cleanText(line).toLowerCase();
   return /^(?:uefa nations league|national league(?: north| south)?|scottish .*|irish .*|northern irish .*|league of ireland .*|welsh .*|women's super league 2|international .*|friendly .*|premier sports cup|the fa trophy|fa trophy|scottish challenge cup|spanish .*|italian .*|german .*|french .*|dutch .*|belgian .*|portuguese .*|danish .*|norwegian .*|swedish .*|finnish .*|icelandic .*|austrian .*|swiss .*|greek .*|turkish .*|croatian .*|serbian .*|polish .*|czech .*|romanian .*|hungarian .*|slovak .*|slovenian .*|bulgarian .*|ukrainian .*|cypriot .*|israeli .*|estonian .*|latvian .*|lithuanian .*|albanian .*|bosnian .*|montenegrin .*|north macedonian .*|maltese .*|luxembourg .*|fa cup|champions league|conference league qualifying|europa conference qualifying)$/i.test(t);
 };
 const fixtureLines=[];
 let currentComp=null;
 for(const line of bodyLines){
   const c=headingName(line);
   if(c){currentComp=c;continue;}
   if(isKnownUnsupportedHeading(line)){currentComp=null;continue;}
   if(!currentComp)continue;
   const f=fixtureFromRaw(line,currentComp,date);
   if(f)fixtureLines.push(f);
 }
 // Recover the actual Sky match-centre URL from the rendered fixture anchors by matching teams.
 // This avoids guessing IDs and also preserves the link needed later to resolve the Teams tab.
 const anchors=[...doc.querySelectorAll('a[href]')].map(a=>({
   href:localHref(a.getAttribute('href')||a.href||''),
   text:cleanText(a.textContent||''),
   parent:cleanText(a.closest('li,article,div')?.innerText||'')
 })).filter(x=>x.href && /skysports\.com\/football\//i.test(x.href));
 const findHref=(f)=>{
   const same=(a,b)=>cleanText(a).toLowerCase().replace(/[^a-z0-9]+/g,'')===cleanText(b).toLowerCase().replace(/[^a-z0-9]+/g,'');
   const hit=anchors.find(a=>{
     const blob=(a.text+' '+a.parent).toLowerCase();
     return blob.includes(f.home.toLowerCase())&&blob.includes(f.away.toLowerCase())&&/\/football\/[^/]+\/\d+|\/football\/[^/]+$/i.test(a.href);
   });
   if(hit)return hit.href;
   const fuzzy=anchors.find(a=>same(a.text,f.home)||same(a.text,f.away));
   return fuzzy?.href||'';
 };
 fixtureLines.forEach(f=>{f.href=findHref(f);f.matchId=extractSkyMatchId(f.href);add(f)});
 // Anchor fallback only for supported sections where the accessible body text did not expose a fixture line.
 let currentAnchorComp=null;
 for(const a of [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,a[href]')]){
   const txt=cleanText(a.textContent||'');if(!txt)continue;
   const c=headingName(txt);
   if(c){currentAnchorComp=c;continue;}
   if(a.tagName?.match(/^H[1-6]$/i)){currentAnchorComp=null;continue;}
   if(currentAnchorComp&&a.tagName==='A'){
     const f=fixtureFromAnchor(a,currentAnchorComp,date);
     if(f && f.time) add(f);
   }
 }
 return out.filter(f=>supported.has(f.comp));
}

async function loadSkyFixtures(date){
 const cache=db.fixtureCache?.[date]||{};
 const url=SKY_DAILY+date;
 const result=await fetchSkyPage(url);
 const rows=parseSkyDailyPage(result.text,date);
 // Hard isolation: never return anything outside the nine explicitly supported competitions.
 const allowed=new Set(COMPETITIONS);const filtered=rows.filter(f=>allowed.has(f.comp));
 if(filtered.length){
   db.fixtureCache[date]={};for(const f of filtered){(db.fixtureCache[date][f.comp] ||= []).push(f)}saveDB();
   return {rows:filtered,errors:[],via:[`daily:${result.via}`],url};
 }
 const cached=Object.values(cache).flat().filter(f=>allowed.has(f.comp));
 return {rows:cached,errors:cached.length?['Sky returned no supported fixtures; cache used']:['No supported fixtures found on Sky for this date'],via:[`daily:${result.via}`],url};
}
async function refreshFixtures(){
 const date=document.getElementById('dateInput').value||today();
 document.getElementById('globalStatus').textContent='Loading supported Sky Sports competitions…';
 document.getElementById('fixtureList').innerHTML='<div class="card" style="padding:15px;color:#82919e">Loading only the 9 supported competitions…</div>';
 try{
  const result=await loadSkyFixtures(date);fixtures=result.rows;
  fixtureSourceState=result.errors.length?`Sky Sports · ${fixtures.length} fixtures · ${result.errors.length} cached/unavailable`: `Sky Sports · ${fixtures.length} fixtures`;
  document.getElementById('fixtureCount').textContent=`${fixtures.length} supported fixtures for ${date}`;
  populateCompFilters();renderFixtures();populateLoggerComp();
  toast(result.errors.length?`Loaded ${fixtures.length}; some competitions used cache.`:`Loaded ${fixtures.length} supported fixtures`);
 }catch(e){
  const cached=Object.values(db.fixtureCache?.[date]||{}).flat();
  fixtures=cached.length?cached:db.manual.filter(x=>x.date===date);
  fixtureSourceState=cached.length?'Sky Sports unavailable · showing last successful fixtures':'Sky Sports unavailable · no cached fixtures';
  document.getElementById('fixtureCount').textContent=cached.length?`${cached.length} cached supported fixtures for ${date}`:`No fixtures available for ${date}`;
  populateCompFilters();renderFixtures();populateLoggerComp();
  toast(cached.length?'Sky connection failed — keeping the last successful fixture list.':'Sky Sports could not be reached.');
 }
}
function populateCompFilters(){const s=document.getElementById('compFilter');const cur=s.value;s.innerHTML='<option value="ALL">All supported competitions</option>'+COMPETITIONS.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(COMPETITIONS.includes(cur))s.value=cur}
function populateLoggerComp(){const s=document.getElementById('loggerComp');s.innerHTML=COMPETITIONS.map(c=>`<option>${esc(c)}</option>`).join('');if(current)s.value=current.comp}
function renderFixtures(){
 const comp=document.getElementById('compFilter').value, q=document.getElementById('teamSearch').value.trim().toLowerCase();
 const fs=fixtures.filter(f=>(comp==='ALL'||f.comp===comp)&&(!q||`${f.home} ${f.away}`.toLowerCase().includes(q)));
 const groups={};fs.forEach(f=>(groups[f.date||document.getElementById('dateInput').value]??=[]).push(f));
 const box=document.getElementById('fixtureList'); if(!fs.length){box.innerHTML='<div class="card" style="padding:15px;color:#7f8e9b">No fixtures found for this date/filter.</div>';return}
 box.innerHTML=Object.entries(groups).map(([date,list])=>`<div><div class="day-label">${ukDateObj(date).toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>${list.map(f=>`<button class="fixture" data-fixture="${esc(f.id)}"><div><div class="ftime">${esc(f.time||'TBC')}</div><div class="fdate">${esc(date)}</div></div><div><span class="bar"></span><span class="comp">${esc(shortComp(f.comp))}</span></div><div class="teams">${esc(f.home)} <span>v</span> ${esc(f.away)}</div></button>`).join('')}</div>`).join('')
}
function shortComp(c){return c==='Premier League'?'PL':c==='Championship'?'CH':c==='League One'?'L1':c==='League Two'?'L2':c==='WSL'?'WSL':c==='EFL Trophy'?'ET':c==='Carabao Cup'?'CC':c==='UEFA Europa League'?'UEL':c==='UEFA Europa Conference League'?'UECL':c}

function openFixture(f){
 current=f;db.logs[f.id]=db.logs[f.id]||[];
 const existing=getSheet(f);
 const existingTeamsMatch=existing.sourceHome&&existing.sourceAway&&
   cleanText(existing.sourceHome).toLowerCase()===cleanText(f.home).toLowerCase()&&
   cleanText(existing.sourceAway).toLowerCase()===cleanText(f.away).toLowerCase();
 if(!existingTeamsMatch||!Array.isArray(existing.home)||existing.home.length!==11||!Array.isArray(existing.away)||existing.away.length!==11){
   delete db.sheets[f.id];
 }
 saveDB();showView('logger');
 document.getElementById('loggerComp').value=f.comp;document.getElementById('loggerMatch').textContent=`${f.home} vs ${f.away}`;
 document.getElementById('loggerDate').textContent=f.date?new Date(f.date+'T12:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
 document.getElementById('loggerKick').textContent=f.time||'TBC';
 document.getElementById('homeTeam').textContent=(f.home||'HOME').toUpperCase();document.getElementById('awayTeam').textContent=(f.away||'AWAY').toUpperCase();
 document.getElementById('loggerBanner').textContent=db.sheets[f.id]?'Team sheets loaded — continuing this match.':'Select a player to start logging.';
 renderLineups();renderEvents();
}
function showView(name){
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(name+'View').classList.add('active');
 document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
 if(name==='reports')renderReports();if(name==='interviews')renderInterviewHome();
}
function getSheet(f){return db.sheets[f.id]||{home:[],away:[],homeSubs:[],awaySubs:[]}}
function parseSheet(text){return String(text||'').split(/\n+/).map((x,i)=>{x=x.trim();if(!x)return null;let m=x.match(/^(\d+)\s+(.+)$/);return m?{num:m[1],name:m[2]}:{num:'',name:x}}).filter(Boolean)}
function sheetText(a){return (a||[]).map(p=>(p.num?p.num+' ':'')+p.name).join('\n')}
function renderLineups(){
 const box=document.getElementById('lineups');if(!current){box.innerHTML='<div style="padding:12px;color:#7d8b98;font-size:9px">No match selected.</div>';return}
 const s=getSheet(current);const q=document.getElementById('playerSearch').value.toLowerCase();
 const block=(side,team,players,subs)=>`<div style="font-size:7px;color:#71818f;padding:5px 7px;text-transform:uppercase;font-weight:850">${esc(team)}</div>${players.filter(p=>!q||p.name.toLowerCase().includes(q)).map(p=>playerBtn(side,p,team)).join('')}<div class="subs-label">SUBS</div>${subs.filter(p=>!q||p.name.toLowerCase().includes(q)).map(p=>playerBtn(side,p,team,true)).join('')}`;
 box.innerHTML=block('home',current.home,s.home||[],s.homeSubs||[])+block('away',current.away,s.away||[],s.awaySubs||[]);
}
function playerBtn(side,p,team,sub=false){const id=esc(side+'|'+p.num+'|'+p.name);return `<button class="player" data-player="${id}" data-name="${esc(p.name)}" data-team="${esc(team)}"><span class="num">${esc(p.num)}</span><span class="pname">${esc(p.name)}</span></button>`}

function extractSkyMatchId(href){
 const u=localHref(href); if(!u)return '';
 try{
   const x=new URL(u);
   const m=x.pathname.match(/\/(?:teams|score|live|video|stats|report)\/(\d+)\/?$/i);
   if(m)return m[1];
   const direct=x.pathname.match(/^(?:\/football\/[^/]+)\/(\d+)\/?$/i);
   return direct?direct[1]:'';
 }catch(e){
   const m=String(href).match(/\/(?:teams|score|live|video|stats|report)\/(\d+)(?:\/|$)/i);
   return m?m[1]:'';
 }
}
async function resolveSkyTeamsUrl(f){
 const href=localHref(f?.href||'');
 if(!href)return '';
 if(/\/teams\/\d+\/?(?:$|[?#])/i.test(href))return href;
 if(window.llBridge?.resolveTeams){
   try{const exact=await window.llBridge.resolveTeams(href);if(exact && /\/teams\/\d+\/?(?:$|[?#])/i.test(exact))return exact}catch(e){}
 }
 return '';
}

async function getLineups(){
 if(!current?.href){toast('This fixture has no Sky Sports match link yet.');return}
 document.getElementById('getLineupsBtn').textContent='Loading…';document.getElementById('getLineupsBtn').disabled=true;
 try{
   const teamsUrl=await resolveSkyTeamsUrl(current);
   if(!teamsUrl)throw Error('Sky Teams link could not be found on the match centre');
   const raw=(await fetchSkyPage(teamsUrl)).text;
   const parsed=parseLineupText(raw,current);
   if(parsed.home.length!==11 || parsed.away.length!==11)throw Error(`Incomplete line-up: ${parsed.home.length}/${parsed.away.length}`);
   db.sheets[current.id]={...getSheet(current),...parsed,sourceHome:current.home,sourceAway:current.away,sourceUrl:teamsUrl};saveDB();renderLineups();document.getElementById('loggerBanner').textContent='Team sheets loaded — Sky Sports line-ups imported.';toast('Sky Sports line-ups loaded');
 }catch(e){
   const detail=String(e?.message||e||'Unknown error');
   document.getElementById('loggerBanner').textContent=`Sky Sports line-ups could not be read (${detail}). Use Team Sheets for a manual fallback.`;
   toast('Line-ups unavailable — use Team Sheets');
 }
 finally{document.getElementById('getLineupsBtn').textContent='⟳ Get Line-ups';document.getElementById('getLineupsBtn').disabled=false}
}

function parseLineupText(raw,f){
 // Sky's Teams page has a predictable structure after the "Teams" heading:
 // Image: <team>, <short team name>, then NUMBER/PLAYER pairs, followed by
 // "Substitutes", then the second team's Image marker and the same structure.
 // We deliberately ignore everything before "Teams" so navigation/league tables
 // cannot be mistaken for players.
 let text=raw;
 try{const j=JSON.parse(raw);text=j.text||j.content||j.data?.content||raw}catch(e){}
 if(/<html[\s>]/i.test(String(text))){
   try{
     const doc=new DOMParser().parseFromString(String(text),'text/html');
     doc.querySelectorAll('img[alt]').forEach(img=>{
       const alt=(img.getAttribute('alt')||'').trim();
       if(alt){const marker=doc.createTextNode('\nImage: '+alt+'\n');img.replaceWith(marker)}
     });
     text=doc.body?.innerText||doc.body?.textContent||text;
   }catch(e){}
 }
 text=String(text).replace(/\\n/g,'\n');
 const lines=text.split(/\n+/).map(x=>x.replace(/[*•]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);

 const cleanTeam=s=>String(s||'').toLowerCase()
   .replace(/[’']/g,'')
   .replace(/\b(fc|afc|women|womens|ladies)\b/g,' ')
   .replace(/[^a-z0-9]+/g,' ')
   .trim();
 const teamTokens=s=>cleanTeam(s).split(' ').filter(Boolean);
 const teamMatches=(candidate,team)=>{
   const a=cleanTeam(candidate), b=cleanTeam(team);
   if(!a||!b)return false;
   if(a===b||a.includes(b)||b.includes(a))return true;
   const at=teamTokens(a),bt=teamTokens(b);
   return at.length>0&&bt.length>0&&(at.every(x=>bt.includes(x))||bt.every(x=>at.includes(x)));
 };
 const isImageTeam=l=>/^image\s*:/i.test(l);
 const imageTeamName=l=>String(l).replace(/^image\s*:\s*/i,'').trim();
 const isNumber=l=>/^\d{1,3}$/.test(l);
 const isEventLine=l=>/^\d{1,3}(?:\+\d+)?'\d{1,3}(?:st|nd|rd|th)\s+minute(?:\s|$)/i.test(l)||/^\d{1,3}(?:st|nd|rd|th)?\s+minute(?:\s|$)/i.test(l)||/^\d{1,3}(?:\+\d+)?(?:st|nd|rd|th)?\s*'\s*minute(?:\s|$)/i.test(l);
 const stopLine=l=>/^(match officials|key|match stats|latest .* odds|summary|live reporting)$/i.test(l);
 const badPlayer=l=>/^(teams|substitutes|manager|formation|match officials|key|home|away|line-ups|lineups)$/i.test(l)||/^manager\s*:/i.test(l)||/^formation\s*:/i.test(l);

 // Only inspect the actual Teams section. This prevents the page's navigation,
 // league tables and other team names from ever entering the lineup arrays.
 let teamsStart=lines.findIndex(l=>/^teams$/i.test(l));
 if(teamsStart<0) return {home:[],away:[],homeSubs:[],awaySubs:[]};

 const sections=[];
 let currentSection=null;
 for(let i=teamsStart+1;i<lines.length;i++){
   const l=lines[i];
   if(stopLine(l)) break;
   if(isImageTeam(l)){
     const label=imageTeamName(l);
     const matchesHome=teamMatches(label,f.home);
     const matchesAway=teamMatches(label,f.away);
     if(matchesHome||matchesAway){
       currentSection={side:matchesHome?'home':'away',label,starters:[],subs:[],mode:'starters'};
       sections.push(currentSection);
       continue;
     }
   }
   if(!currentSection) continue;
   if(/^substitutes$/i.test(l)){currentSection.mode='subs';continue;}
   if(isImageTeam(l)){
     // An unrelated image/team marker: do not let it bleed into the current team.
     continue;
   }
   if(badPlayer(l)||/^image\s*:/i.test(l)) continue;

   // Sky renders each player as two adjacent text lines: shirt number then name.
   if(isNumber(l)){
     let j=i+1;
     while(j<lines.length && isEventLine(lines[j])) j++;
     const name=lines[j];
     if(name && !isNumber(name) && !badPlayer(name) && name.length<=60 && !/^image\s*:/i.test(name)){
       const player={num:l,name:name.replace(/\s+\(c\)$/i,'').trim()};
       currentSection[currentSection.mode==='subs'?'subs':'starters'].push(player);
       i=j;
     }
   }
 }

 const homeSection=sections.find(s=>s.side==='home');
 const awaySection=sections.find(s=>s.side==='away');
 return {
   home:(homeSection?.starters||[]).slice(0,11),
   away:(awaySection?.starters||[]).slice(0,11),
   homeSubs:homeSection?.subs||[],
   awaySubs:awaySection?.subs||[]
 };
}

function camerasForLog(){const x=selectedLog();return x?(x.cameras||[]):[]}
function cameraPresets(){if(!current)return [];db.cameraPresets=db.cameraPresets||{};db.cameraPresets[current.id]=db.cameraPresets[current.id]||[];return db.cameraPresets[current.id]}
function renderCameras(){const box=document.getElementById('cameraButtons');if(!box)return;const cams=camerasForLog();const custom=cameraPresets();const all=[...Array.from({length:20},(_,i)=>String(i+1)),...custom];box.innerHTML=all.map(n=>`<button class="cam ${cams.includes(n)?'active':''}" data-cam="${esc(n)}">${esc(n)}</button>`).join('')}
function toggleCamera(c){const x=selectedLog();if(!x)return;const a=[...(x.cameras||[])];const i=a.indexOf(c);if(i>=0)a.splice(i,1);else a.push(c);updateActive({cameras:a})}
function addCustomCamera(){const v=document.getElementById('customCamera').value.trim();if(!v||!current||!selectedLog())return;const p=cameraPresets();if(!p.includes(v)){p.push(v);saveDB()}toggleCamera(v);document.getElementById('customCamera').value=''}
function saveLogMeta(){if(!selectedLog())return;updateActive({evs:document.getElementById('evsInput').value.trim()});toast('Log metadata saved')}
function keywordsRender(){document.getElementById('keywords').innerHTML=KEYWORDS.map(k=>`<button class="keyword ${k==='RED CARD'?'red':k==='YELLOW CARD'?'yellow':''}" data-key="${esc(k)}">${esc(k)}</button>`).join('')}
keywordsRender();
function logs(){return current?(db.logs[current.id]||[]):[]}
function selectedLog(){return logs().find(x=>x.id===activeEventId)||logs().slice(-1)[0]}
function createPlayerEvent(name,team,num){
 if(!current)return;const e={id:'e'+Date.now()+Math.random().toString(36).slice(2,7),clip:'',time:nowTc(),player:num?`${num}. ${name}`:name,team,event:'',rating:'',note:'',cameras:[],evs:''};
 db.logs[current.id]=[...logs(),e];activeEventId=e.id;saveDB();renderEvents();document.querySelectorAll('.player').forEach(b=>b.classList.toggle('selected',b.dataset.name===name));toast(`${name} · ${e.time}`);
}
function updateActive(patch){const arr=logs();const idx=arr.findIndex(x=>x.id===activeEventId);if(idx<0)return;arr[idx]={...arr[idx],...patch};db.logs[current.id]=arr;saveDB();renderEvents()}
function renderEvents(){
 const q=document.getElementById('eventSearch').value.toLowerCase();let arr=logs().filter(x=>JSON.stringify(x).toLowerCase().includes(q));
 const body=document.getElementById('eventBody');body.innerHTML=arr.map(x=>`<tr class="${x.id===activeEventId?'active':''}" data-row="${x.id}">
 <td><input value="${esc(x.clip)}" data-field="clip"></td><td>${esc(x.time)}</td><td>${esc(x.player)}</td><td>${esc(x.team)}</td><td><b>${esc(x.event||'—')}</b></td><td>${(x.cameras||[]).map(c=>`<span style="display:inline-block;border:1px solid #2d5b83;border-radius:4px;padding:2px 4px;margin:1px;font-size:7px">${esc(c)}</span>`).join('')||'—'}</td><td><input value="${esc(x.evs||'')}" placeholder="EVS" data-field="evs"></td><td>${x.rating?'★'.repeat(+x.rating):'—'}</td><td><input value="${esc(x.note)}" placeholder="Type a note..." data-field="note"></td><td><button class="xbtn" data-delete="${x.id}">×</button></td></tr>`).join('');
 if(!arr.length)body.innerHTML='<tr><td colspan="10" style="text-align:center;color:#6f7e8b;padding:30px">No events logged yet. Click a player to start.</td></tr>';
 document.getElementById('eventCount').textContent=logs().length;renderCameras();const sl=selectedLog();document.getElementById('evsInput').value=sl?.evs||'';document.getElementById('homeCount').textContent=`${current?.home||'Home'} ${logs().filter(x=>x.team===current?.home).length}`;document.getElementById('awayCount').textContent=`${current?.away||'Away'} ${logs().filter(x=>x.team===current?.away).length}`;
}
function rate(n){if(!selectedLog())return;updateActive({rating:String(n)})}
function deleteEvent(id){db.logs[current.id]=logs().filter(x=>x.id!==id);if(activeEventId===id)activeEventId=null;saveDB();renderEvents()}
function clearLog(){if(!current||!confirm('Clear every log for this match?'))return;db.logs[current.id]=[];activeEventId=null;saveDB();renderEvents();toast('Log cleared')}

function exportCSV(){if(!current)return;const rows=[['Clip number','Time code','Player','Team','Event','Cameras','EVS','Rating','Notes'],...logs().map(x=>[x.clip,x.time,x.player,x.team,x.event,(x.cameras||[]).join(' '),x.evs||'',x.rating,x.note])];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${current.home} v ${current.away} - log.csv`;a.click()}

function renderReports(){
 const all=Object.entries(db.logs).flatMap(([id,arr])=>arr.map(x=>({...x,matchId:id})));let arr=all;
 const search=document.getElementById('reportGlobalSearch').value.toLowerCase();if(search)arr=arr.filter(x=>JSON.stringify(x).toLowerCase().includes(search));
 const p=document.getElementById('rPlayer').value,t=document.getElementById('rTeam').value,e=document.getElementById('rEvent').value,r=document.getElementById('rRating').value;
 if(p!=='Any player')arr=arr.filter(x=>x.player===p);if(t!=='Any team')arr=arr.filter(x=>x.team===t);if(e!=='Any event')arr=arr.filter(x=>x.event===e);if(r!=='Any')arr=arr.filter(x=>x.rating===r);
 const matches=Object.keys(db.logs).length,players=new Set(arr.map(x=>x.player)).size,three=arr.filter(x=>x.rating==='3').length;
 const counts={};arr.forEach(x=>counts[x.event||'—']=(counts[x.event||'—']||0)+1);const common=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
 document.getElementById('reportSummary').innerHTML=`<div class="stat"><div class="n">${arr.length}</div><div class="l">Events</div></div><div class="stat"><div class="n">${players}</div><div class="l">Players</div></div><div class="stat"><div class="n" style="color:#f3c844">${three}</div><div class="l">Three star</div></div><div class="stat"><div class="n">—</div><div class="l">Avg rating</div></div><div class="stat"><div class="n" style="font-size:15px;color:#fff">${esc(common)}</div><div class="l">Most common</div></div>`;
 const body=document.getElementById('reportBody');body.innerHTML=arr.map(x=>`<tr><td>${esc(x.clip||'—')}</td><td>${esc(x.time)}</td><td>${esc(x.player)}</td><td>${esc(x.team)}</td><td>${esc(x.event||'—')}</td><td>${x.rating?'★'.repeat(+x.rating):'—'}</td><td>${esc(x.note||'—')}</td></tr>`).join('')||'<tr><td colspan="7" style="padding:25px;color:#71808d">No matching logs.</td></tr>';
 const playersList=[...new Set(all.map(x=>x.player))].sort(),teams=[...new Set(all.map(x=>x.team))].sort(),events=[...new Set(all.map(x=>x.event).filter(Boolean))].sort();
 fillSelect('rPlayer','Any player',playersList,p);fillSelect('rTeam','Any team',teams,t);fillSelect('rEvent','Any event',events,e);
 document.getElementById('reportMatchSub').textContent=current?`${current.home} v ${current.away} · ${current.comp} · ${current.date}`:`${matches} saved matches`;
}
function fillSelect(id,first,arr,keep){const s=document.getElementById(id),old=keep||s.value;s.innerHTML=`<option>${first}</option>`+arr.map(x=>`<option>${esc(x)}</option>`).join('');if(arr.includes(old))s.value=old}

function openTeamModal(){if(!current)return;const s=getSheet(current);document.getElementById('homeSheet').value=sheetText(s.home);document.getElementById('awaySheet').value=sheetText(s.away);document.getElementById('homeSubs').value=sheetText(s.homeSubs);document.getElementById('awaySubs').value=sheetText(s.awaySubs);document.getElementById('teamModal').classList.add('open')}
function saveSheets(){if(!current)return;db.sheets[current.id]={home:parseSheet(document.getElementById('homeSheet').value),away:parseSheet(document.getElementById('awaySheet').value),homeSubs:parseSheet(document.getElementById('homeSubs').value),awaySubs:parseSheet(document.getElementById('awaySubs').value)};saveDB();renderLineups();document.getElementById('loggerBanner').textContent='Team sheets loaded — manual sheets saved for this match.';document.getElementById('teamModal').classList.remove('open');toast('Team sheets saved')}

function manualMatch(){document.getElementById('mDate').value=today();document.getElementById('manualModal').classList.add('open')}
function createManual(){const f={id:'manual_'+Date.now(),comp:document.getElementById('mComp').value.trim()||'Premier League',date:document.getElementById('mDate').value||today(),home:document.getElementById('mHome').value.trim(),away:document.getElementById('mAway').value.trim(),time:document.getElementById('mKick').value.trim()||'TBC',href:document.getElementById('mHref').value.trim()};if(!f.home||!f.away){toast('Enter both teams');return}db.manual.push(f);saveDB();document.getElementById('manualModal').classList.remove('open');fixtures.push(f);openFixture(f)}

function renderInterviewHome(){document.getElementById('intMatch').textContent=current?`${current.home} v ${current.away}`:'Select a match in Logger first';renderInterviewList();renderIntLog()}
function addInterview(){document.getElementById('intComp').innerHTML=COMPETITIONS.map(c=>`<option>${esc(c)}</option>`).join('');document.getElementById('intMatchSelect').innerHTML=fixtures.map(f=>`<option value="${esc(f.id)}">${esc(f.time)} ${esc(f.home)} v ${esc(f.away)}</option>`).join('');document.getElementById('interviewModal').classList.add('open')}
function interviewKey(){return current?current.id:'none'}
function intArr(){const k=interviewKey();db.interviews[k]=db.interviews[k]||[];return db.interviews[k]}
function renderInterviewList(){const arr=intArr();document.getElementById('intList').innerHTML=arr.map((x,i)=>`<div class="interview-item ${i===0?'active':''}"><b>${esc(x.speaker)}</b><div style="color:#71808e;margin-top:3px">${x.entries?.length||0} entries · ${fmtDur(x.duration||0)}</div></div>`).join('')||'<div style="padding:15px;color:#71808e;font-size:9px">No interviews yet.</div>'}
function createInterview(){const f=fixtures.find(x=>x.id===document.getElementById('intMatchSelect').value)||current;if(f)current=f;const speaker=document.getElementById('intSpeakerInput').value.trim()||'Unknown';const k=interviewKey();db.interviews[k]=[{speaker,entries:[],duration:0,topics:[],running:false},...intArr()];saveDB();document.getElementById('interviewModal').classList.remove('open');renderInterviewList();renderIntLog();startInterview()}
function startInterview(){const arr=intArr();if(!arr.length){toast('Add an interview first');return}interviewState={running:true,started:Date.now(),lastMark:Date.now(),index:0};arr[0].running=true;document.getElementById('intSpeaker').textContent=arr[0].speaker;saveDB();renderIntLog()}
function markInterview(){if(!interviewState)return;const arr=intArr(),iv=arr[0],now=Date.now();iv.entries.push({tod:nowTc(),dur:Math.floor((now-interviewState.lastMark)/1000),speaker:iv.speaker,topic:'',rating:'',quote:''});interviewState.lastMark=now;saveDB();renderIntLog()}
function endInterview(){if(!interviewState)return;const arr=intArr();if(arr[0]){arr[0].duration=Math.floor((Date.now()-interviewState.started)/1000);arr[0].running=false}interviewState=null;saveDB();renderIntLog()}
function renderIntLog(){const arr=intArr(),iv=arr[0];if(iv){document.getElementById('intSpeaker').textContent=iv.speaker;document.getElementById('intCount').textContent=iv.entries.length;document.getElementById('intFooterDur').textContent=fmtDur(iv.duration||0)}document.getElementById('intBody').innerHTML=(iv?.entries||[]).map((x,i)=>`<tr><td><input placeholder="—"></td><td>${esc(x.tod)}</td><td>${fmtDur(x.dur||0)}</td><td>${esc(x.speaker)}</td><td>${esc(x.topic||'—')}</td><td>${x.rating?'★'.repeat(+x.rating):'—'}</td><td><input value="${esc(x.quote||'')}" placeholder="Type what was said..." data-intquote="${i}"></td><td><button class="xbtn" data-intdel="${i}">×</button></td></tr>`).join('')||'<tr><td colspan="8" style="padding:30px;text-align:center;color:#71808d">No interview entries yet.</td></tr>'}
document.getElementById('topics').innerHTML=TOPICS.map(x=>`<button class="topic" data-topic="${esc(x)}">▢ ${esc(x)}</button>`).join('');

document.addEventListener('click',e=>{
 const nav=e.target.closest('.nav button');if(nav){showView(nav.dataset.view);return}
 const f=e.target.closest('[data-fixture]');if(f){const x=fixtures.find(z=>z.id===f.dataset.fixture);if(x)openFixture(x);return}
 const p=e.target.closest('[data-player]');if(p){createPlayerEvent(p.dataset.name,p.dataset.team,(p.dataset.player.split('|')[1]||''));return}
 const cam=e.target.closest('[data-cam]');if(cam){toggleCamera(cam.dataset.cam);return}
 const k=e.target.closest('[data-key]');if(k){if(!selectedLog())return;updateActive({event:k.dataset.key});document.querySelectorAll('.keyword').forEach(b=>b.classList.toggle('active',b===k));return}
 const r=e.target.closest('[data-rate]');if(r){rate(+r.dataset.rate);return}
 const d=e.target.closest('[data-delete]');if(d){deleteEvent(d.dataset.delete);return}
 const t=e.target.closest('[data-topic]');if(t){t.classList.toggle('active');const iv=intArr()[0];if(iv){iv.topics=iv.topics||[];if(iv.topics.includes(t.dataset.topic))iv.topics=iv.topics.filter(x=>x!==t.dataset.topic);else iv.topics.push(t.dataset.topic);saveDB()}return}
 const id=e.target.closest('[data-intdel]');if(id){const iv=intArr()[0];iv.entries.splice(+id.dataset.intdel,1);saveDB();renderIntLog();return}
 const tab=e.target.closest('[data-matchtab]');if(tab){currentTab=tab.dataset.matchtab;document.querySelectorAll('[data-matchtab]').forEach(b=>b.classList.toggle('active',b===tab));document.getElementById('fixturesTab').style.display=currentTab==='fixtures'?'block':'none';document.getElementById('savedTab').style.display=currentTab==='saved'?'block':'none';if(currentTab==='saved')renderSaved();return}
 if(e.target.closest('.close'))e.target.closest('.modal').classList.remove('open');
});
document.addEventListener('input',e=>{
 if(e.target.id==='teamSearch'||e.target.id==='compFilter')renderFixtures();
 if(e.target.id==='playerSearch')renderLineups();
 if(e.target.id==='eventSearch')renderEvents();
 if(e.target.dataset.field){const id=e.target.closest('tr')?.dataset.row;if(id)updateActive({[e.target.dataset.field]:e.target.value})}
 if(e.target.id==='reportGlobalSearch'||['rPlayer','rTeam','rEvent','rRating'].includes(e.target.id))renderReports();
 if(e.target.dataset.intquote){const iv=intArr()[0];if(iv?.entries[+e.target.dataset.intquote]){iv.entries[+e.target.dataset.intquote].quote=e.target.value;saveDB()}}
});
document.addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key)&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA')rate(+e.key);if(e.code==='Space'&&document.getElementById('interviewsView').classList.contains('active')){e.preventDefault();markInterview()}});

function renderSaved(){const arr=Object.entries(db.logs).map(([id,a])=>{const f=fixtures.find(x=>x.id===id)||db.manual.find(x=>x.id===id);return {f,a}}).filter(x=>x.a.length);document.getElementById('savedTab').innerHTML=arr.map(x=>`<button class="fixture" data-fixture="${esc(x.f?.id||'')}"><div><b>${x.a.length}</b><div class="fdate">logs</div></div><div>${esc(x.f?.comp||'')}</div><div class="teams">${esc(x.f?.home||'Unknown')} <span>v</span> ${esc(x.f?.away||'Unknown')}</div></button>`).join('')||'<div class="card" style="padding:15px;color:#71808d">No saved logs yet.</div>'}

document.getElementById('dateInput').value=today();
document.getElementById('dateInput').addEventListener('change',refreshFixtures);
document.getElementById('todayBtn').onclick=()=>{document.getElementById('dateInput').value=today();refreshFixtures()};
document.getElementById('refreshBtn').onclick=()=>refreshFixtures();
document.getElementById('manualBtn').onclick=manualMatch;document.getElementById('newMatchBtn').onclick=manualMatch;
document.getElementById('getLineupsBtn').onclick=getLineups;document.getElementById('teamSheetsBtn').onclick=openTeamModal;document.getElementById('editTeamsBtn').onclick=openTeamModal;document.getElementById('saveSheets').onclick=saveSheets;
document.getElementById('clearLogBtn').onclick=clearLog;document.getElementById('exportBtn').onclick=exportCSV;document.getElementById('addCamera').onclick=addCustomCamera;document.getElementById('saveLogMeta').onclick=saveLogMeta;
document.getElementById('createManual').onclick=createManual;
document.getElementById('testSky').onclick=async()=>{document.getElementById('testResult').textContent='Testing supported Sky Sports feeds…';try{const x=await loadSkyFixtures(today());document.getElementById('testResult').textContent=`Supported Sky feeds OK — ${x.rows.length} fixtures found.`}catch(e){document.getElementById('testResult').textContent='Sky Sports feeds could not be reached from this browser/network; cached fixtures remain available.'}};
document.getElementById('wipeData').onclick=()=>{if(confirm('Delete all saved logger data from this browser?')){localStorage.removeItem(STORE);location.reload()}};
document.getElementById('addInterview').onclick=addInterview;document.getElementById('createInterview').onclick=createInterview;document.getElementById('startInterview').onclick=startInterview;document.getElementById('markInterview').onclick=markInterview;document.getElementById('endInterview').onclick=endInterview;document.getElementById('intBack').onclick=()=>showView('matches');document.getElementById('clearInt').onclick=()=>{if(confirm('Clear interview log?')){db.interviews[interviewKey()]=[];saveDB();renderIntLog()}};
document.getElementById('darkSwitch').onclick=e=>e.currentTarget.classList.toggle('on');
document.querySelectorAll('.close').forEach(x=>x.addEventListener('click',()=>x.closest('.modal').classList.remove('open')));
refreshFixtures();renderReports();renderInterviewHome();
