import {stops,themes} from './trail-content.js';
const root=document.getElementById('content');
const path=decodeURIComponent(location.pathname);
const match=path.match(/\/trail\/(\d{1,2})\/?$/);
const stop=match?stops.find(s=>s.id===Number(match[1])):null;
const pad=n=>String(n).padStart(2,'0');
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// A little snowfall, with motion disabled when the visitor asks for it.
function createAtmosphere(){
 const layer=document.getElementById('atmosphere');
 if(!layer||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(let i=0;i<28;i++){
  const f=document.createElement('i');f.className='snowflake';
  f.style.setProperty('--x',(Math.random()*100)+'%');
  f.style.setProperty('--size',(Math.random()*3+2)+'px');
  f.style.setProperty('--opacity',(Math.random()*.5+.15).toFixed(2));
  f.style.setProperty('--duration',(Math.random()*13+12)+'s');
  f.style.setProperty('--delay',(-Math.random()*24)+'s');
  f.style.setProperty('--drift',(Math.random()*100-50)+'px');layer.appendChild(f);
 }
}
createAtmosphere();

const spiritForTheme={
 'Christmas Past':{icon:'🕯️',name:'The Ghost of Christmas Past',line:'Follow the little lights.'},
 'Christmas Present':{icon:'♥',name:'The Ghost of Christmas Present',line:'Kindness brings warmth.'},
 'Christmas Together':{icon:'🔔',name:'The Spirit of Christmas Together',line:'Listen for the bells.'},
 "Hexham's Christmas Message":{icon:'⛓️',name:'Jacob Marley',line:'The old chains are loosening.'},
 'Christmas Yet to Come':{icon:'✦',name:'The Ghost of Christmas Yet to Come',line:'The future is yours to shape.'}
};
function illustration(theme){
 const art={
 'Christmas Past':['#e2c987','#a95b3d','<path d="M92 126h176v12H92z" fill="#8b6947"/><path d="M122 126V70l58-37 58 37v56z" fill="#294536"/><path d="M143 126V82h74v44" fill="#e9d9b6"/><path d="M171 126V91h18v35" fill="#8f2f2b"/><circle cx="180" cy="65" r="17" fill="#e2c987" opacity=".35" class="glow"/><path d="M180 48c-8 13-8 22 0 27 8-5 8-14 0-27" fill="#f4d77e"/>'],
 'Christmas Present':['#e7c46c','#8f2f2b','<path d="M92 125h176v13H92z" fill="#8b6947"/><rect x="125" y="77" width="110" height="48" rx="4" fill="#8f2f2b"/><path d="M180 77v48M125 93h110" stroke="#e2c987" stroke-width="7"/><path d="M180 77c-38-5-35-39-12-35 12 2 12 20 12 35 0-15 0-33 12-35 23-4 26 30-12 35" fill="#e2c987"/><path d="M180 49c-26-20-46 6 0 29 46-23 26-49 0-29" fill="#e2c987" class="float"/>'],
 'Christmas Together':['#e2c987','#8f2f2b','<path d="M92 126h176v12H92z" fill="#8b6947"/><path d="M116 126V75h128v51" fill="#294536"/><path d="M137 75q43-55 86 0" fill="none" stroke="#e2c987" stroke-width="5"/><g fill="#e2c987"><circle cx="137" cy="75" r="8"/><circle cx="180" cy="47" r="8"/><circle cx="223" cy="75" r="8"/></g><path d="M180 74v47m-15-32h30l-4 24h-22z" fill="#d6b45f" stroke="#8f2f2b" stroke-width="3"/>'],
 "Hexham's Christmas Message":['#c9a45b','#8f2f2b','<path d="M92 126h176v12H92z" fill="#8b6947"/><g fill="none" stroke="#c9a45b" stroke-width="9"><path d="M137 77c-22-25 12-48 31-22 19 26-15 49-31 22z"/><path d="M180 77c-22-25 12-48 31-22 19 26-15 49-31 22z"/><path d="M158 104c-22-25 12-48 31-22 19 26-15 49-31 22z"/></g><path d="M112 36l8 8m-8 0 8-8M238 40l7 7m-7 0 7-7" stroke="#f7e7b7" stroke-width="2"/>'],
 'Christmas Yet to Come':['#d7e1e2','#7d8e91','<path d="M92 126h176v12H92z" fill="#8b6947"/><path d="M180 24l13 35 37 2-29 23 10 36-31-21-31 21 10-36-29-23 37-2z" fill="#e2c987" class="float"/><circle cx="180" cy="75" r="58" fill="#e2c987" opacity=".13" class="glow"/><path d="M120 126q60-50 120 0" fill="none" stroke="#f7f1e5" stroke-width="7" stroke-linecap="round"/>']
 };
 const a=art[theme]||art['Christmas Past'];
 return '<div class="story-illustration" aria-hidden="true"><svg viewBox="0 0 360 160" role="img"><circle cx="180" cy="72" r="66" fill="'+a[0]+'" opacity=".1" class="glow"/><path d="M40 138h280" stroke="#c9a45b" stroke-width="2"/>'+a[2]+'<g fill="#e2c987"><path d="M60 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M294 42l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g></svg></div>';
}
function spiritStage(theme){
 const spirit=spiritForTheme[theme]||spiritForTheme['Christmas Past'];
 return '<div class="spirit-stage"><div class="spirit-figure" aria-hidden="true">'+spirit.icon+'</div><div class="spirit-stage-copy"><b>'+safe(spirit.name)+'</b><span>'+safe(spirit.line)+'</span></div></div>';
}
function completedPuzzles(){try{return JSON.parse(localStorage.getItem('hexham-stop-puzzles')||'[]')}catch(e){return []}}
function savePuzzle(id){try{const a=completedPuzzles();if(!a.includes(id)){a.push(id);localStorage.setItem('hexham-stop-puzzles',JSON.stringify(a))}}catch(e){}}
const puzzleTypes=[
 {title:'Match the memories',intro:'Turn over the cards and find the matching pairs.',icon:'🕯️',kind:'memory'},
 {title:'A little kindness',intro:'Find three hidden hearts among the parcels.',icon:'♥',kind:'hearts'},
 {title:'Ring the bells',intro:'Listen to the pattern, then play it back.',icon:'🔔',kind:'bells'},
 {title:'Untangle the chains',intro:'Tap the links in the right order to free Marley.',icon:'⛓️',kind:'chains'},
 {title:'The snowy path',intro:'Find the way through the snow, one turn at a time.',icon:'✦',kind:'path'},
 {title:'Find the odd one out',intro:'One of these Christmas things does not belong. Can you spot it?',icon:'🎄',kind:'odd'},
 {title:'Put the stars in order',intro:'Tap the stars from the smallest number to the largest.',icon:'⭐',kind:'order'},
 {title:'Finish the pattern',intro:'Look carefully, then choose what comes next.',icon:'🎁',kind:'pattern'}
];
function puzzleForStop(s){return puzzleTypes[(s.id-1)%puzzleTypes.length]}
function puzzleMarkup(s){
 const p=puzzleForStop(s);
 return '<section class="puzzle-card" id="puzzle" data-stop="'+s.id+'"><div class="puzzle-top"><div class="puzzle-badge">'+p.icon+'</div><div><div class="stop-kicker">A little extra mystery · Stop '+pad(s.id)+'</div><h3>'+p.title+'</h3></div></div><p>'+p.intro+'</p><div class="puzzle-board" id="puzzle-board"></div>'+(p.kind==='bells'?'<button type="button" class="btn secondary" id="play-bell-pattern">▶ Hear the bell pattern</button>':'')+'<div class="puzzle-progress"><span id="puzzle-progress"></span></div><div class="puzzle-feedback" id="puzzle-feedback" aria-live="polite"></div><div id="puzzle-result"></div></section>';
}
function setupPuzzle(s){
 const board=document.getElementById('puzzle-board');if(!board)return;
 const feedback=document.getElementById('puzzle-feedback'),progress=document.getElementById('puzzle-progress'),result=document.getElementById('puzzle-result');
 const p=puzzleForStop(s),done=completedPuzzles().includes(s.id);
 const say=t=>feedback.textContent=t,update=(n,total)=>progress.style.width=(n/total*100)+'%';
 function finish(message){savePuzzle(s.id);board.innerHTML='';progress.style.width='100%';result.innerHTML='<div class="puzzle-complete">✦ '+message+'<br><strong>You found a little piece of Christmas magic.</strong></div>';feedback.textContent=''}
 if(done){finish('You have already solved this little mystery.');return}
 function tile(label,aria){const b=document.createElement('button');b.type='button';b.className='puzzle-tile';b.textContent=label;b.setAttribute('aria-label',aria||label);board.appendChild(b);return b}
 if(p.kind==='memory'){
  const deck=['🕯️','🎄','⭐','⭐','🕯️','🎄'];let first=null,matched=0,locked=false;
  deck.forEach((v,i)=>{const b=tile('?','Memory card '+(i+1));b.addEventListener('click',()=>{if(locked||b.classList.contains('done')||b===first)return;b.textContent=v;b.classList.add('selected');if(!first){first=b;return}if(first.textContent===v){first.classList.remove('selected');first.classList.add('done');b.classList.remove('selected');b.classList.add('done');matched++;first=null;update(matched,3);if(matched===3)finish('The memories have returned.')}else{locked=true;const old=first;first=null;setTimeout(()=>{old.textContent='?';b.textContent='?';old.classList.remove('selected');b.classList.remove('selected');locked=false},650)}})});
 }else if(p.kind==='hearts'){
  let n=0;['♥','🎁','♥','⭐','♥'].forEach((v,i)=>{const b=tile('🎁','Wrapped Christmas present '+(i+1));b.addEventListener('click',()=>{if(b.disabled)return;b.disabled=true;if(v==='♥'){b.textContent='♥';b.classList.add('done');n++;update(n,3);say(['A little kindness.','The warmth is returning.','One more for the spirit.'][n-1]);if(n===3)finish('The golden hearts are glowing again.')}else{b.textContent=v;b.classList.add('selected');say('Not this one. Keep looking.')}})});
 }else if(p.kind==='bells'){
  const seq=[2,1,0],notes=[392,494,587];let n=0;
  async function tone(freq,when,duration=.32){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=setupPuzzle.audioContext||(setupPuzzle.audioContext=new AC());if(ctx.state==='suspended')await ctx.resume();if(when<=0)when=ctx.currentTime+.01;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(.18,when+.025);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(when);osc.stop(when+duration+.03)}
  const play=document.getElementById('play-bell-pattern');if(play)play.addEventListener('click',()=>{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=setupPuzzle.audioContext||(setupPuzzle.audioContext=new AC());if(ctx.state==='suspended')ctx.resume();say('Listen carefully, then repeat the three notes.');seq.forEach((idx,k)=>tone(notes[idx],ctx.currentTime+.2+k*.62))});
  ['Low','Middle','High'].forEach((label,i)=>{const b=tile('🔔',label+' bell');b.addEventListener('click',()=>{tone(notes[i],0);if(i===seq[n]){b.classList.add('done');n++;update(n,3);say('That’s the note. Keep going…');if(n===3)finish('The bells are ringing together.')}else{n=0;update(0,3);board.querySelectorAll('.puzzle-tile').forEach(x=>x.classList.remove('done'));say('Not quite. Listen and try again.')}})});
 }else if(p.kind==='chains'){
  let n=0;['I','II','III'].forEach((v,i)=>{const b=tile('⛓','Chain link '+v);b.addEventListener('click',()=>{if(i===n){b.classList.add('done');b.textContent='✦';n++;update(n,3);say('A link falls away…');if(n===3)finish('Marley’s chains have fallen.')}else{n=0;update(0,3);board.querySelectorAll('.puzzle-tile').forEach(x=>{x.classList.remove('done');x.textContent='⛓'});say('The links are tangled. Start again.')}})});
 }else if(p.kind==='path'){
  const route=['←','↓','→'];let n=0;['←','↑','↓','→'].forEach(v=>{const b=tile(v,'Move '+v);b.addEventListener('click',()=>{if(v===route[n]){n++;update(n,3);b.classList.add('done');say('The path is opening…');if(n===3)finish('You found the path to a brighter morning.')}else{n=0;update(0,3);board.querySelectorAll('.puzzle-tile').forEach(x=>x.classList.remove('done'));say('A dead end. Try another way.')}})});
 }else if(p.kind==='odd'){
  const options=['🎄','🎁','⭐','☂️'];options.forEach((v,i)=>{const b=tile(v,'Christmas picture '+(i+1));b.addEventListener('click',()=>{if(i===3){b.classList.add('done');finish('Well spotted. The umbrella does not belong.')}else{say('That one belongs to Christmas. Have another look.')}})});
 }else if(p.kind==='order'){
  const nums=[3,1,4,2];let n=1;nums.forEach(v=>{const b=tile('★ '+v,'Star number '+v);b.addEventListener('click',()=>{if(b.disabled)return;if(v===n){b.disabled=true;b.classList.add('done');n++;update(n-1,4);say('That’s right. Keep going…');if(n===5)finish('The stars are in their proper order.')}else{n=1;update(0,4);board.querySelectorAll('.puzzle-tile').forEach(x=>{x.disabled=false;x.classList.remove('done')});say('Not quite. Start with the smallest number.')}})});
 }else{
  const options=['🎄','🎁','🎄','⭐'];options.forEach((v,i)=>{const b=tile(v,'Pattern choice '+(i+1));b.addEventListener('click',()=>{if(i===1){b.classList.add('done');finish('The pattern is complete.')}else say('Look at the repeating pattern: tree, present, tree…')})});
 }
}
function renderHome(){
 document.title='The Lost Spirit of Christmas | Hexham Christmas Trail';
 const done=completedPuzzles();
 root.innerHTML='<section class="story-card"><div class="stop-kicker">A message from Jacob Marley</div><h2>Something is missing…</h2><div class="home-illustration">'+illustration("Hexham's Christmas Message")+'</div><p>Three spirits. Five mysteries. Twenty-four windows. Help bring Christmas back to Hexham.</p></section><h2 class="section-title">Choose a chapter</h2>'+themes.map(t=>{
 const group=stops.filter(s=>s.theme===t.name),complete=group.every(s=>done.includes(s.id));
 return '<section class="theme-card"><div class="theme-head"><div class="theme-icon">'+t.icon+'</div><div><h3>'+safe(t.name)+'</h3><p>'+group.length+' windows · '+(complete?'All puzzles solved':done.filter(id=>group.some(s=>s.id===id)).length+' of '+group.length+' puzzles solved')+'</p></div></div><div class="stop-list">'+group.map(s=>'<a class="stop-link" href="/trail/'+pad(s.id)+'"><span class="stop-no">'+pad(s.id)+'</span><span class="stop-name">'+safe(s.shop)+'</span><span class="stop-arrow">›</span></a>').join('')+'</div></section>';
 }).join('')+'<div class="paper-note"><strong>Keep your paper trail close.</strong> The five-part message is only revealed by the printed trail.</div>';
}
function renderStop(s){
 document.title=s.shop+' · Stop '+pad(s.id)+' | The Lost Spirit of Christmas';
 const index=stops.findIndex(x=>x.id===s.id),prev=stops[index-1],next=stops[index+1];
 const first=s.story.split(/[.!?]/)[0]+'.';
 root.innerHTML='<a class="backlink" href="/">← All chapters</a><section class="hero"><div class="lantern">'+s.icon+'</div><div class="eyebrow">Window '+pad(s.id)+' · Hexham</div><h1>'+safe(s.shop)+'</h1><div class="rule"></div><p class="hero-copy">'+safe(s.theme)+'</p>'+illustration(s.theme)+'</section>'+spiritStage(s.theme)+'<section class="story-card"><div class="stop-kicker">'+safe(s.storyTitle)+'</div><h2>'+safe(first)+'</h2><p class="story-long">'+safe(s.story)+'</p><div class="stop-display">Look for: '+safe(s.display)+'</div><div class="challenge"><b>Paper trail challenge</b>'+safe(s.challenge)+'</div><div class="symbol-panel"><span class="symbol">'+s.icon+'</span><span><b>Clue collected</b><span>'+safe(s.symbol)+'</span></span></div></section>'+puzzleMarkup(s)+'<div class="navrow">'+(prev?'<a class="btn secondary" href="/trail/'+pad(prev.id)+'">Previous</a>':'<a class="btn secondary" href="/">All windows</a>')+(next?'<a class="btn" href="/trail/'+pad(next.id)+'">Next window →</a>':'<a class="btn" href="/">Finish</a>')+'</div>';
 setupPuzzle(s);
}
if(stop)renderStop(stop);else renderHome();
