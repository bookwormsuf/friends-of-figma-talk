/** Motion for the submarine on slide 4:127, a candidate to replace the drill. Pure: same inputs, same pose.
 * Three candidate dives, compared with ?sub=1, 2 or 3:
 * 1 arc: the submarine sets off level, then noses over and dives off the bottom right.
 * 2 corkscrew: it spirals down around the spot it started from, turning as it goes, the mirror of the rocket's spiral up.
 * 3 sink: it stays level and sinks straight down, rocking gently and sending out sonar rings, then tips its nose and drops away. */
export type SubVariation=1|2|3;
/** Where the dive starts and how far it has to go, in stage world units. size is how far below the bottom edge the centre must end so the whole submarine is off stage. */
export type Dive={x0:number;y0:number;bottom:number;size:number};
/** pitch tilts the nose up (positive) or down. yaw turns the submarine about its upright axis: 0 faces right, a quarter turn faces away from the audience. */
export type SubPose={x:number;y:number;z:number;pitch:number;yaw:number};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(t:number)=>t*t*(3-2*t);
const TAU=Math.PI*2;
/** Seconds each dive takes, bead to gone. */
export const subSeconds:Record<SubVariation,number>={1:2.8,2:3.8,3:4.7};
/** When each sonar ring of the sink starts, as a share of the dive, and how long it lasts. */
export const sonar={starts:[.1,.32,.54],life:.3};
function arc(D:Dive,u:number):SubPose{
 const e=u**1.7,end=D.bottom-D.size;
 // A curve from the start, out to the right, then down. The middle point sets how far it runs level before it turns.
 const ax=D.x0+3.4,ay=D.y0,bx=D.x0+4.6,by=end,k=1-e;
 const x=k*k*D.x0+2*k*e*ax+e*e*bx,y=k*k*D.y0+2*k*e*ay+e*e*by;
 const dx=2*k*(ax-D.x0)+2*e*(bx-ax),dy=2*k*(ay-D.y0)+2*e*(by-ay);
 return{x,y,z:0,pitch:Math.atan2(dy,dx),yaw:0};
}
function corkscrew(D:Dive,u:number):SubPose{
 const e=u**1.4,a=2.25*TAU*e,r=1.7*smooth(clamp01(e/.25));
 return{x:D.x0+Math.sin(a)*r,y:D.y0+(D.bottom-D.size-D.y0)*e,z:(Math.cos(a)-1)*.15,pitch:-.42*smooth(clamp01(e/.15)),yaw:a};
}
function sink(D:Dive,u:number):SubPose{
 const rock=u*TAU*1.5,calm=1-u;
 return{x:D.x0+Math.sin(rock)*.55*calm,y:D.y0+(D.bottom-D.size-D.y0)*u*u,z:0,pitch:-Math.sin(rock)*.1*calm-.6*smooth(clamp01((u-.6)/.4)),yaw:0};
}
/** The submarine's pose at u, where 0 is the starting spot and 1 is off the bottom of the stage. */
export function subPose(v:SubVariation,D:Dive,u:number):SubPose{
 const c=clamp01(Number.isFinite(u)?u:0);
 return v===2?corkscrew(D,c):v===3?sink(D,c):arc(D,c);
}
/** One bubble out of n. Each is let go at a set moment of the dive from where the submarine was then, rises, and is gone a little later. Returns null while it is not on stage.
 * age runs 0 to 1. Nothing is stored, so playing the dive backwards puts every bubble back. */
export function bubble(v:SubVariation,D:Dive,i:number,n:number,u:number):{x:number;y:number;age:number;size:number}|null{
 const rnd=(k:number)=>{const s=Math.sin(i*127.1+k*311.7)*43758.5453;return s-Math.floor(s)};
 const born=(i+.5)/Math.max(1,n)*.72,life=.2+rnd(1)*.08,age=(u-born)/life;
 if(!(age>0&&age<1))return null;
 const from=subPose(v,D,born);
 return{x:from.x+(rnd(2)-.5)*.5+Math.sin(age*7+i)*.12,y:from.y+.3+age*(1.6+rnd(3)*1.2),age,size:.5+rnd(4)*.5};
}
