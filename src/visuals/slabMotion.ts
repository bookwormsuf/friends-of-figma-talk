/** Frame clocks can restart or jump after pause/background transitions. */
export function advanceSlabSettle(elapsed:number,delta:number):number {
 const safeDelta=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;
 return Math.min(10,Math.max(0,elapsed)+safeDelta);
}

export type FloatPose={y:number;x:number;rotX:number;rotY:number;rotZ:number};
/** Max offsets at amount 1. */
export const FLOAT_LIMITS={y:.09,x:.03,rotX:.025,rotY:.035,rotZ:.012} as const;
const TAU=Math.PI*2;
/** Three weighted sines (weights sum to 1) with incommensurate periods, shifted by seed. */
const wave=(t:number,seed:number,periods:[number,number,number],shift:number)=>
 .5*Math.sin(TAU*t/periods[0]+seed+shift)+.3*Math.sin(TAU*t/periods[1]+seed*1.7+shift*2.3)+.2*Math.sin(TAU*t/periods[2]+seed*2.9+shift*.7);
/** Slow drift offsets for a floating object. Pure: same inputs, same pose. */
export function floatPose(t:number,seed:number,amount:number):FloatPose {
 const a=Number.isFinite(amount)?Math.max(0,amount):0,time=Number.isFinite(t)?t:0;
 return{
  y:wave(time,seed,[5.3,7.1,4.3],0)*FLOAT_LIMITS.y*a,
  x:wave(time,seed,[6.1,4.7,6.9],1.3)*FLOAT_LIMITS.x*a,
  rotX:wave(time,seed,[5.9,4.1,7.3],2.1)*FLOAT_LIMITS.rotX*a,
  rotY:wave(time,seed,[6.7,5.1,4.4],3.4)*FLOAT_LIMITS.rotY*a,
  rotZ:wave(time,seed,[4.9,6.3,7.7],4.6)*FLOAT_LIMITS.rotZ*a,
 };
}
/** Local float clock. Same bounded rule as advanceSlabSettle, but never capped, so the drift keeps going. */
export function advanceFloat(t:number,delta:number):number {
 const safeDelta=Number.isFinite(delta)?Math.max(0,Math.min(delta,.05)):0;
 return (Number.isFinite(t)?Math.max(0,t):0)+safeDelta;
}
/** Stable 0..2pi seed from a string key. */
export function seedOf(key:string):number {
 let h=2166136261;
 for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}
 return ((h>>>0)%6283)/1000;
}
/** Constant resting rotation. Left slabs turn right (+y), right slabs turn left, centre slabs by seed. */
export function restingTilt(x:number,seed:number,tilt:number):{rotX:number;rotY:number} {
 const side=x<45?1:x>55?-1:(Math.floor(seed*1000)%2?1:-1);
 return{rotX:.04*tilt,rotY:.07*side*tilt};
}
