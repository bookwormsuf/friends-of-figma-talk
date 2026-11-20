import {useEffect,useRef} from 'react';
export type TouchPoint={id:number;x:number;y:number};
/** idle: no hold in progress. holding: the right number of fingers are down and still. spent: this touch sequence can no longer fire, until every finger lifts. */
export type HoldState={status:'idle'|'holding'|'spent';start:TouchPoint[];since:number};
/** fingers: how many touches. ms: how long they must stay down. drift: how far, in px, a finger may wander. See DESIGN.md, Touch controls. */
export const HOLD={fingers:3,ms:500,drift:12};
export const idleHold:HoldState={status:'idle',start:[],since:0};
const spent:HoldState={status:'spent',start:[],since:0};
/** Next state after any touch event. `touches` is every finger on the screen right now. Pure: same inputs, same state. */
export function holdTouches(state:HoldState,touches:TouchPoint[],now:number):HoldState{
 if(!touches.length)return idleHold;
 if(state.status==='spent')return state;
 if(state.status==='idle')return touches.length<HOLD.fingers?state:touches.length===HOLD.fingers?{status:'holding',start:touches.map(t=>({...t})),since:now}:spent;
 // Holding: a lifted finger, an extra finger or a real movement ends it.
 if(touches.length!==HOLD.fingers)return spent;
 for(const s of state.start){const t=touches.find(p=>p.id===s.id);if(!t||Math.hypot(t.x-s.x,t.y-s.y)>=HOLD.drift)return spent}
 return state;
}
/** True once a hold has lasted long enough to fire. */
export const holdDue=(state:HoldState,now:number)=>state.status==='holding'&&now-state.since>=HOLD.ms;
/** State after firing. It stays spent until every finger lifts, so one hold fires once. */
export const holdFired=():HoldState=>spent;
/** Calls onHold when three fingers rest on the screen. `enabled` is read at fire time, so a panel opening mid-hold stops it. */
export function useThreeFingerHold(onHold:()=>void,enabled:boolean){
 const live=useRef({onHold,enabled});live.current={onHold,enabled};
 useEffect(()=>{
  let state=idleHold,timer=0;
  const fire=()=>{timer=0;if(!holdDue(state,performance.now()))return;state=holdFired();if(live.current.enabled)live.current.onHold()};
  const onTouch=(e:TouchEvent)=>{
   const now=performance.now();state=holdTouches(state,Array.from(e.touches,t=>({id:t.identifier,x:t.clientX,y:t.clientY})),now);
   if(state.status!=='holding'){clearTimeout(timer);timer=0}
   else if(!timer)timer=window.setTimeout(fire,Math.max(0,HOLD.ms-(now-state.since)));
  };
  const names=['touchstart','touchmove','touchend','touchcancel'] as const;
  names.forEach(n=>addEventListener(n,onTouch,{passive:true}));
  return()=>{clearTimeout(timer);names.forEach(n=>removeEventListener(n,onTouch))};
 },[]);
}
