import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const HEXHAM = [54.9694, -2.1033];
const locations = [
  {id:'gaol',name:'Hexham Old Gaol',lat:54.97130,lng:-2.099786,icon:'⛓️',kind:'investigate',spirit:7,
   title:'THE PRISONER',prompt:'Something is wrong at the Old Gaol.',text:'Search the area. Something is not where it should be.',
   zones:[
     {id:'chain',lat:54.97130,lng:-2.09995,title:'A broken chain',clue:'The metal is cold. Far too cold. Whatever was wearing this did not leave willingly.',setup:'Physical prop: short broken chain or convincing replica.'},
     {id:'scratches',lat:54.97136,lng:-2.10002,title:'Deep scratches in the stone',clue:'Three parallel marks. Something dragged itself towards the doorway.',setup:'Physical prop: scratch/mark effect or discreet clue marker.'},
     {id:'cold',lat:54.97124,lng:-2.10002,title:'A patch of impossible cold',clue:'The temperature drops. The marks stop where there is nowhere left to go.',setup:'Physical prop: hidden QR/NFC marker or staff-triggered effect.'}
   ]},
  {id:'forum',name:'Forum Cinema',lat:54.9718539,lng:-2.1008345,icon:'🎬',kind:'puzzle',spirit:8,
   title:'THE MEMORY',prompt:'🎬 THE FILM HAS STARTED',text:'But nobody bought a ticket.',
   traces:['A figure entering the cinema','The doors closing','An empty seat']},
  {id:'hall',name:"Queen's Hall",lat:54.97060,lng:-2.102286,icon:'🎭',kind:'multiplayer',spirit:9,
   title:'THE AUDIENCE',prompt:'The building remembers everyone who has ever gathered here.',text:'Listen.',
   traces:['Faint applause','A voice behind you','An empty entrance']},
];

let mapInstance=null, spiritMarker=null, meMarker=null, locationWatchId=null, spiritTimer=null, worldObjectLayers=[];
let audioContext=null, proximityStage={}, firstLaunch=false;
let state=JSON.parse(localStorage.getItem('townquest-v3')||'null')||{
  tab:'home',player:'',playerId:null,started:false,position:null,chapter:'HALLOWEEN',
  spirit:37,found:[],progress:{gaol:0,forum:false,hall:false},marley:false,notificationOptIn:false,connected:false
};

const chargingCandidates=[[54.97062,-2.10520],[54.97215,-2.10345],[54.96895,-2.10125],[54.97005,-2.09915],[54.97235,-2.09815],[54.96865,-2.10405],[54.97305,-2.10185],[54.96935,-2.10600]];
const fezziwig={lat:54.971421,lng:-2.100990};
function economyInit(){state.energy=Number.isFinite(Number(state.energy))?Number(state.energy):100;state.credits=Number.isFinite(Number(state.credits))?Number(state.credits):50;state.items=state.items||{energy_tonic:1,spirit_candle:0,ghost_lantern:0,lucky_charm:0}}
function chargingZone(){const d=new Date(),key=d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate();let n=0;for(const c of key)n=(n*31+c.charCodeAt(0))%chargingCandidates.length;const p=chargingCandidates[n];return {id:key,lat:p[0],lng:p[1]}}
function economySave(){economyInit();localStorage.setItem('townquest-economy',JSON.stringify({energy:state.energy,credits:state.credits,items:state.items}))}
function economyLoad(){try{const x=JSON.parse(localStorage.getItem('townquest-economy')||'null');if(x){state.energy=x.energy;state.credits=x.credits;state.items=x.items}}catch(e){}economyInit()}
function spendEnergy(n){economyInit();state.energy=Math.max(0,state.energy-n);economySave()}
function earnCredits(n){economyInit();state.credits+=n;economySave();toast('🪙 +'+n+' Credits')}
function chargeEnergy(){economyInit();const z=chargingZone();if(!state.position||distance(state.position,[z.lat,z.lng])>45){toast('Move into the glowing energy source.');return}state.energy=100;economySave();toast('❤️ Energy restored')}
function buyItem(k,c){economyInit();if(state.credits<c){toast('You need '+c+' Credits.');return}state.credits-=c;state.items[k]=(state.items[k]||0)+1;economySave();render()}
function shopItem(k,i,n,c,d){return '<div class="card"><div class="cardhead"><b>'+i+' '+n+'</b><span class="pill">🪙 '+c+'</span></div><p class="muted">'+d+'</p><button class="action" onclick="buyItem(\''+k+'\','+c+')">Buy</button></div>'}
function shop(){economyInit();return '<div class="panel"><section class="hero"><div class="eyebrow">THE SHAMBLES • EASTER EGG</div><h1>🎩 Fezziwig\'s Market</h1><p>Something useful always seems to turn up.</p></section><div class="gamehud" style="margin-top:14px"><span>🪙 <b>'+state.credits+'</b> Credits</span><span class="muted">Earned by playing</span></div><div class="section">What\'s on the stall?</div>'+shopItem('energy_tonic','🧪','Energy Tonic',10,'Restores 25 Energy.')+shopItem('spirit_candle','🕯️','Spirit Candle',20,'Helps reveal hidden spirits.')+shopItem('lucky_charm','🍀','Lucky Charm',25,'Improves discoveries.')+shopItem('ghost_lantern','🏮','Ghost Lantern',40,'Reveals hidden things.')+'<div class="notice"><strong>Free to play</strong><span>Credits are earned in the game. No real-money purchases are used in this version.</span></div></div>'}
const app=document.getElementById('app');
const save=()=>{localStorage.setItem('townquest-v3',JSON.stringify(state));updateHeader()};
const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.style.display='none',3500)};
const updateHeader=()=>{economyInit();const p=document.getElementById('spiritPct'),f=document.getElementById('spiritFill'),e=document.getElementById('energyPct'),c=document.getElementById('creditsCount');if(p)p.textContent=state.spirit+'%';if(f)f.style.width=state.spirit+'%';if(e)e.textContent=state.energy+'%';if(c)c.textContent=state.credits};
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
function currentObjective(){
  if(state.marley)return {location:null,title:'The story continues',text:'Follow the spirit.'};
  if(state.progress.hall)return {location:null,title:'Something has changed',text:'Watch the town.'};
  if(state.progress.forum)return {location:'hall',title:"NEXT: Queen's Hall",text:'Go there and listen.'};
  if(state.progress.gaol>=3)return {location:'forum',title:'NEXT: Forum Cinema',text:'The disturbance moved there.'};
  return {location:'gaol',title:'START HERE: Old Gaol',text:'Find out what escaped.'};
}
function focusObjective(){
  const o=currentObjective(),l=o.location&&locations.find(x=>x.id===o.location);
  if(!l||!mapInstance)return;
  mapInstance.setView([l.lat,l.lng],17);
  showWorldMessage(o.title+' — '+o.text,{silentEffects:true});
}
function parse(v){if(typeof v==='string'){try{return JSON.parse(v)}catch{return v}}return v}

function svgIcon(type, label=''){
  const icons={
    ghost:'<svg viewBox="0 0 64 64" aria-hidden="true"><path class="ghost-glow" d="M17 43V28c0-12 7-20 15-20s15 8 15 20v15l-5-4-5 6-5-6-5 6-5-6-5 4Z"/><path class="ghost-body" d="M17 43V28c0-12 7-20 15-20s15 8 15 20v15l-5-4-5 6-5-6-5 6-5-6-5 4Z"/><circle class="ghost-eye" cx="26" cy="28" r="3"/><circle class="ghost-eye" cx="38" cy="28" r="3"/><path class="ghost-mouth" d="M28 36c2 2 6 2 8 0"/></svg>',
    disturbance:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="disturb-core" cx="32" cy="32" r="5"/><circle class="disturb-ring ring-a" cx="32" cy="32" r="13"/><circle class="disturb-ring ring-b" cx="32" cy="32" r="21"/><path class="disturb-wisp" d="M32 7c8 7 11 14 7 20-3 5-9 6-10 13-1 5 2 10 8 17"/></svg>',
    player:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="player-ring" cx="32" cy="32" r="23"/><circle class="player-head" cx="32" cy="23" r="7"/><path class="player-body" d="M19 48c1-10 6-15 13-15s12 5 13 15"/></svg>',
    gaol:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect class="landmark-fill" x="11" y="12" width="42" height="40" rx="5"/><path class="landmark-line" d="M18 20h28M18 28h28M18 36h28M18 44h28M24 12v40M32 12v40M40 12v40"/></svg>',
    cinema:'<svg viewBox="0 0 64 64" aria-hidden="true"><path class="landmark-line" d="M10 23h44v29H10z"/><path class="landmark-line" d="M10 30h44M18 23l-5-9M29 23l-5-9M40 23l-5-9M51 23l-5-9"/><circle class="landmark-fill" cx="32" cy="41" r="7"/></svg>',
    hall:'<svg viewBox="0 0 64 64" aria-hidden="true"><path class="landmark-fill" d="M8 50h48L48 18H16L8 50Z"/><path class="landmark-line" d="M18 25v17M26 25v17M34 25v17M42 25v17M12 50h40"/></svg>'
  };
  return icons[type]||icons.disturbance;
}
function entityIcon(type,label=''){
  const safe=String(label).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return '<div class="entity-icon entity-'+type+'" role="img" aria-label="'+safe+'">'+svgIcon(type,label)+'</div>';
}

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
function primeGameAudio(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    audioContext=audioContext||new C();
    if(audioContext.state==='suspended')audioContext.resume();
  }catch(e){}
}
function gameSound(kind='whisper'){
  if(!audioContext)return;
  try{
    const now=audioContext.currentTime,o=audioContext.createOscillator(),g=audioContext.createGain();
    const tones={whisper:[170,.045,.16],nearby:[240,.08,.18],danger:[90,.18,.25],discovery:[440,.12,.2],reveal:[110,.35,.28],wrong:[120,.1,.18],right:[520,.16,.22]};
    const [freq,dur,vol]=tones[kind]||tones.whisper;
    o.type=kind==='danger'||kind==='reveal'?'sawtooth':'sine';o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(freq*(kind==='discovery'?1.7:.72),now+dur);
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(vol,now+.01);g.gain.exponentialRampToValueAtTime(.001,now+dur);
    o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+dur+.02);
  }catch(e){}
}
function gameEvent(type,payload={}){
  const shell=document.getElementById('worldShell');
  const hud=document.getElementById('worldHud');
  if(!shell)return;
  const config={
    nearby:{className:'event-nearby',sound:'nearby',vibe:[30]},
    close:{className:'event-close',sound:'danger',vibe:[45,35,45]},
    danger:{className:'event-danger',sound:'danger',vibe:[70,35,140]},
    discovery:{className:'event-discovery',sound:'discovery',vibe:[60,40,120]},
    reveal:{className:'event-reveal',sound:'reveal',vibe:[100,60,100,60,260]},
    wrong:{className:'event-wrong',sound:'wrong',vibe:[90,90]},
    right:{className:'event-right',sound:'right',vibe:[35,45,90]},
    chapter:{className:'event-chapter',sound:'reveal',vibe:[100,70,180]}
  }[type]||{};
  if(config.className){shell.classList.remove('game-event-active','event-nearby','event-close','event-danger','event-discovery','event-reveal','event-wrong','event-right','event-chapter');void shell.offsetWidth;shell.classList.add('game-event-active',config.className);setTimeout(()=>shell.classList.remove('game-event-active',config.className),1100)}
  gameSound(config.sound||'whisper');
  vibrate(config.vibe||[30]);
  if(type==='chapter'){
    showCinematic('THE SPIRITS AWAKEN','Something is wrong in Hexham. Find out what escaped.','Begin at the Old Gaol.');
  }
  if(type==='nearby'&&payload.message)showWorldMessage(payload.message,{silentEffects:true});
  if(type==='close'&&payload.message)showWorldMessage(payload.message,{silentEffects:true});
}
function showCinematic(title,text,cta=''){
  const el=document.createElement('div');el.className='cinematic';el.innerHTML='<div class="cinematic-inner"><div class="eyebrow">HEXHAM ADVENTURE</div><h1>'+title+'</h1><p>'+text+'</p>'+(cta?'<div class="cinematic-cta">'+cta+'</div>':'')+'</div>';
  document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),500)},3600);
}
function startAdventure(){
  primeGameAudio();
  economyInit();
  const input=document.getElementById('nicknameInput'), name=(input?.value||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Choose a nickname with at least 2 characters.');return}
  if(name.length>24){toast('Keep your nickname to 24 characters or fewer.');return}
  state.player=name;state.playerId=crypto.randomUUID();state.started=true;state.tab='map';state.energy=100;state.credits=50;state.items={energy_tonic:1,spirit_candle:0,ghost_lantern:0,lucky_charm:0};economySave();save();
  firstLaunch=true;
  toast('The town has been waiting for you.');
  render();
  setTimeout(()=>gameEvent('chapter'),350);
  requestLocation({recenter:true});
}
function setLocationPrompt(mode='ready'){
  const box=document.getElementById('gameLocationPrompt');
  if(!box)return;
  if(mode==='finding'){
    box.innerHTML='<button class="location-prompt-button" disabled>📍 Finding your location…</button>';
  }else if(mode==='denied'){
    box.innerHTML='<button class="location-prompt-button location-denied" onclick="showLocationHelp()">📍 Location denied — tap for help</button>';
  }else if(mode==='error'){
    box.innerHTML='<button class="location-prompt-button" onclick="requestLocation({recenter:true})">📍 Location unavailable — try again</button>';
  }else{
    box.innerHTML='<button class="location-prompt-button" onclick="requestLocation({recenter:true})">📍 Find my location</button>';
  }
}
function showLocationHelp(){
  const hud=document.getElementById('worldHud');
  if(!hud)return;
  hud.innerHTML='<div class="location-help"><div class="eyebrow">LOCATION NEEDED</div><h2>Let Hexham Adventure use your location</h2><p>Location access is currently blocked for this site.</p><p><b>On iPhone:</b> use Safari’s website settings for this site and change Location to <b>Allow</b>, then come back here and tap the button again.</p><button class="action" onclick="closeWorldHud();setLocationPrompt(\'ready\')">I’ve changed it — try again</button></div>';
  hud.classList.add('show');
}
function requestLocation({recenter=true}={}){
  if(!navigator.geolocation){toast('Location services are not available in this browser.');setLocationPrompt('error');return}
  setLocationPrompt('finding');
  navigator.geolocation.getCurrentPosition(p=>{
    setLocationPrompt('ready');
    updateLocation(p,recenter);startLocationWatch();
  },e=>{
    const msg=e.code===1?'Location was denied. Allow it for this site and try again.':e.code===2?'Your location could not be determined. Try again outdoors.':'Location took too long. Try again.';
    setLocationPrompt(e.code===1?'denied':'error');
    toast(msg);
  },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function checkProximityEvents(){
  const m=nearest();if(!m)return;
  const id=m.id,d=m.distance,stage=proximityStage[id]||0;
  if(d<200&&stage<1){proximityStage[id]=1;gameEvent('nearby',{message:id==='gaol'?'🕯️ Something is nearby.':'Something strange is close.'})}
  if(d<50&&stage<2){proximityStage[id]=2;gameEvent('close',{message:id==='gaol'?'The air just changed. Keep walking.':'You can feel it now.'})}
  if(d<20&&stage<3){proximityStage[id]=3;gameEvent('danger',{message:id==='gaol'?'⚠️ Something is here. Look around you.':'Something is watching.'})}
  checkGaolDiscovery();
}
function checkGaolDiscovery(){
  if(!state.position||state.progress.gaol>=3||state.progress.forum)return;
  const l=locations[0],zone=l.zones[state.progress.gaol];
  if(!zone)return;
  const d=distance(state.position,[zone.lat,zone.lng]);
  if(d<=18){
    playGaol(l);
  }
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
  checkProximityEvents();
  if(firstLaunch){firstLaunch=false;setTimeout(()=>showWorldMessage('Find the Old Gaol. Something escaped.',{silentEffects:true}),3200)}
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
  economyInit();const done=state.marley;
  return `<div class="panel"><section class="hero"><div class="eyebrow">CHAPTER 1 • HALLOWEEN</div><h1>${c.title}</h1><p>${c.intro}</p><button class="action" onclick="setTab('map')">Enter Hexham</button></section>
  <div class="storybar"><b>${done?'MARLEY FOUND':'Something is moving'}</b><span>${done?'You have discovered the first name in the story.':'Follow the disturbances. The town will reveal the rest.'}</span></div>
  <div class="section">Your investigation</div>
  <div class="missionrow"><span>⛓️ Old Gaol</span><b>${state.progress.gaol}/3 traces</b></div>
  <div class="missionrow"><span>🎬 Forum Cinema</span><b>${state.progress.forum?'Solved':'Locked'}</b></div>
  <div class="missionrow"><span>🎭 Queen's Hall</span><b>${state.progress.hall?'Heard':'Locked'}</b></div>
  <div class="card"><b>👤 ${state.player}</b><div class="muted">Live world: ${state.connected?'connected':'offline cache'}</div></div></div>`;
}
function mapTab(){
  const m=nearest();economyInit();
  return `<div class="game-panel game-screen">
    <div class="game-topbar">
      <div class="game-status"><span class="status-dot"></span><span id="proximity">${proximityText(m)}</span></div>
      <button class="game-locate" onclick="requestLocation({recenter:true})" aria-label="Find my location">⌖</button>
    </div>
    <button class="quest-objective" id="questObjective" onclick="focusObjective()">
      <span class="quest-icon">!</span><span><b id="questTitle">${currentObjective().title}</b><small id="questText">${currentObjective().text}</small></span><span class="quest-arrow">›</span>
    </button>
    <div class="game-location-prompt" id="gameLocationPrompt"><button onclick="requestLocation({recenter:true})">📍 Find my location</button></div>
    <div class="world-shell" id="worldShell">
      <div id="map" class="mapwrap"></div>
      <div class="world-vignette"></div>
      <div class="world-hud" id="worldHud"></div>
      <div class="world-whisper" id="worldWhisper">Move through Hexham. Watch for what doesn't belong.</div>
    </div>
    <div class="game-bottom">
      <button onclick="setTab('bag')" aria-label="Journal">📖</button>
      <div class="game-player">${state.player||'PLAYER'}</div>
      <button onclick="setTab('shop')" aria-label="Fezziwig's Market">🎩</button>
    </div>
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
  economyInit();
  const l=locations.find(x=>x.id===id);
  if(!l||!state.position||distance(state.position,[l.lat,l.lng])>40){toast('Move closer to the location.');return}
  if(state.energy<=0){toast('Your energy is empty. Find the glowing energy source.');return}if(id==='gaol')playGaol(l);
  if(id==='forum')playForum(l);
  if(id==='hall')playHall(l);
}
function playGaol(l){
  const next=l.zones[state.progress.gaol];
  if(!next){toast('The traces are gone. Something followed them.');spawnSpirit();return}
  const d=distance(state.position,[next.lat,next.lng]);
  if(d>18){showWorldMessage('The disturbance slips away. Keep searching this part of the Gaol.');pulseMap();return}
  state.progress.gaol+=1;spendEnergy(10);earnCredits(10);
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
  state.progress.hall=true;spendEnergy(12);earnCredits(20);save();addSpirit(l.spirit);activity('listen_audience',{location_id:l.id});
  showDiscovery('THE AUDIENCE','The applause grows louder. Then the crowd falls silent.');
  vibrate([50,80,50,180]);
  setTimeout(()=>revealMarley(),2200);
}
function revealMarley(){
  state.marley=true;save();
  showDiscovery('MARLEY','You found him. But he is not the one you are supposed to be looking for.');
  gameEvent('reveal');
  setTimeout(()=>{spawnSpirit();renderMapWorld()},1800);
}
function vibrate(pattern=[80]){
  if(navigator.vibrate)navigator.vibrate(pattern);
}
function showWorldMessage(message,options={}){
  const hud=document.getElementById('worldHud'), whisper=document.getElementById('worldWhisper');
  if(!hud)return toast(message);
  if(whisper)whisper.textContent=message;
  hud.innerHTML=`<div class="hud-message"><span>${message}</span></div>`;
  hud.classList.add('show');
  if(!options.silentEffects){gameSound('whisper');vibrate([35]);}
  clearTimeout(window.__hud);
  window.__hud=setTimeout(()=>{hud.classList.remove('show');updateWorldHud()},5000);
}
function showDiscovery(title,text){
  const hud=document.getElementById('worldHud');
  if(!hud)return toast(title+': '+text);
  hud.innerHTML=`<div class="discovery"><div class="eyebrow">DISCOVERY</div><h2>${title}</h2><p>${text}</p></div>`;
  hud.classList.add('show');
  gameEvent('discovery');
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
      setTimeout(()=>{if(out)out.textContent='No. Watch the memory again.';gameEvent('wrong')},300);
      return;
    }
    const l=locations.find(x=>x.id==='forum');
    state.progress.forum=true;spendEnergy(15);earnCredits(20);save();addSpirit(l.spirit);activity('solve_memory',{location_id:l.id});
    window.__memoryOrder=[];
    gameEvent('right');
    showDiscovery('THE EMPTY SEAT','The film continues. Someone is sitting in the empty seat.');
    setTimeout(()=>{showWorldMessage('⚠️ DON’T LET IT SEE YOU');spawnSpirit();renderMapWorld()},1500);
  }
}
function closeWorldHud(){window.__memoryOrder=[];const hud=document.getElementById('worldHud');if(hud){hud.classList.remove('show');updateWorldHud()}}
function renderMapWorld(){
  if(!mapInstance)return;
  updateWorldObjects();
  updateWorldHud();
}
function updateQuestObjective(){
  const o=currentObjective(),title=document.getElementById('questTitle'),text=document.getElementById('questText'),button=document.getElementById('questObjective');
  if(title)title.textContent=o.title;
  if(text)text.textContent=o.text;
  if(button)button.style.display=o.location?'flex':'none';
}
function updateWorldHud(){
  const hud=document.getElementById('worldHud'), whisper=document.getElementById('worldWhisper');
  updateQuestObjective();
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
  if(whisper)whisper.textContent=message;
}
function updateWorldObjects(){
  if(!mapInstance)return;
  worldObjectLayers.forEach(layer=>{try{mapInstance.removeLayer(layer)}catch(e){}});
  worldObjectLayers=[];
  const shell=document.getElementById('worldShell');
  if(shell)shell.dataset.spirit=state.spirit<40?'low':state.spirit>70?'high':'mid';
  // Landmarks are deliberately subtle: the map is the world, not a list of pins.
  locations.forEach(l=>{
    // Reveal the town one discovery at a time so the map feels like an adventure, not a checklist.
    if(l.id==='forum'&&!state.progress.gaol) return;
    if(l.id==='hall'&&!state.progress.forum) return;
    const type=l.id==='gaol'?'gaol':l.id==='forum'?'cinema':'hall';
    const icon=L.divIcon({className:'landmark-icon',html:`<div class="landmark"><span class="landmark-symbol">${svgIcon(type,l.name)}</span><small>${l.name.replace('Hexham ','')}</small></div>`,iconSize:[140,40],iconAnchor:[70,20]});
    const marker=L.marker([l.lat,l.lng],{icon,interactive:false}).addTo(mapInstance);
    worldObjectLayers.push(marker);
  });
  const marketIcon=L.divIcon({className:'landmark-icon',html:'<div class="landmark market-landmark"><span class="landmark-symbol">🎩</span><small>Fezziwig\'s Market</small></div>',iconSize:[160,42],iconAnchor:[80,21]});
  const marketMarker=L.marker([fezziwig.lat,fezziwig.lng],{icon:marketIcon}).addTo(mapInstance);
  marketMarker.on('click',()=>{state.tab='shop';render()});
  worldObjectLayers.push(marketMarker);
  const charge=chargingZone();
  const chargeIcon=L.divIcon({className:'disturbance-icon',html:'<div class="charge-zone" aria-label="Energy source"><span>⚡</span></div>',iconSize:[74,74],iconAnchor:[37,37]});
  const chargeMarker=L.marker([charge.lat,charge.lng],{icon:chargeIcon}).addTo(mapInstance);
  chargeMarker.on('click',()=>chargeEnergy());
  worldObjectLayers.push(chargeMarker);
  const zone=locations[0].zones[state.progress.gaol];
  if(zone&&!state.progress.forum){
    // Keep every Old Gaol investigation point on the Hallgate/public-facing side.
    // Do not send players behind the building or onto private property.
    const pos=[zone.lat,zone.lng];
    const icon=L.divIcon({className:'disturbance-icon',html:entityIcon('disturbance','Supernatural disturbance'),iconSize:[64,64],iconAnchor:[32,32]});
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
    const icon=L.divIcon({className:'player-icon',html:entityIcon('player','Your player position'),iconSize:[38,38],iconAnchor:[19,19]});
    meMarker=L.marker(state.position,{icon,interactive:false}).addTo(mapInstance);
  }
}
function spawnSpirit(){
  if(!mapInstance)return;
  gameEvent('danger');
  const path=[[54.97130,-2.100100],[54.97160,-2.100700],[54.97188,-2.101300],[54.97060,-2.102600],[54.96940,-2.10330]];
  let i=0;
  if(spiritTimer)clearInterval(spiritTimer);
  if(spiritMarker){try{mapInstance.removeLayer(spiritMarker)}catch(e){}}
  const icon=L.divIcon({className:'spirit-icon',html:entityIcon('ghost','Wandering spirit'),iconSize:[56,56],iconAnchor:[28,28]});
  spiritMarker=L.marker(path[0],{icon,interactive:false}).addTo(mapInstance);
  spiritTimer=setInterval(()=>{
    i=(i+1)%path.length;
    spiritMarker.setLatLng(path[i]);
    showWorldMessage('👻 Something moved.',{silentEffects:true});
    gameSound('whisper');
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
  economyLoad();
  // Leaflet is bound to a specific DOM element. Our screens are re-rendered,
  // so an old map instance must be destroyed before replacing #app.
  destroyMap();
  document.body.classList.toggle('in-game',state.tab==='map'&&state.started);
  updateHeader();
  app.innerHTML=state.tab==='home'?home():state.tab==='map'?mapTab():state.tab==='bag'?bag():state.tab==='shop'?shop():events();
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
  if(state.tab==='map')setTimeout(initMap,0);
  if(state.tab==='map')setTimeout(updateProximity,30);
}
function notifications(){
  if(!('Notification' in window)){toast('Notifications are not supported here.');return}
  Notification.requestPermission().then(r=>{state.notificationOptIn=r==='granted';save();toast(r==='granted'?'🔔 Notifications enabled.':'Notifications not enabled.')});
}
window.setTab=setTab;window.startAdventure=startAdventure;window.chargeEnergy=chargeEnergy;window.buyItem=buyItem;window.requestLocation=requestLocation;window.focusObjective=focusObjective;window.showLocationHelp=showLocationHelp;window.playLocation=playLocation;window.notifications=notifications;window.memoryPick=memoryPick;window.closeWorldHud=closeWorldHud;

(async function boot(){
  render();
  await loadWorld({silent:true});
  if(state.started){render();activity('session_start',{chapter:state.chapter})}
})();
