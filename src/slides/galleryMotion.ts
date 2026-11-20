import type {GalleryPlacement} from './layouts';
/** 'in' becomes the front image, 'out' was the front image, 'by' is every other slab. */
export type GalleryRole='in'|'out'|'by';
export type GalleryMove={role:GalleryRole;fromCluster:boolean;toCluster:boolean};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
/** Quintic ease: starts and stops more gently than a quadratic, so overlapping parts blend. */
const smooth=(p:number)=>p*p*p*(p*(p*6-15)+10);
/** Fast at first, then a long settle. Used for the old front image shrinking out of the way. */
const settleOut=(p:number)=>1-(1-p)**4;
type Window=readonly [number,number];
const SETTLE:Window=[.8,1];
const win=(p:number,[a,b]:Window)=>smooth(clamp01((p-a)/(b-a)));
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
/** When each part of a move happens, as fractions of the whole transition.
 * The camera has no perspective, so depth only shows as which slab covers which. Slabs therefore change depth only while nothing overlaps, and they never cut through each other.
 * Between featured steps: the old front image shrinks where it is (fast at first, then settling), depths swap once it is small, and everything is already drifting to its new place by then.
 * Leaving the cluster: the slabs overlap there, so every slab first pulls in (`pinch`) until none touch, depths swap, then the chosen one grows and travels to the front while the others drift to their slots.
 * Returning to the cluster is the same in reverse: travel there small, swap depths, then grow back into the pile. */
export function galleryWindows({role,fromCluster,toCluster}:GalleryMove):{travel:Window;size:Window;depth:Window;pinch?:Window}{
 if(fromCluster)return{pinch:[0,.24],depth:[.22,.36],travel:[.34,1],size:[.34,1]};
 if(toCluster)return{travel:[0,.68],size:[0,.66],depth:[.66,.8],pinch:[.78,1]};
 return{travel:[.36,1],size:role==='out'?[0,.5]:[.36,1],depth:[.24,.36]};
}
/** Pose of one slab at linear progress p (0..1). Pure: same inputs, same pose.
 * lift: extra depth the incoming slab holds while it travels over the others. part: how far, in stage percent, waiting slabs step away from the centre to make room.
 * pinch: how small every slab gets, as a share of its cluster width, while depths swap in the cluster. */
export function galleryPose(from:GalleryPlacement,to:GalleryPlacement,p:number,move:GalleryMove,lift:number,part:number,pinch=.55):GalleryPlacement{
 if(!(p<1))return{...to};
 const w=galleryWindows(move),t=win(p,w.travel),d=win(p,w.depth),between=!move.fromCluster&&!move.toCluster;
 const s=move.role==='out'&&between?settleOut(clamp01((p-w.size[0])/(w.size[1]-w.size[0]))):win(p,w.size);
 // In the cluster the width passes through a pinched size, on the way out of the pile or on the way back in.
 const width=move.fromCluster?mix(mix(from.width,from.width*pinch,win(p,w.pinch!)),to.width,s):move.toCluster?mix(mix(from.width,to.width*pinch,s),to.width,win(p,w.pinch!)):mix(from.width,to.width,s);
 const z=move.role==='in'?mix(mix(from.z,to.z+lift,d),to.z,win(p,SETTLE)):mix(from.z,to.z,d);
 let x=mix(from.x,to.x,t),y=mix(from.y,to.y,t);
 if(part&&move.role!=='out'&&between){
  // Step away from the stage centre around the depth swap, then relax.
  const dx=(from.x-50)*16/9,dy=from.y-50,len=Math.hypot(dx,dy),k=win(p,[0,w.depth[0]+.05])*(1-win(p,[w.depth[1]-.05,w.depth[1]+.4]));
  if(len>1e-3){x+=dx/len*part*9/16*k;y+=dy/len*part*k}
 }
 return{x,y,width,rotation:mix(from.rotation,to.rotation,t),z};
}
/** Role of slab i when the gallery moves between two steps. Steps outside 1..count are the cluster. */
export function galleryMove(i:number,count:number,fromStep:number,toStep:number):GalleryMove{
 const featured=(s:number)=>s>=1&&s<=count;
 return{role:featured(toStep)&&i===toStep-1?'in':featured(fromStep)&&i===fromStep-1?'out':'by',fromCluster:!featured(fromStep),toCluster:!featured(toStep)};
}
/** Where slab i sits at a step: cluster at 0, front at its own step, otherwise the next parked slot in index order. */
export function galleryTargets(count:number,step:number,cluster:GalleryPlacement[],featured:GalleryPlacement,parked:GalleryPlacement[]){
 let slot=0;return Array.from({length:count},(_,i)=>step<1||step>count?cluster[i%cluster.length]:i===step-1?featured:parked[slot++%parked.length]);
}

/** Before and after wipe. Seconds the divider takes once it starts. */
export const wipeSeconds=2.6;
const leg=(p:number,a:number,b:number,from:number,to:number)=>mix(from,to,smooth(clamp01((p-a)/(b-a))));
/** Where the divider is at linear progress p. 0 is the left edge (all before), 1 is the right edge (all after). It rests halfway so both versions are seen side by side.
 * Sufyan picked this from three candidates on 15 November 2026. The other two were one plain pass, and a pass that came back before finishing. */
export const wipePosition=(p:number):number=>{const t=clamp01(p);return t<.38?leg(t,0,.38,0,.5):t<.62?.5:leg(t,.62,1,.5,1)};
/** 0 to 1: how visible the divider is. It fades in as it leaves an edge and out as it reaches one. */
export const wipeHandle=(position:number)=>smooth(clamp01(Math.min(position,1-position)/.04));
/** Where slab i's wipe should rest at a step: on the after picture once the presenter has reached that slab, on the before picture until then. */
export const wipeTarget=(i:number,step:number)=>step>=i+1?1:0;
export type WipeState={wait:number;p:number};
/** Moves one slab's wipe towards its target. delta is seconds since the last frame. Going forward it first waits `hold` seconds so the before picture is seen; going back it returns quickly with no wait. */
export function advanceWipe(s:WipeState,target:number,delta:number,hold:number,seconds:number):WipeState{
 const d=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05);
 if(target>=1){if(s.p>=1)return s;return s.wait<hold?{wait:s.wait+d,p:s.p}:{wait:s.wait,p:Math.min(1,s.p+d/Math.max(.05,seconds))}}
 return s.p<=0&&s.wait===0?s:{wait:0,p:Math.max(0,s.p-d/.4)};
}
