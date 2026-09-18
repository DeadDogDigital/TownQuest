import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const HEXHAM = [54.9694, -2.1033];
const sampleLocations = [
  {id:'gaol',name:'The Old Gaol',lat:54.97005,lng:-2.10395,type:'Story',icon:'👻',spirit:7,desc:'A major story location. Something about this place feels different tonight.'},
  {id:'abbey',name:'Hexham Abbey',lat:54.97205,lng:-2.10355,type:'Story',icon:'🕯️',spirit:4,desc:'An old story seems unusually close here.'},
  {id:'market',name:'Market Place',lat:54.96925,lng:-2.10225,type:'Supply',icon:'🔮',spirit:3,desc:'Something has been left here for those brave enough to find it.'},
  {id:'beaumont',name:'Beaumont Street',lat:54.96835,lng:-2.1011,type:'Mission',icon:'🔔',spirit:4,desc:'A bell has been heard here, but nobody can find its source.'},
  {id:'sele',name:'The Sele',lat:54.97075,lng:-2.09835,type:'Event',icon:'✨',spirit:5,desc:'A strange concentration of spirit energy has been detected here.'},
  {id:'fore',name:'Fore Street',lat:54.96855,lng:-2.1037,type:'Discovery',icon:'🪟',spirit:3,desc:'There is something hidden nearby.'},
  {id:'priest',name:'Priestpopple',lat:54.96895,lng:-2.1052,type:'Supply',icon:'🕯️',spirit:3,desc:'A candle has been left burning with nobody around.'},
  {id:'battle',name:'Battle Hill',lat:54.97095,lng:-2.10165,type:'Discovery',icon:'🗝️',spirit:3,desc:'Something old has been disturbed.'}
];

let locations = sampleLocations;
let mapInstance = null;
let locationWatchId = null;
let state = JSON.parse(localStorage.getItem('hca-v2') || 'null') || {
  tab:'home', spirit:37, bag:{gifts:2,candles:1,bells:0,stars:0,treats:0}, found:[], donations:0,
  player:'', notificationOptIn:false, playerId:null, position:null,
  chapter:'HALLOWEEN', connected:false, nearbyPlayers:[], started:false
};

const app = document.getElementById('app');
function save(){localStorage.setItem('hca-v2',JSON.stringify(state));updateHeader();}
function updateHeader(){document.getElementById('spiritPct').textContent=state.spirit+'%';document.getElementById('spiritFill').style.width=state.spirit+'%';}
function toast(t){const x=document.getElementById('toast');x.textContent=t;x.style.display='block';clearTimeout(window.tt);window.tt=setTimeout(()=>x.style.display='none',3500)}
function setTab(t){state.tab=t;save();document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));render()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

function parseJsonValue(v){
  if(typeof v === 'string'){try{return JSON.parse(v)}catch{return v}}
  return v;
}

async function loadWorld({silent=false}={}){
  if(!supabase){if(!silent)toast('Game backend is not configured yet.');return;}
  try{
    let chapter = null;
    const rpc = await supabase.rpc('get_current_chapter');
    if(!rpc.error && rpc.data){chapter = typeof rpc.data === 'string' ? rpc.data : rpc.data.code;}
    if(!chapter){
      const {data,error}=await supabase.from('game_settings').select('key,value').in('key',['current_chapter','town_spirit']);
      if(error) throw error;
      for(const row of data||[]) {
        if(row.key==='current_chapter') chapter=String(parseJsonValue(row.value));
        if(row.key==='town_spirit' && Number.isFinite(Number(parseJsonValue(row.value)))) state.spirit=Number(parseJsonValue(row.value));
      }
    } else {
      const {data}=await supabase.from('game_settings').select('key,value').eq('key','town_spirit').maybeSingle();
      if(data && Number.isFinite(Number(parseJsonValue(data.value)))) state.spirit=Number(parseJsonValue(data.value));
    }
    if(chapter) state.chapter=chapter;
    state.connected=true;save(); if(state.started) render();
  }catch(error){
    state.connected=false;save();
    if(!silent)toast('Could not connect to the game world.');
    console.error(error);
  }
}

function ensureLocalPlayer(){
  if(state.playerId) return true;
  if(!state.player){
    return false;
  }
  state.playerId=crypto.randomUUID();
  state.started=true;
  save();
  return true;
}

function startAdventure(){
  const input=document.getElementById('nicknameInput');
  const nickname=(input?.value||'').trim().replace(/\s+/g,' ');
  if(nickname.length<2){toast('Choose a nickname with at least 2 characters.');return;}
  if(nickname.length>24){toast('Keep your nickname to 24 characters or fewer.');return;}
  state.player=nickname;
  ensureLocalPlayer();
  toast(`Welcome, ${nickname}! Your adventure begins.`);
  render();
}

function showAccountPrompt(){
  toast('Account and prize draw entry will be added here.');
}

async function updatePresence(){
  // Until the player chooses to create an account, their identity is local-only.
  // We deliberately do not write anonymous player records to Supabase.
  return;
}

function subscribeRealtime(){
  if(!supabase) return;
  supabase.channel('game-world')
    .on('postgres_changes',{event:'*',schema:'public',table:'game_settings'},payload=>{
      if(payload.new?.key==='current_chapter'){
        state.chapter=String(parseJsonValue(payload.new.value));save(); if(state.started) { render(); toast('The game world has changed.'); }
      }
      if(payload.new?.key==='town_spirit'){
        const v=Number(parseJsonValue(payload.new.value));if(Number.isFinite(v)){state.spirit=v;save(); if(state.started && state.tab!=='home') render();}
      }
    })
    .subscribe();
  setInterval(()=>loadWorld({silent:true}),60000);
}

async function contributeSpirit(amount){
  if(!supabase || !state.playerId) return false;
  const {data,error}=await supabase.rpc('contribute_spirit',{p_amount:amount});
  if(error){console.debug('Spirit contribution:',error.message);return false;}
  if(Number.isFinite(Number(data))) state.spirit=Number(data);
  save();
  return true;
}

async function addSpirit(n){
  state.spirit=Math.min(100,state.spirit+n);save();
  await contributeSpirit(n);
}

async function discover(loc){
  if(state.found.includes(loc.id)){toast('You have already discovered this location.');return}
  state.found.push(loc.id);await addSpirit(loc.spirit);
  if(loc.type==='Supply'){state.bag.gifts++;state.bag.candles++;toast('Supply found: 🎁 +1 gift and 🕯️ +1 candle')}
  else if(loc.type==='Story'){state.bag.stars++;toast('👻 Story location discovered. ✨ +1 spirit light')}
  else {state.bag.bells++;toast(loc.icon+' Location discovered. 🔔 +1 bell')}
  save();
  if(supabase && state.playerId){
    await supabase.from('player_activity').insert({player_id:state.playerId,activity_type:'discover',metadata:{prototype_location:loc.id,chapter:state.chapter,location_name:loc.name}});
  }
  render();
}

async function donate(){
  if(state.bag.gifts<1){toast('You need a gift to donate.');return}
  state.bag.gifts--;state.donations++;save();
  await addSpirit(2);toast('🎁 Gift donated. The shared town Spirit rises!');render();
  if(supabase && state.playerId) await supabase.from('player_activity').insert({player_id:state.playerId,activity_type:'donate',amount:1,metadata:{chapter:state.chapter}});
}

async function shareGift(){
  if(state.bag.gifts<1){toast('You have no gift to share.');return}
  state.bag.gifts--;save();
  await addSpirit(2);toast('🎁 Gift shared with another adventurer nearby.');render();
}

function updateOwnLocation(position, {notify=false, recenter=false}={}){
  state.position=[position.coords.latitude,position.coords.longitude];
  save();
  if(mapInstance){
    if(window.__hcaMeMarker) window.__hcaMeMarker.setLatLng(state.position);
    else window.__hcaMeMarker=L.circleMarker(state.position,{radius:9,weight:3}).addTo(mapInstance).bindPopup('📍 You are here');
    if(recenter) mapInstance.setView(state.position,16);
  }
  if(notify) toast('📍 Your location has been updated.');
}

function locationStatus(message){
  const el=document.getElementById('locationStatus');
  if(el) el.textContent=message;
}

async function requestLocation({recenter=true}={}){
  if(!window.isSecureContext){
    locationStatus('Location requires a secure connection (HTTPS).');
    toast('Location is only available over HTTPS.');
    return;
  }
  if(!navigator.geolocation){
    locationStatus('This browser does not provide location services.');
    toast('Location services are not available in this browser.');
    return;
  }
  locationStatus('📍 Finding your location…');
  try{
    if(navigator.permissions?.query){
      const permission=await navigator.permissions.query({name:'geolocation'});
      if(permission.state==='denied'){
        locationStatus('Location access is blocked. Allow Location for this site in your browser settings, then try again.');
        toast('Location access is blocked for this site.');
        return;
      }
    }
  }catch(e){ /* Permissions API is optional. */ }
  navigator.geolocation.getCurrentPosition(
    p=>{
      updateOwnLocation(p,{notify:true,recenter});
      locationStatus('📍 Location found');
      startLocationWatch();
    },
    err=>{
      let message='We could not get your location.';
      if(err.code===1) message='Location permission was denied. Allow location access for this site and try again.';
      else if(err.code===2) message='Your location could not be determined. Try again outdoors with Location Services enabled.';
      else if(err.code===3) message='Location took too long. Check Location Services and try again.';
      locationStatus(message);
      toast(message);
      console.warn('Geolocation error',err.code,err.message);
    },
    {enableHighAccuracy:true,maximumAge:0,timeout:20000}
  );
}

function startLocationWatch(){
  if(!navigator.geolocation || locationWatchId!==null) return;
  locationWatchId=navigator.geolocation.watchPosition(
    p=>{ updateOwnLocation(p); locationStatus('📍 Live location active'); },
    err=>{
      console.warn('Geolocation watch error',err.code,err.message);
      if(err.code===1) locationStatus('Location access was denied.');
    },
    {enableHighAccuracy:true,maximumAge:5000,timeout:30000}
  );
}

function notificationPermission(){
  if(!('Notification' in window)){toast('Notifications are not supported by this browser.');return}
  Notification.requestPermission().then(r=>{state.notificationOptIn=r==='granted';save();if(r==='granted')toast('🔔 Notifications enabled.');else toast('Notifications were not enabled.');});
}

function chapterText(){
  if(state.chapter==='VEIL') return {title:'The Veil',intro:'Something has changed in Hexham. The boundary between the ordinary world and something older is becoming thin.',meter:'Hexham Spirit',notice:'The veil is open. Watch the map and investigate anything unusual.'};
  if(state.chapter==='CHRISTMAS') return {title:'Christmas Awakens',intro:'The lights are on. A new chapter of the story has begun across Hexham.',meter:'Hexham Christmas Spirit',notice:'The Christmas world is now awake.'};
  return {title:'The Spirits Awaken',intro:'Something strange is happening in Hexham. Explore the town, investigate unusual places and discover what has awakened.',meter:'Hexham Spirit',notice:'The spirits have awakened. The town needs curious adventurers.'};
}

function home(){const c=chapterText(); if(!state.started) return `<div class="panel"><section class="hero"><h1>${c.title}</h1><p>${c.intro}</p></section><div class="card"><b>Choose your adventurer name</b><p class="muted">Use a nickname. You can start playing without giving us your email address.</p><input id="nicknameInput" maxlength="24" placeholder="Your nickname" style="width:100%;padding:13px;border:1px solid var(--line);border-radius:12px;font:inherit;margin-top:8px" onkeydown="if(event.key==='Enter')startAdventure()"><button class="action" onclick="startAdventure()">Start the adventure</button></div><div class="notice"><strong>🔒 Privacy</strong><span>Your nickname is your game identity. Email is only needed later if you choose to save your progress permanently or enter the prize draw.</span></div></div>`; return `<div class="panel"><section class="hero"><h1>${c.title}</h1><p>${c.intro}</p><button class="action" onclick="setTab('map')">Explore Hexham</button></section><div class="notice"><strong>🕯️ Story status</strong><span>${c.notice}</span></div><div class="grid"><div class="stat"><b>${state.found.length}/${locations.length}</b><span class="muted">locations discovered</span></div><div class="stat"><b>${state.donations}</b><span class="muted">gifts donated</span></div></div><div class="section">Your mission</div><div class="mission"><b>🔎 Explore the town</b><p>Find locations, collect resources and help build the shared world.</p><button class="action secondary" onclick="setTab('map')">Open the map</button></div><div class="section">Your adventurer</div><div class="card"><b>👤 ${state.player}</b><p class="muted">Your nickname is visible only as your game identity. No email is required to play.</p><button class="action secondary" onclick="showAccountPrompt()">Save progress & enter the prize draw</button></div><div class="section">Stay in the story</div><div class="card"><div class="cardhead"><div><b>🔔 Game notifications</b><div class="muted">Get major story events and live missions. No constant marketing messages.</div></div></div><button class="action" onclick="notificationPermission()">Enable notifications</button></div><div class="card"><b>🟢 ${state.connected?'Connected to the live game world':'Connecting to game world…'}</b><div class="muted">Player: ${state.playerId?'connected':'setting up'}</div></div></div>`}
function mapTab(){return `<div class="panel"><div class="card"><div class="cardhead"><div><b>🗺️ Hexham is the game board</b><div id="locationStatus" class="muted">📍 Waiting for your location…</div></div><button class="action" style="width:auto;margin:0" onclick="requestLocation({recenter:true})">📍 Find me</button></div><div class="muted" style="margin-top:8px">Allow location access when your browser asks. Your exact location is only shown to you.</div></div><div id="map" class="mapwrap"></div><div class="section">Nearby missions</div>${locations.slice(0,4).map(l=>locCard(l)).join('')}</div>`}
function locCard(l){const found=state.found.includes(l.id);return `<div class="card"><div class="cardhead"><div><b>${l.icon} ${l.name}</b><div class="muted">${l.type} • +${l.spirit} Spirit</div></div><span class="pill">${found?'FOUND':'DISCOVER'}</span></div><p>${l.desc}</p><button class="action ${found?'secondary':''}" onclick="discover(locations.find(x=>x.id==='${l.id}'))">${found?'Already discovered':'Discover location'}</button></div>`}
function bag(){return `<div class="panel"><section class="hero"><h1>🎒 My Bag</h1><p>Resources can be collected, used and shared. Nearby player exchange will be enabled as multiplayer expands.</p></section><div class="section">Supplies</div><div class="inventory"><div class="item"><div class="emoji">🎁</div><b>${state.bag.gifts}</b><span class="muted">Gifts</span></div><div class="item"><div class="emoji">🕯️</div><b>${state.bag.candles}</b><span class="muted">Candles</span></div><div class="item"><div class="emoji">🔔</div><b>${state.bag.bells}</b><span class="muted">Bells</span></div><div class="item"><div class="emoji">⭐</div><b>${state.bag.stars}</b><span class="muted">Spirit light</span></div><div class="item"><div class="emoji">🍪</div><b>${state.bag.treats}</b><span class="muted">Treats</span></div></div><div class="section">Help the town</div><div class="card"><b>🎁 Donate</b><p class="muted">Every donation increases the shared town Spirit.</p><button class="action" onclick="donate()">Donate one gift</button></div><div class="card"><b>🤝 Share</b><p class="muted">The full live multiplayer exchange will use nearby players.</p><button class="action" onclick="shareGift()">Share one gift</button></div></div>`}
function events(){return `<div class="panel"><section class="hero"><h1>📣 What’s happening?</h1><p>The game world can change automatically as the story progresses. Only the current chapter is shown to players.</p></section><div class="section">Current chapter</div><div class="card"><b>${chapterText().title}</b><p class="muted">${chapterText().notice}</p></div><div class="card"><b>🌐 Shared world</b><p>The town Spirit and live events are stored in the shared game backend. When another player changes the world, connected players can receive the update.</p></div></div>`}

function render(){
  updateHeader();document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
  app.innerHTML=state.tab==='home'?home():state.tab==='map'?mapTab():state.tab==='bag'?bag():events();
  if(state.tab==='map') initMap();
}
function initMap(){
  if(mapInstance){
    setTimeout(()=>{ if(mapInstance) mapInstance.invalidateSize(); },50);
    return;
  }
  const map=L.map('map').setView(state.position||HEXHAM,state.position?16:15);
  mapInstance=map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);
  locations.forEach(l=>{
    const marker=L.marker([l.lat,l.lng]).addTo(map);
    marker.bindPopup(`<b>${l.icon} ${l.name}</b><br>${l.type}<br><button onclick="discover(locations.find(x=>x.id==='${l.id}'));document.querySelector('.leaflet-popup-close-button')?.click()">${state.found.includes(l.id)?'Found':'Discover'}</button>`);
  });
  if(state.position){
    window.__hcaMeMarker=L.circleMarker(state.position,{radius:9,weight:3}).addTo(map).bindPopup('📍 You are here');
    locationStatus('📍 Location found');
    startLocationWatch();
  }else{
    locationStatus('📍 Finding your location…');
    setTimeout(()=>requestLocation({recenter:true}),250);
  }
}

window.locations=locations;window.setTab=setTab;window.discover=discover;window.donate=donate;window.shareGift=shareGift;window.requestLocation=requestLocation;window.notificationPermission=notificationPermission;window.startAdventure=startAdventure;window.showAccountPrompt=showAccountPrompt;

(async function boot(){
  // Render the nickname screen immediately and never re-render it while the player is typing.
  render();
  await loadWorld({silent:true});
  // A player does not exist until they press Start Adventure.
  if(state.started){
    ensureLocalPlayer();
    await updatePresence();
    subscribeRealtime();
    render();
  }
})();
