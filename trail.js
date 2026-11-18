import {stops,themes} from './trail-content.js';
const root=document.getElementById('content');

// Gentle snowfall is decorative only and respects the device motion preference.
function createAtmosphere(){
 const layer=document.getElementById('atmosphere');
 if(!layer||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(let i=0;i<34;i++){
  const flake=document.createElement('i');flake.className='snowflake';
  const size=(Math.random()*3+2).toFixed(1)+'px';
  flake.style.setProperty('--x',(Math.random()*100).toFixed(2)+'%');
  flake.style.setProperty('--size',size);
  flake.style.setProperty('--opacity',(Math.random()*.55+.18).toFixed(2));
  flake.style.setProperty('--duration',(Math.random()*13+12).toFixed(1)+'s');
  flake.style.setProperty('--delay',(-Math.random()*24).toFixed(1)+'s');
  flake.style.setProperty('--drift',(Math.random()*100-50).toFixed(0)+'px');
  layer.appendChild(flake);
 }
}
createAtmosphere();

const spiritForTheme={
 'Christmas Past':{icon:'🕯️',name:'The Ghost of Christmas Past',line:'A memory is stirring. Follow the little lights.'},
 'Christmas Present':{icon:'♥',name:'The Ghost of Christmas Present',line:'A little kindness can warm the coldest night.'},
 'Christmas Together':{icon:'🔔',name:'The Spirit of Christmas Together',line:'Listen closely. The town is beginning to sing.'},
 "Hexham's Christmas Message":{icon:'👻',name:'Jacob Marley',line:'The message is taking shape. Keep every piece safe.'},
 'Christmas Yet to Come':{icon:'✦',name:'The Ghost of Christmas Yet to Come',line:'The future is waiting. Your choices still matter.'}
};
function spiritStage(theme){
 const spirit=spiritForTheme[theme]||spiritForTheme['Christmas Past'];
 return '<div class="spirit-stage"><div class="spirit-figure" aria-hidden="true">'+spirit.icon+'</div><div class="spirit-stage-copy"><b>'+safe(spirit.name)+'</b><span>'+safe(spirit.line)+'</span></div></div>';
}
const path=decodeURIComponent(location.pathname);
const match=path.match(/\/trail\/(\d{1,2})\/?$/);
const stop=match?stops.find(s=>s.id===Number(match[1])):null;
const pad=n=>String(n).padStart(2,'0');
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderHome(){
 document.title='The Lost Spirit of Christmas | Hexham Christmas Trail';
 root.innerHTML='<section class="story-card"><div class="stop-kicker">A warning from Jacob Marley</div><h2>Christmas is slipping away</h2><p>“The three Spirits have lost the things that make Christmas magical. If they cannot recover them, Scrooge may never learn what Christmas truly means. The people of Hexham must help.”</p></section><h2 class="section-title">The five parts of the story</h2>'+themes.map(t=>{
 const group=stops.filter(s=>s.theme===t.name);
 return '<section class="theme-card"><div class="theme-head"><div class="theme-icon">'+t.icon+'</div><div><h3>'+safe(t.name)+'</h3><p>'+safe(t.subtitle)+'</p></div></div><div class="stop-list">'+group.map(s=>'<a class="stop-link" href="/trail/'+pad(s.id)+'"><span class="stop-no">'+pad(s.id)+'</span><span class="stop-name">'+safe(s.shop)+'</span><span class="stop-arrow">›</span></a>').join('')+'</div></section>';
 }).join('')+'<section class="paper-note"><strong>One last mystery</strong><br>Five windows hold five pieces of a message from Hexham. Keep collecting the words on your paper trail. Only when they are brought together will the message be complete.</section>';
}
function renderStop(s){
 document.title=s.shop+' · Stop '+pad(s.id)+' | The Lost Spirit of Christmas';
 const index=stops.findIndex(x=>x.id===s.id),prev=stops[index-1],next=stops[index+1];
 root.innerHTML='<a class="backlink" href="/">← Back to the trail</a><section class="hero"><div class="lantern">'+s.icon+'</div><div class="eyebrow">Hexham Christmas · Window '+pad(s.id)+'</div><h1>The Lost Spirit <span>of Christmas</span></h1><div class="rule"></div><p>'+safe(s.theme)+' · '+safe(s.themeLine)+'</p></section>'+spiritStage(s.theme)+'<section class="story-card"><div class="stop-kicker">A moment in the story · Stop '+pad(s.id)+'</div><h2>'+safe(s.storyTitle)+'</h2><p>'+safe(s.story)+'</p><div class="stop-display">Look for: '+safe(s.display)+'</div><div class="challenge"><b>Your window challenge</b>'+safe(s.challenge)+'</div><p class="keep-paper">Keep your answer on your printed trail sheet. This website is here to add a little more magic, not replace your paper trail.</p><div class="symbol-panel"><span class="symbol">'+s.icon+'</span><span><b>Part of your collection</b><span>'+safe(s.symbol)+'</span></span></div></section>'+(s.id>=15&&s.id<=19?'<section class="paper-note"><strong>Hexham’s Christmas message</strong><br>This is one of five pieces. Write the word or phrase from the window onto your paper trail and keep collecting until the message makes sense.</section>':'')+'<div class="navrow">'+(prev?'<a class="btn secondary" href="/trail/'+pad(prev.id)+'">Previous window</a>':'<a class="btn secondary" href="/">All windows</a>')+(next?'<a class="btn" href="/trail/'+pad(next.id)+'">Next window →</a>':'<a class="btn" href="/">Finish</a>')+'</div>';
}
if(stop)renderStop(stop);else renderHome();
