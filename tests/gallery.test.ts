import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWipe,galleryMove,galleryPose,galleryTargets,wipeHandle,wipePosition,wipeSeconds,wipeTarget} from '../src/slides/galleryMotion.ts';
import {galleryLayout,type GalleryPlacement} from '../src/slides/layouts.ts';

const L=galleryLayout;
/** Same height caps Gallery.tsx applies, without the heading offset. */
const fit=(p:GalleryPlacement,aspect:number)=>({...p,width:Math.min(p.width,(p===L.featured?L.maxHeight:L.slotMaxHeight)*aspect*9/16)});
const layout=(count:number,step:number,aspects:number[])=>galleryTargets(count,step,L.cluster,L.featured,L.parked).map((p,i)=>fit(p,aspects[i]));
/** Overlap of two slabs on each axis, in stage percent. Both must be positive for the slabs to cover each other. */
const overlap=(a:GalleryPlacement,b:GalleryPlacement,aa:number,ab:number)=>{
 const hw=(p:GalleryPlacement)=>p.width/2,hh=(p:GalleryPlacement,asp:number)=>p.width*16/9/asp/2;
 return Math.min(hw(a)+hw(b)-Math.abs(a.x-b.x),hh(a,aa)+hh(b,ab)-Math.abs(a.y-b.y));
};
/** Smallest depth gap between any two slabs while they overlap by more than `slack` percent, over a whole transition. */
function closest(count:number,from:number,to:number,aspects:number[],lift:number,part:number,slack=2){
 const a=layout(count,from,aspects),b=layout(count,to,aspects);let min=Infinity,at=-1;
 for(let n=0;n<=400;n++){
  const p=n/400,poses=a.map((f,i)=>galleryPose(f,b[i],p,galleryMove(i,count,from,to),lift,part));
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(overlap(poses[i],poses[j],aspects[i],aspects[j])>slack){const gap=Math.abs(poses[i].z-poses[j].z);if(gap<min){min=gap;at=p}}
 }
 return{min,at};
}
const {lift,part}=L.motion;
const cases:[string,number[]][]=[['three landscape',[1.5,1.5,1.5]],['three mixed',[1.78,1.2,1.5]],['two landscape',[1.6,1.6]]];

test('gallery slabs never get close in depth while they overlap, forwards and backwards',()=>{
 for(const [name,aspects] of cases){
  const n=aspects.length;
  for(let s=0;s<n;s++)for(const [from,to] of [[s,s+1],[s+1,s]]){
   const {min,at}=closest(n,from,to,aspects,lift,part);
   assert.ok(min>=.9,`${name}: step ${from} to ${to} has a depth gap of ${min.toFixed(2)} at p=${at}`);
  }
 }
});

test('the old all-at-once move does cut through, so the check can fail',()=>{
 // Every key eased together, as before: the incoming and outgoing slabs swap depth while they overlap.
 const aspects=[1.5,1.5,1.5],a=layout(3,1,aspects),b=layout(3,2,aspects);let min=Infinity;
 for(let n=0;n<=400;n++){const p=n/400,e=p<.5?2*p*p:1-(-2*p+2)**2/2,poses=a.map((f,i)=>({x:f.x+(b[i].x-f.x)*e,y:f.y+(b[i].y-f.y)*e,width:f.width+(b[i].width-f.width)*e,rotation:0,z:f.z+(b[i].z-f.z)*e}));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(overlap(poses[i],poses[j],1.5,1.5)>2)min=Math.min(min,Math.abs(poses[i].z-poses[j].z))}
 assert.ok(min<.3);
});

test('a finished move lands exactly on its target and starts on its origin',()=>{
 const a=layout(3,1,[1.5,1.5,1.5]),b=layout(3,2,[1.5,1.5,1.5]);
 a.forEach((f,i)=>{const m=galleryMove(i,3,1,2);assert.deepEqual(galleryPose(f,b[i],1,m,lift,part),b[i]);const s=galleryPose(f,b[i],0,m,lift,part);for(const k of ['x','y','width','z'] as const)assert.ok(Math.abs(s[k]-f[k])<1e-9)});
});

test('roles follow the step change',()=>{
 assert.equal(galleryMove(1,3,1,2).role,'in');assert.equal(galleryMove(0,3,1,2).role,'out');assert.equal(galleryMove(2,3,1,2).role,'by');
 assert.deepEqual(galleryMove(0,3,1,0),{role:'out',fromCluster:false,toCluster:true});
 assert.deepEqual(galleryMove(0,3,0,1),{role:'in',fromCluster:true,toCluster:false});
});

test('wipe: starts on the before picture, rests halfway, ends on the after, and never jumps',()=>{
 assert.equal(wipePosition(0),0);assert.equal(wipePosition(.5),.5);assert.equal(wipePosition(1),1);
 for(let p=.002;p<=1;p+=.002){const step=wipePosition(p)-wipePosition(p-.002);assert.ok(step>=0&&step<.02,`jumps or goes back at ${p.toFixed(3)}`)}
 assert.equal(wipeHandle(0),0);assert.equal(wipeHandle(1),0);assert.equal(wipeHandle(.5),1);
});
test('wipe: a slab shows its after only once the presenter has reached it',()=>{
 assert.deepEqual([0,1,2,3].map(step=>wipeTarget(1,step)),[0,0,1,1]);
});
test('wipe: waits for the hold, then takes the set seconds, and goes back without waiting',()=>{
 const frame=1/60,hold=1.9,seconds=wipeSeconds;let s={wait:0,p:0},t=0,started=-1;
 while(s.p<1&&t<30){s=advanceWipe(s,1,frame,hold,seconds);t+=frame;if(started<0&&s.p>0)started=t}
 assert.ok(Math.abs(started-hold)<.05,`started at ${started.toFixed(2)}s`);assert.ok(Math.abs(t-hold-seconds)<.05,`finished at ${t.toFixed(2)}s`);
 assert.equal(advanceWipe(s,1,frame,hold,seconds),s,'rests once done');
 t=0;while(s.p>0&&t<30){s=advanceWipe(s,0,frame,hold,seconds);t+=frame}
 assert.ok(t<.5,'goes back quickly');assert.equal(s.wait,0,'and will wait again next time');
 for(const delta of [NaN,-1,Infinity,10]){const n=advanceWipe({wait:9,p:.5},1,delta,hold,seconds);assert.ok(n.p>=.5&&n.p<=1&&Number.isFinite(n.p))}
});
