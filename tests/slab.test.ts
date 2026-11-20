import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceSlabSettle,advanceFloat,floatPose,restingTilt,seedOf,FLOAT_LIMITS} from '../src/visuals/slabMotion.ts';
import {slabImageGeometry} from '../src/visuals/geometry.ts';

test('slab settling stays bounded across clock resets and background jumps',()=>{
 let elapsed=2;
 for(const delta of [-2,0,100,Infinity,NaN,1/60]){
  const next=advanceSlabSettle(elapsed,delta);
  assert.ok(next>=elapsed && next-elapsed<=.100001);
  const rotation=.22*Math.exp(-next*1.4);
  assert.ok(Number.isFinite(rotation)&&rotation>=0&&rotation<=.22);
  elapsed=next;
 }
});
test('slab image has rounded corners and texture coordinates preserve proportions',()=>{
 const g=slabImageGeometry(8,4),p=g.getAttribute('position'),uv=g.getAttribute('uv');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i);
  assert.ok(!(Math.abs(x)>3.99&&Math.abs(y)>1.99),'square corner must be clipped');
  assert.ok(Math.abs(uv.getX(i)-(x/8+.5))<1e-6);
  assert.ok(Math.abs(uv.getY(i)-(y/4+.5))<1e-6);
 }
 g.dispose();
});

test('approved presentation crop maps texture UVs without modifying source pixels',()=>{
 const crop={x:249,y:0,width:1421,height:1080,sourceWidth:1920,sourceHeight:1080};
 const g=slabImageGeometry(8,8*1080/1421,crop),uv=g.getAttribute('uv');
 for(let i=0;i<uv.count;i++){
  assert.ok(uv.getX(i)>=249/1920-1e-6&&uv.getX(i)<=(249+1421)/1920+1e-6);
  assert.ok(uv.getY(i)>=-1e-6&&uv.getY(i)<=1+1e-6);
 }
 g.dispose();
});

test('float clock advance is bounded',()=>{
 let t=3;
 for(const delta of [-2,0,100,Infinity,NaN,1/60]){
  const next=advanceFloat(t,delta);
  assert.ok(next>=t&&next-t<=.050001);
  t=next;
 }
});
test('float pose stays within limits and differs per seed',()=>{
 for(let i=0;i<2000;i++){
  const p=floatPose(i*.37,seedOf('s'+(i%7)),1);
  assert.ok(Math.abs(p.y)<=FLOAT_LIMITS.y+1e-9&&Math.abs(p.x)<=FLOAT_LIMITS.x+1e-9);
  assert.ok(Math.abs(p.rotX)<=FLOAT_LIMITS.rotX+1e-9&&Math.abs(p.rotY)<=FLOAT_LIMITS.rotY+1e-9&&Math.abs(p.rotZ)<=FLOAT_LIMITS.rotZ+1e-9);
  const z=floatPose(i*.37,1,0);
  assert.ok(z.y===0&&z.rotY===0);
 }
 const a=floatPose(4,seedOf('a'),1),b=floatPose(4,seedOf('b'),1);
 assert.notEqual(a.y,b.y);
 assert.notEqual(a.rotY,b.rotY);
 assert.deepEqual(floatPose(4,1,1),floatPose(4,1,1));
 const l=restingTilt(20,1,1),r=restingTilt(80,1,1);
 assert.ok(l.rotY>0&&r.rotY<0&&l.rotX===.04);
});
