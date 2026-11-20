/** Stable, sparse stars, with slide-specific positions around the content margins. */
export function starfield(key:string){
 let state=2166136261;for(const c of key)state=Math.imul(state^c.charCodeAt(0),16777619);
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 return Array.from({length:3+Math.floor(random()*3)},(_,i)=>{
  const edge=i%4,a=5+random()*90,b=5+random()*10;
  return{x:edge===0?a:edge===1?100-b:edge===2?a:b,y:edge===0?b:edge===1?a:edge===2?100-b:a,size:7+random()*10,opacity:.45+random()*.4};
 });
}
