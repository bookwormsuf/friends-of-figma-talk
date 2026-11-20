import test from 'node:test';
import assert from 'node:assert/strict';
import {bubble,subPose,subSeconds,type Dive,type SubVariation} from '../src/slides/subMotion.ts';
const D:Dive={x0:0,y0:-.8,bottom:-5,size:2.2};
const all:SubVariation[]=[1,2,3];
test('submarine: every dive starts on the bead and ends below the stage',()=>{
 for(const v of all){
  const a=subPose(v,D,0),b=subPose(v,D,1);
  assert.ok(Math.abs(a.x-D.x0)<1e-9&&Math.abs(a.y-D.y0)<1e-9,`dive ${v} starts on the bead`);
  assert.ok(Math.abs(a.pitch)<.05&&a.yaw===0,`dive ${v} starts level, facing right`);
  assert.ok(b.y<=D.bottom-D.size+1e-9,`dive ${v} ends off stage`);
  assert.ok(subSeconds[v]>0);
 }
});
test('submarine: it only goes down, never jumps and stays between the side edges',()=>{
 for(const v of all){
  let before=subPose(v,D,0);
  for(let u=.002;u<=1;u+=.002){
   const now=subPose(v,D,u);
   assert.ok(now.y<=before.y+1e-9,`dive ${v} rises at u=${u.toFixed(3)}`);
   assert.ok(Math.hypot(now.x-before.x,now.y-before.y)<.08,`dive ${v} jumps at u=${u.toFixed(3)}`);
   assert.ok(Math.abs(now.pitch-before.pitch)<.05&&Math.abs(now.yaw-before.yaw)<.08,`dive ${v} snaps round at u=${u.toFixed(3)}`);
   assert.ok(Math.abs(now.x)<7,`dive ${v} leaves by the side`);
   before=now;
  }
 }
});
test('submarine: out-of-range and broken progress is held to the ends',()=>{
 for(const v of all){
  assert.deepEqual(subPose(v,D,-1),subPose(v,D,0));assert.deepEqual(subPose(v,D,5),subPose(v,D,1));assert.deepEqual(subPose(v,D,NaN),subPose(v,D,0));
 }
});
test('submarine: bubbles rise from where it was, and none are left at either end',()=>{
 for(const v of all){
  const n=12;
  for(let i=0;i<n;i++){assert.equal(bubble(v,D,i,n,0),null);assert.equal(bubble(v,D,i,n,1),null)}
  let seen=0;
  for(let u=0;u<=1;u+=.01)for(let i=0;i<n;i++){
   const b=bubble(v,D,i,n,u),later=bubble(v,D,i,n,u+.01);
   if(b){seen++;assert.ok(b.age>0&&b.age<1);if(later)assert.ok(later.y>b.y,'a bubble rises')}
  }
  assert.ok(seen>n,`dive ${v} shows bubbles`);
 }
});
