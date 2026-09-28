// Hexham Adventure — content-driven game engine
// Pure game logic: no DOM, Leaflet or Supabase dependencies.

 export function createGameEngine({missions = MISSIONS} = {}) {
  const listeners = new Set();
  const content = missions || {};
  let currentMissionId = 'spiritsAwaken';

  function mission(){
    return content[currentMissionId] || Object.values(content)[0];
  }

  function progressFor(state){
    const p = state?.progress || {};
    return {
      gaol: Number(p.gaol || 0),
      forum: Boolean(p.forum),
      hall: Boolean(p.hall),
      marley: Boolean(state?.marley)
    };
  }

  function getCurrentObjective(state){
    const m = mission();
    const p = progressFor(state);

    if (p.marley) return m.objectives.find(o=>o.id==='marley');
    if (p.hall) return {id:'world',type:'world',title:'Something has changed',location:null,text:'Watch the town.'};
    if (p.forum) return m.objectives.find(o=>o.id==='hall');
    if (p.gaol >= 3) return m.objectives.find(o=>o.id==='forum');
    return m.objectives.find(o=>o.id==='gaol');
  }

  function emit(type, payload = {}){
    const event = {type, payload, timestamp:Date.now()};
    listeners.forEach(fn=>fn(event));
    return event;
  }

  return {
    mission,
    getCurrentObjective,
    emit,
    on(fn){
      listeners.add(fn);
      return ()=>listeners.delete(fn);
    },
    snapshot(state){
      return {
        mission: mission().id,
        chapter: state?.chapter || mission().chapter,
        objective: getCurrentObjective(state)
      };
    }
  };
}
