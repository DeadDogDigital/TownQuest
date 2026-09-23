import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const HEXHAM = [54.9694, -2.1033];
const locations = [
  {id:'gaol',name:'Hexham Old Gaol',lat:54.97130,lng:-2.10010,icon:'⛓️',kind:'investigate',spirit:7,
   title:'THE PRISONER',prompt:'Something is wrong at the Old Gaol.',text:'Search the area. Something is not where it should be.',
   zones:[
     {id:'chain',lat:54.97130,lng:-2.10010,title:'A broken chain',clue:'The metal is cold. Far too cold. Whatever was wearing this did not leave willingly.',setup:'Physical prop: short broken chain or convincing replica.'},
     {id:'scratches',lat:54.97136,lng:-2.10000,title:'Deep scratches in the stone',clue:'Three parallel marks. Something dragged itself towards the doorway.',setup:'Physical prop: scratch/mark effect or discreet clue marker.'},
     {id:'cold',lat:54.97124,lng:-2.09999,title:'A patch of impossible cold',clue:'The temperature drops. The marks stop where there is nowhere left to go.',setup:'Physical prop: hidden QR/NFC marker or staff-triggered effect.'}
   ]},
  {id:'forum',name:'Forum Cinema',lat:54.97188,lng:-2.10130,icon:'🎬',kind:'puzzle',spirit:8,
   title:'THE MEMORY',prompt:'🎬 THE FILM HAS STARTED',text:'But nobody bought a ticket.',
   traces:['A figure entering the cinema','The doors closing','An empty seat']},
  {id:'hall',name:"Queen's Hall",lat:54.97060,lng:-2.10260,icon:'🎭',kind:'multiplayer',spirit:9,
   title:'THE AUDIENCE',prompt:'The building remembers everyone who has ever gathered here.',text:'Listen.',
   traces:['Faint applause','A voice behind you','An empty entrance']},
];

let mapInstance=null, spiritMarker=null, meMarker=null, locationWatchId=null, spiritTimer=null, worldObjectLayers=[];
let state=JSON.parse(localStorage.getItem('townquest-v3')||'null')||{
  tab:'home',player:'',playerId:null,started:false,position:null,chapter:'HALLOWEEN',
  spirit:37,found:[],progress:{gaol:0,forum:false,hall:false},marley:false,notificationOptIn:false,connected:false
};

const app=document.getElementById('app');
const save=()=>{localStorage.setItem('townquest-v3',JSON.stringify(state));updateHeader()};
const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.style.display='none',3500)};
const updateHeader=()=>{const p=document.getElementById('spiritPct'),f=document.getElementById('spiritFill');if(p)p.textContent=state.spirit+'%';if(f)f.style.width=state.spirit+'%'};
const setTab=t=>{state.tab=t;save();render();};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

function distance(a,b){
  const R=6371000, p=Math.PI/180, dLat=(b[0]-a[0])*p,dLon=(b[1]-a[1])*p;
  const x=Math.sin(dLat/2)**2+Math.cos(a[0]*p)*Math.cos(b[0]*p)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function nearest(){
  if(!state.position)return null;
  return locations.map(l=>({...l,distance:distance(state.position,[l.lat,l.lng])})).sort((a,b)=>a.distance-b.distance)[0];
}
function proximityText(m){
  if(!m)return '📍 Location is waiting for your GPS position.';
  if(m.distance<10)return '⚡ You are here';
  if(m.distance<50)return '👻 Something is here';
  if(m.distance<200)return '🕯️ Something is nearby';
  return Math.round(m.distance)+'m away';
}
function parse(v){if(typeof v==='string'){try{return JSON.parse(v)}catch{return v}}return v}

async function loadWorld({silent=false}={}){
  if(!supabase)return;
  try{
    const rpc=await supabase.rpc('get_current_chapter');
    if(!rpc.error&&rpc.data)state.chapter=typeof rpc.data==='string'?rpc.data:rpc.data.code;
    const {data,error}=await supabase.from('game_settings').select('key,value').in('key',['current_chapter','town_spirit']);
    if(error)throw error;
    for(const row of data||[]){
      if(row.key==='current_chapter')state.chapter=String(parse(row.value));
      if(row.key==='town_spirit'&&Number.isFinite(Number(parse(row.value))))state.spirit=Number(parse(row.value));
    }
    state.connected=true;save();
  }catch(e){state.connected=false;save();if(!silent)toast('The game world could not be reached.')}
}
async function addSpirit(n){
  state.spirit=Math.min(100,state.spirit+n);save();
  if(!supabase)return;
  const r=await supabase.rpc('contribute_spirit',{p_amount:n});
  if(!r.error&&Number.isFinite(Number(r.data))){state.spirit=Number(r.data);save()}
}
async function activity(type,metadata={}){
  if(supabase&&state.playerId)await supabase.from('player_activity').insert({player_id:state.playerId,activity_type:type,metadata});
}
function startAdventure(){
  const input=document.getElementById('nicknameInput'), name=(input?.value||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Choose a nickname with at least 2 characters.');return}
  if(name.length>24){toast('Keep your nickname to 24 characters or fewer.');return}
  state.player=name;state.playerId=crypto.randomUUID();state.started=true;state.tab='map';save();
  toast('The town has been waiting for you.');
  render();requestLocation({recenter:true});
}
function requestLocation({recenter=true}={}){
  if(!navigator.geolocation){toast('Location services are not available in this browser.');return}
  const s=document.getElementById('locationStatus');if(s)s.textContent='📍 Finding your location…';
  navigator.geolocation.getCurrentPosition(p=>{
    updateLocation(p,recenter);startLocationWatch();
  },e=>{
    const msg=e.code===1?'Location was denied. Allow it for this site and try again.':e.code===2?'Your location could not be determined. Try again outdoors.':'Location took too long. Try again.';
    if(s)s.textContent=msg;toast(msg);
  },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function updateLocation(p,recenter=false){
  state.position=[p.coords.latitude,p.coords.longitude];save();
  if(mapInstance){
    updatePlayerMarker();
    if(recenter)mapInstance.setView(state.position,17);
  }
  updateProximity();
  updateWorldHud();
  if(mapInstance)updateWorldObjects();
}
function startLocationWatch(){
  if(locationWatchId!==null)return;
  locationWatchId=navigator.geolocation.watchPosition(p=>{updateLocation(p);updateProximity()},()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:30000});
}
function updateProximity(){
  const m=nearest(), e=document.getElementById('proximity');
  if(e)e.textContent=proximityText(m);
  document.querySelectorAll('[data-location-id]').forEach(x=>{
    const l=locations.find(a=>a.id===x.dataset.locationId);
    if(l)x.disabled=!state.position||distance(state.position,[l.lat,l.lng])>40;
  });
}
function chapterText(){
  if(state.chapter==='VEIL')return {title:'The Veil',intro:'The boundary between the ordinary world and something older is becoming thin.',notice:'Watch the map. Something may cross.'};
  if(state.chapter==='CHRISTMAS')return {title:'Christmas Awakens',intro:'The lights are on. A new chapter has begun across Hexham.',notice:'The Christmas world is now awake.'};
  return {title:'The Spirits Awaken',intro:'Something strange is happening in Hexham. Investigate it before it finds you.',notice:'Three places. Three memories. One presence.'};
}
function home(){
  const c=chapterText();
  if(!state.started)return `<div class="panel"><section class="hero"><h1>${c.title}</h1><p>${c.intro}</p></section>
  <div class="card"><b>Choose your adventurer name</b><p class="muted">Use a nickname. No email is needed to play.</p>
  <input id="nicknameInput" maxlength="24" autocomplete="nickname" placeholder="Your nickname" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:12px;font:inherit;margin-top:8px">
  <button class="action" onclick="startAdventure()">Start the adventure</button></div>
  <div class="notice"><strong>🔒 Your identity</strong><span>Your nickname is your game identity. Your exact GPS position is only shown to you.</span></div></div>`;
  const done=state.marley;
  return `<div class="panel"><section class="hero"><div class="eyebrow">CHAPTER 1 • HALLOWEEN</div><h1>${c.title}</h1><p>${c.intro}</p><button class="action" onclick="setTab('map')">Enter Hexham</button></section>
  <div class="storybar"><b>${done?'MARLEY FOUND':'Something is moving'}</b><span>${done?'You have discovered the first name in the story.':'Follow the disturbances. The town will reveal the rest.'}</span></div>
  <div class="section">Your investigation</div>
  <div class="missionrow"><span>⛓️ Old Gaol</span><b>${state.progress.gaol}/3 traces</b></div>
  <div class="missionrow"><span>🎬 Forum Cinema</span><b>${state.progress.forum?'Solved':'Locked'}</b></div>
  <div class="missionrow"><span>🎭 Queen's Hall</span><b>${state.progress.hall?'Heard':'Locked'}</b></div>
  <div class="card"><b>👤 ${state.player}</b><div class="muted">Live world: ${state.connected?'connected':'offline cache'}</div></div></div>`;
}
function mapTab(){
  const m=nearest();
  return `<div class="panel game-panel">
    <div class="gamehud"><div><div class="eyebrow">THE TOWN IS ALIVE</div><b id="proximity">${proximityText(m)}</b></div><button class="action mini" onclick="requestLocation({recenter:true})">📍 Find me</button></div>
    <div class="world-shell" id="worldShell">
      <div id="map" class="mapwrap"></div>
      <div class="world-vignette"></div>
      <div class="world-hud" id="worldHud"></div>
    </div>
    <div class="maphint">Move through Hexham. Watch for movement, disturbances and things that don't belong.</div>
  </div>`;
}
function locationCard(l){
  const d=state.position?Math.round(distance(state.position,[l.lat,l.lng])):null;
  let status='Approach the location';
  if(l.id==='gaol')status=state.progress.gaol>=3?'Investigated':state.progress.gaol===0?'Begin investigating':'Continue investigating';
  if(l.id==='forum')status=state.progress.forum?'Memory reconstructed':'Reconstruct the film';
  if(l.id==='hall')status=state.progress.hall?'Audience heard':'Listen at the hall';
  const near=d!==null&&d<=40;
  return `<div class="locationcard ${near?'near':''}"><div class="locicon">${l.icon}</div><div class="locbody"><b>${l.title}</b><span>${l.name} • ${d===null?'GPS required':d+'m'}</span><p>${near?l.prompt:l.text}</p>
  <button class="action ${near?'':'secondary'}" data-location-id="${l.id}" onclick="playLocation('${l.id}')" ${near?'':'disabled'}>${near?status:'Move closer'}</button></div></div>`;
}
function playLocation(id){
  const l=locations.find(x=>x.id===id);
  if(!l||!state.position||distance(state.position,[l.lat,l.lng])>40){toast('Move closer to the location.');return}
  if(id==='gaol')playGaol(l);
  if(id==='forum')playForum(l);
  if(id==='hall')playHall(l);
}
function playGaol(l){
  const next=l.zones[state.progress.gaol];
  if(!next){toast('The traces are gone. Something followed them.');spawnSpirit();return}
  const d=distance(state.position,[next.lat,next.lng]);
  if(d>18){showWorldMessage('The disturbance slips away. Keep searching this part of the Gaol.');pulseMap();return}
  state.progress.gaol+=1;
  addSpirit(l.spirit/3);
  activity('investigate_zone',{location_id:l.id,zone_id:next.id});
  save();
  showDiscovery(next.title,next.clue);
  if(state.progress.gaol===3){
    setTimeout(()=>{showWorldMessage('⚠️ Something has noticed you.');spawnSpirit();vibrate([80,40,180])},1600)
  } else {
    setTimeout(()=>renderMapWorld(),900);
  }
}
function playForum(l){
  if(state.progress.gaol<3){showWorldMessage('The cinema is quiet. The answer is somewhere behind you.');return}
  if(state.progress.forum){showWorldMessage('The empty seat is occupied again.');return}
  openMemoryPuzzle();
}
function playHall(l){
  if(!state.progress.forum){showWorldMessage('The hall is listening. Finish what you started at the cinema.');return}
  if(state.progress.hall){showWorldMessage('The applause is still there, just beneath the ordinary sounds of the town.');return}
  state.progress.hall=true;save();addSpirit(l.spirit);activity('listen_audience',{location_id:l.id});
  showDiscovery('THE AUDIENCE','The applause grows louder. Then the crowd falls silent.');
  vibrate([50,80,50,180]);
  setTimeout(()=>revealMarley(),2200);
}
function revealMarley(){
  state.marley=true;save();
  showDiscovery('MARLEY','You found him. But he is not the one you are supposed to be looking for.');
  vibrate([100,60,100,60,300]);
  setTimeout(()=>{spawnSpirit();renderMapWorld()},1800);
}
function vibrate(pattern=[80]){
  if(navigator.vibrate)navigator.vibrate(pattern);
}
function showWorldMessage(message){
  const hud=document.getElementById('worldHud');
  if(!hud)return toast(message);
  hud.innerHTML=`<div class="hud-message"><span>${message}</span></div>`;
  hud.classList.add('show');
  vibrate([35]);
  clearTimeout(window.__hud);
  window.__hud=setTimeout(()=>hud.classList.remove('show'),5000);
}
function showDiscovery(title,text){
  const hud=document.getElementById('worldHud');
  if(!hud)return toast(title+': '+text);
  hud.innerHTML=`<div class="discovery"><div class="eyebrow">DISCOVERY</div><h2>${title}</h2><p>${text}</p></div>`;
  hud.classList.add('show');
  vibrate([70,40,120]);
  clearTimeout(window.__hud);
  window.__hud=setTimeout(()=>hud.classList.remove('show'),6500);
}
function pulseMap(){
  const shell=document.getElementById('worldShell');
  if(!shell)return;
  shell.classList.remove('pulse-now');void shell.offsetWidth;shell.classList.add('pulse-now');
}
function openMemoryPuzzle(){
  const hud=document.getElementById('worldHud');
  if(!hud)return;
  hud.innerHTML=`<div class="puzzle"><div class="eyebrow">THE MEMORY</div><h2>Something is wrong with the film.</h2><p>Three moments. One sequence. Tap them in the order they happened.</p>
    <div class="film-options">
      <button data-order="1" onclick="memoryPick(1)">🎞️ <span>A figure enters</span></button>
      <button data-order="2" onclick="memoryPick(2)">🚪 <span>The doors close</span></button>
      <button data-order="3" onclick="memoryPick(3)">💺 <span>An empty seat</span></button>
    </div>
    <div id="memoryOrder" class="memory-order">Your sequence will appear here.</div>
    <button class="action secondary" onclick="closeWorldHud()">Back to the world</button>
  </div>`;
  hud.classList.add('show');
}
function memoryPick(n){
  const hud=document.getElementById('worldHud');
  const order=window.__memoryOrder||[];
  if(order.includes(n))return;
  order.push(n);window.__memoryOrder=order;
  const out=document.getElementById('memoryOrder');
  if(out)out.textContent=order.join('  →  ');
  vibrate([25]);
  if(order.length===3){
    if(order.join('')!=='123'){
      window.__memoryOrder=[];
      setTimeout(()=>{if(out)out.textContent='No. Watch the memory again.';vibrate([100,100])},300);
      return;
    }
    const l=locations.find(x=>x.id==='forum');
    state.progress.forum=true;save();addSpirit(l.spirit);activity('solve_memory',{location_id:l.id});
    window.__memoryOrder=[];
    showDiscovery('THE EMPTY SEAT','The film continues. Someone is sitting in the empty seat.');
    setTimeout(()=>{showWorldMessage('⚠️ DON’T LET IT SEE YOU');spawnSpirit();renderMapWorld()},1500);
  }
}
function closeWorldHud(){window.__memoryOrder=[];const hud=document.getElementById('worldHud');if(hud)hud.classList.remove('show')}
function renderMapWorld(){
  if(!mapInstance)return;
  updateWorldObjects();
  updateWorldHud();
}
function updateWorldHud(){
  const hud=document.getElementById('worldHud');
  if(!hud)return;
  if(hud.classList.contains('show'))return;
  const m=nearest();
  let message='Follow the disturbances.';
  if(state.marley)message='Something is still moving. The story is not finished.';
  else if(state.progress.hall)message='Listen. The town remembers.';
  else if(state.progress.forum)message='Something left the cinema. Follow it.';
  else if(state.progress.gaol>=3)message='The disturbance has moved. Follow it.';
  else if(m&&m.distance<55)message='Something is here. Look around you.';
  else if(m&&m.distance<220)message='Something is nearby.';
  hud.innerHTML=`<div class="hud-message"><span>${message}</span></div>`;
}
function updateWorldObjects(){
  if(!mapInstance)return;
  worldObjectLayers.forEach(layer=>{try{mapInstance.removeLayer(layer)}catch(e){}});
  worldObjectLayers=[];
  const shell=document.getElementById('worldShell');
  if(shell)shell.dataset.spirit=state.spirit<40?'low':state.spirit>70?'high':'mid';
  // Landmarks are deliberately subtle: the map is the world, not a list of pins.
  locations.forEach(l=>{
    const icon=L.divIcon({className:'landmark-icon',html:`<div class="landmark"><span>${l.icon}</span><small>${l.name.replace('Hexham ','')}</small></div>`,iconSize:[120,34],iconAnchor:[60,17]});
    const marker=L.marker([l.lat,l.lng],{icon,interactive:false}).addTo(mapInstance);
    worldObjectLayers.push(marker);
  });
  const zone=locations[0].zones[state.progress.gaol];
  if(zone&&!state.progress.forum){
    const jitter=[[0.00012,-0.00010],[-0.00009,0.00013],[0.00006,0.00011]][state.progress.gaol]||[0,0];
    const pos=[zone.lat+jitter[0],zone.lng+jitter[1]];
    const icon=L.divIcon({className:'disturbance-icon',html:'<div class="disturbance"><i></i><span>◌</span></div>',iconSize:[64,64],iconAnchor:[32,32]});
    const marker=L.marker(pos,{icon,interactive:true}).addTo(mapInstance);
    worldObjectLayers.push(marker);
    marker.on('click',()=>showWorldMessage('The disturbance is close. Search the area.'));
  }
  if(state.progress.gaol>=3||state.progress.forum||state.marley) {
    if(!spiritMarker)spawnSpirit();
  }
  if(state.position)updatePlayerMarker();
}
function updatePlayerMarker(){
  if(!mapInstance||!state.position)return;
  if(meMarker)meMarker.setLatLng(state.position);
  else{
    const icon=L.divIcon({className:'player-icon',html:'<div class="player-dot"><span></span></div>',iconSize:[30,30],iconAnchor:[15,15]});
    meMarker=L.marker(state.position,{icon,interactive:false}).addTo(mapInstance);
  }
}
function spawnSpirit(){
  if(!mapInstance)return;
  const path=[[54.97130,-2.10010],[54.97160,-2.10070],[54.97188,-2.10130],[54.97060,-2.10260],[54.96940,-2.10330]];
  let i=0;
  if(spiritTimer)clearInterval(spiritTimer);
  if(spiritMarker){try{mapInstance.removeLayer(spiritMarker)}catch(e){}}
  const icon=L.divIcon({className:'spirit-icon',html:'<div class="spirit-entity">✦</div>',iconSize:[44,44],iconAnchor:[22,22]});
  spiritMarker=L.marker(path[0],{icon,interactive:false}).addTo(mapInstance);
  spiritTimer=setInterval(()=>{
    i=(i+1)%path.length;
    spiritMarker.setLatLng(path[i]);
    showWorldMessage('👻 Something moved.');
    vibrate([25,40,25]);
  },9000);
}
function initMap(){
  if(mapInstance){setTimeout(()=>mapInstance.invalidateSize(),50);renderMapWorld();return}
  mapInstance=L.map('map',{zoomControl:false}).setView(state.position||HEXHAM,state.position?17:15);
  L.control.zoom({position:'bottomright'}).addTo(mapInstance);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',className:'game-tiles'}).addTo(mapInstance);
  if(state.position){updatePlayerMarker();startLocationWatch()}
  setTimeout(()=>{mapInstance.invalidateSize();renderMapWorld();updateWorldHud()},50);
  updateProximity();
}
function bag(){return `<div class="panel"><section class="hero"><h1>📓 Journal</h1><p>The things you have actually discovered stay with you.</p></section>
<div class="section">Case file</div><div class="card"><b>⛓️ The Prisoner</b><p class="muted">${state.progress.gaol}/3 traces recovered. Something was imprisoned here that was not a prisoner.</p></div>
<div class="card"><b>🎬 The Memory</b><p class="muted">${state.progress.forum?'The film continues. Someone is sitting in the empty seat.':'The cinema is waiting.'}</p></div>
<div class="card"><b>🎭 The Audience</b><p class="muted">${state.progress.hall?'Three places. Three memories. One presence.':'The hall remembers.'}</p></div>
${state.marley?'<div class="reveal"><div class="eyebrow">NAME RECOVERED</div><h2>MARLEY</h2><p>You have found him. Nothing else about him is explained. Not yet.</p></div>':''}</div>`}
function events(){return `<div class="panel"><section class="hero"><div class="eyebrow">LIVE WORLD</div><h1>${chapterText().title}</h1><p>${chapterText().notice}</p></section>
<div class="card"><b>✨ Hexham Spirit ${state.spirit}%</b><div class="meter"><i style="width:${state.spirit}%"></i></div><p class="muted">Every player's actions can change the shared world.</p></div>
<div class="card"><b>👻 Moving spirits</b><p class="muted">Some encounters are not waiting at a pin. When activity is triggered, a spirit can move across the map.</p></div>
<div class="card"><b>🔒 The next chapter is hidden</b><p class="muted">The game only reveals what is happening now. The world changes when the server says it changes.</p></div></div>`}
function destroyMap(){
  if(spiritTimer){clearInterval(spiritTimer);spiritTimer=null}
  worldObjectLayers=[];
  if(mapInstance){
    try{mapInstance.remove()}catch(e){}
    mapInstance=null;
  }
  spiritMarker=null;
  meMarker=null;
}
function render(){
  // Leaflet is bound to a specific DOM element. Our screens are re-rendered,
  // so an old map instance must be destroyed before replacing #app.
  destroyMap();
  updateHeader();
  app.innerHTML=state.tab==='home'?home():state.tab==='map'?mapTab():state.tab==='bag'?bag():events();
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
  if(state.tab==='map')setTimeout(initMap,0);
  if(state.tab==='map')setTimeout(updateProximity,30);
}
function notifications(){
  if(!('Notification' in window)){toast('Notifications are not supported here.');return}
  Notification.requestPermission().then(r=>{state.notificationOptIn=r==='granted';save();toast(r==='granted'?'🔔 Notifications enabled.':'Notifications not enabled.')});
}
window.setTab=setTab;window.startAdventure=startAdventure;window.requestLocation=requestLocation;window.playLocation=playLocation;window.notifications=notifications;window.memoryPick=memoryPick;window.closeWorldHud=closeWorldHud;

(async function boot(){
  render();
  await loadWorld({silent:true});
  if(state.started){render();activity('session_start',{chapter:state.chapter})}
})();
