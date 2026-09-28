// Hexham Adventure — location content
// Game content lives here so new locations can be added without changing engine logic.

export const locations = [
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
