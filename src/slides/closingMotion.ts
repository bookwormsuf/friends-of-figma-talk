/** Motion for the closing animation on slide 4:140. Pure: same inputs, same poses. See docs/closing-animation-spec.md.
 * One number, p, runs the whole thing. 0 is the slide's words alone. 0 to 1 is press one: the words leave, the swarm rises, parts into a ring and the centre cloud glows.
 * 1 to 2 is press two: the centre cloud shrinks to a blob, reshapes into a spark and the spark glows. Going back is the same function with p running down.
 * This is the calm ending Sufyan picked. The energetic and playful ones are kept in docs/explorations/closing-three-variations. */
export type ClosingConfig={others:number;small:number;centre:number;seconds:[number,number];ring:{x:number;y:number;inner:number;outer:number};riseFrom:number;wordsLeave:number;sparkAspect:number;blob:number;spread:{cloud:number;spark:number};speed:number};
/** Every timing and size for the closing animation lives here. Positions and widths are stage percent. These are the values Sufyan settled on with the dials on 15 November 2026.
 * In editor mode (?editor) the dial panel in Closing.tsx writes into this object, so the values below are the defaults. */
export const closingConfig:ClosingConfig={
 /** Clouds other than the centre one. */
 others:25,
 /** Width of each small cloud, as a share of stage width. */
 small:9.5,
 /** Width of the centre cloud and of the spark it becomes. */
 centre:17.5,
 /** Seconds for press one and press two. */
 seconds:[9.3,5.3],
 /** The ring the other clouds settle on. x is percent of stage width, y of stage height. Clouds alternate between an inner and an outer lane, as shares of that radius, so neighbours never bunch up. */
 ring:{x:38,y:39.5,inner:.85,outer:1.1},
 /** How far below their swarm spot the clouds start, in percent of stage height. */
 riseFrom:95,
 /** The share of press one the words take to float off the top. The clouds start rising as they go.*/
 wordsLeave:.15,
 /** The spark's height over its width. Below 1 makes it a wide oval. */
 sparkAspect:.64,
 /** How small the centre shape gets when it is a blob, halfway through the reshape, as a share of its full width. */
 blob:.35,
 /** How wide the glow spreads, 0 to 1 of the stage, for the cloud and for the spark. */
 spread:{cloud:.56,spark:1},
 /** Editor only: plays everything faster (above 1) or slower. */
 speed:1,
};
export type CloudPose={x:number;y:number;rotation:number;scale:number;visible:boolean};
export type ClosingState={
 /** 0 the words are in place, 1 they have floated off the top. */
 words:number;
 others:CloudPose[];
 /** The centre object. x, y and width are stage percent. reshape runs 0 cloud, 0.5 small round blob, 1 spark. */
 centre:{x:number;y:number;width:number;reshape:number;visible:boolean};
 /** cloud and spark are how strongly each colour glows. spread is how wide the glow reaches, 0 to 1 of the stage. */
 glow:{cloud:number;spark:number;spread:number};
 /** 0 to 1: how much warm light from the spark falls on the ring. */
 tint:number;
};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(t:number)=>t*t*t*(t*(t*6-15)+10);
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const span=(p:number,a:number,b:number)=>clamp01((p-a)/(b-a));
const easeIn=(t:number)=>t*t*t;
/** 0 to 1 in two eased halves with a rest in the middle, so the blob at 0.5 is seen before the spark comes out. */
const viaBlob=(t:number)=>t<.5?.5*smooth(t*2):.5+.5*smooth(t*2-1);
/** Stable 0 to 1 number for cloud i and purpose k. */
const rnd=(i:number,k:number)=>{const s=Math.sin(i*127.1+k*311.7)*43758.5453;return s-Math.floor(s)};
const TAU=Math.PI*2,GOLDEN=2.399963;
/** Where each cloud sits in the swarm and on the ring. The swarm is a loose spiral with no outline. Each cloud's ring spot is straight out from its swarm spot, so paths do not cross. */
function spots(){
 const n=closingConfig.others,small=closingConfig.small;
 // Swarm radius grows with the clouds and their number, so they overlap about the same amount whatever the dials say. y is stretched by 16:9 so the swarm is round on screen.
 const rx=small*1.15*Math.sqrt(n/13),ry=rx*16/9;
 const angles=Array.from({length:n},(_,i)=>(i*GOLDEN+.6)%TAU);
 const order=angles.map((a,i)=>[a,i] as const).sort((a,b)=>a[0]-b[0]).map(([,i])=>i);
 const rank=new Array<number>(n);order.forEach((i,r)=>{rank[i]=r});
 return angles.map((a,i)=>{
  const r=Math.sqrt((i+.35)/n);
  const ringAngle=(rank[i]+.5)/n*TAU+(rnd(i,1)-.5)*.08,reach=(rank[i]%2?closingConfig.ring.inner:closingConfig.ring.outer)+(rnd(i,2)-.5)*.05;
  return{
   swarm:{x:50+Math.cos(a)*r*rx,y:50+Math.sin(a)*r*ry},
   ring:{x:50+Math.cos(ringAngle)*closingConfig.ring.x*reach,y:50+Math.sin(ringAngle)*closingConfig.ring.y*reach},
   rank:rank[i],
   lean:(rnd(i,3)-.5)*.5,
  };
 });
}
// Worked out once per arrangement. The key holds everything the spots depend on, so a dial change rebuilds them.
let spotKey='',spotList:ReturnType<typeof spots>=[];
const spotsOf=()=>{const r=closingConfig.ring,key=[closingConfig.others,closingConfig.small,r.x,r.y,r.inner,r.outer].join('|');if(key!==spotKey){spotList=spots();spotKey=key}return spotList};
/** Everything on stage at p. */
export function closingState(p:number):ClosingState{
 const u=clamp01(p),q=clamp01(p-1),C=closingConfig;
 const words=easeIn(span(u,0,C.wordsLeave));
 const others:CloudPose[]=spotsOf().map((s,i)=>{
  // Rise: from below the stage to the swarm.
  const riseStart=.07+rnd(i,4)*.1,rt=span(u,riseStart,riseStart+.34),rise=smooth(rt);
  // Part: from the swarm out to the ring, the whole swarm together with only a slight ripple.
  const partStart=.52+s.rank*.08/C.others,part=smooth(span(u,partStart,partStart+.3));
  const x=mix(mix(s.swarm.x+(s.swarm.x-50)*.5,s.swarm.x,rise),s.ring.x,part);
  const y=mix(mix(s.swarm.y+C.riseFrom,s.swarm.y,rise),s.ring.y,part);
  return{x,y,rotation:s.lean*(1-rise)+s.lean*.35*part,scale:mix(1,.92,part),visible:rt>0};
 });
 // The centre cloud rises with the swarm, hidden behind it, then grows once the others part.
 const centreRise=smooth(span(u,.07,.42)),grow=smooth(span(u,.56,.84));
 // Press two: the cloud melts down to a small blob, rests, then pushes out into the spark.
 const reshape=viaBlob(span(q,.02,.7));
 const cloudGlowIn=smooth(span(u,.8,1));
 // As the shape turns, the cloud's colour hands over to the spark's.
 const warm=q<=0?0:smooth(span(q,.3,.75)),sparkGlowIn=q<=0?0:smooth(span(q,.55,1));
 return{
  words,
  others,
  centre:{x:50,y:mix(50+C.riseFrom,50,centreRise),width:mix(C.small,C.centre,grow)*(1-(1-C.blob)*Math.sin(Math.PI*reshape)**2),reshape,visible:centreRise>0},
  glow:{cloud:cloudGlowIn*(1-warm),spark:q<=0?0:Math.max(warm*.55,sparkGlowIn),spread:mix(mix(.15,C.spread.cloud,cloudGlowIn),C.spread.spark,sparkGlowIn)},
  tint:clamp01(sparkGlowIn),
 };
}
/** Moves p towards the step the presenter is on. delta is seconds since the last frame. Never a subtraction from a global clock.
 * If the presenter presses again before a press has finished, p hurries through what is left of it. */
export function advanceClosing(p:number,step:number,delta:number):number{
 const to=Math.max(0,Math.min(2,step));if(p===to)return p;
 const d=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05),[one,two]=closingConfig.seconds;
 const forward=to>p,inPressOne=forward?p<1:p<=1,hurry=Math.abs(to-p)>1?4:1;
 const rate=hurry*Math.max(.05,closingConfig.speed)/(inPressOne?one:two);
 // Stop at the boundary between the two presses for one frame, so each side runs at its own speed.
 const limit=forward?(p<1?Math.min(to,1):to):(p>1?Math.max(to,1):to);
 return forward?Math.min(limit,p+d*rate):Math.max(limit,p-d*rate);
}
