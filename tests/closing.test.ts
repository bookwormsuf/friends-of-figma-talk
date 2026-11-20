import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceClosing,closingConfig as C,closingState} from '../src/slides/closingMotion.ts';
/** Distance from the stage centre in pixels on the 1280 by 720 stage, so x and y compare fairly. */
const fromCentre=(o:{x:number;y:number})=>Math.hypot((o.x-50)*12.8,(o.y-50)*7.2);
const near=(a:number,b:number)=>Math.abs(a-b)<1e-9;
test('closing: starts with the words alone',()=>{
 const s=closingState(0);
 assert.equal(s.words,0);assert.equal(s.others.length,C.others);
 assert.ok(s.others.every(o=>!o.visible),'no cloud is on stage yet');assert.equal(s.centre.visible,false);
 assert.equal(s.glow.cloud,0);assert.equal(s.glow.spark,0);assert.equal(s.tint,0);
});
test('closing: the words are gone before the swarm has gathered',()=>{
 assert.equal(closingState(C.wordsLeave).words,1);
 assert.ok(closingState(C.wordsLeave/2).words<1);
});
test('closing: the centre cloud is hidden inside the swarm before it parts',()=>{
 // Just before the others move out: every cloud has arrived, and the centre one is still small with clouds on top of it.
 const s=closingState(.5);
 assert.ok(s.others.every(o=>o.visible));
 assert.ok(near(s.centre.width,C.small),'same size as the others');
 assert.ok(s.others.some(o=>fromCentre(o)<C.small*12.8*.6),'at least one cloud overlaps the centre');
 assert.equal(s.glow.cloud,0);
});
test('closing: press one ends on a glowing cloud inside a ring',()=>{
 const s=closingState(1),swarmRadius=Math.max(...closingState(.5).others.map(fromCentre)),half=C.small/2;
 assert.equal(s.words,1);
 for(const o of s.others){
  assert.ok(fromCentre(o)>swarmRadius,'each ring cloud is farther out than the swarm ever was');
  assert.ok(o.x-half>0&&o.x+half<100&&o.y>4&&o.y<96,`ring cloud stays on stage (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`);
 }
 assert.deepEqual([s.centre.x,s.centre.y],[50,50]);
 assert.ok(near(s.centre.width,C.centre));assert.equal(s.centre.reshape,0);
 assert.ok(near(s.glow.cloud,1));assert.equal(s.glow.spark,0);assert.equal(s.tint,0);
 assert.ok(near(s.glow.spread,C.spread.cloud));
});
test('closing: ring clouds do not sit on top of each other',()=>{
 const ring=closingState(1).others;
 // A small cloud is about half as tall as it is wide. Two clouds overlap when they are closer than a width across and half a width up and down.
 for(let i=0;i<ring.length;i++)for(let j=i+1;j<ring.length;j++){
  const dx=Math.abs(ring[i].x-ring[j].x)*12.8,dy=Math.abs(ring[i].y-ring[j].y)*7.2,w=C.small*12.8;
  assert.ok(dx>w*.8||dy>w*.4,`clouds ${i} and ${j} overlap`);
 }
});
test('closing: halfway through press two the centre is a small blob',()=>{
 // Find the frame where the reshape rests at one half.
 let q=0;while(q<1&&closingState(1+q).centre.reshape<.5)q+=.001;
 const s=closingState(1+q);
 assert.ok(Math.abs(s.centre.reshape-.5)<.01);
 assert.ok(Math.abs(s.centre.width-C.centre*C.blob)<.2,`blob width ${s.centre.width.toFixed(2)}`);
});
test('closing: press two ends on a glowing spark the same width as the cloud',()=>{
 const one=closingState(1),s=closingState(2);
 assert.equal(s.centre.reshape,1);assert.ok(near(s.centre.width,one.centre.width));
 assert.ok(near(s.glow.spark,1));assert.ok(near(s.glow.cloud,0));assert.ok(near(s.tint,1));
 assert.ok(s.glow.spread>one.glow.spread,'the spark glows wider than the cloud did');
 // The ring does not move during press two.
 s.others.forEach((o,i)=>{assert.equal(o.x,one.others[i].x);assert.equal(o.y,one.others[i].y)});
});
test('closing: nothing jumps between frames',()=>{
 let before=closingState(0);
 for(let p=.002;p<=2;p+=.002){
  const now=closingState(p);
  now.others.forEach((o,i)=>{if(o.visible&&before.others[i].visible)assert.ok(fromCentre({x:50+o.x-before.others[i].x,y:50+o.y-before.others[i].y})<40,`cloud ${i} jumps at p=${p.toFixed(3)}`)});
  assert.ok(Math.abs(now.centre.reshape-before.centre.reshape)<.03,`reshape jumps at p=${p.toFixed(3)}`);
  assert.ok(Math.abs(now.centre.width-before.centre.width)<.5,`width jumps at p=${p.toFixed(3)}`);
  assert.ok(Math.abs(now.glow.spread-before.glow.spread)<.05,`glow jumps at p=${p.toFixed(3)}`);
  before=now;
 }
});
test('closing: playing forward takes the set seconds for each press, and back returns to the start',()=>{
 const [one,two]=C.seconds,frame=1/60;
 let p=0,t=0;while(p<1&&t<60){p=advanceClosing(p,1,frame);t+=frame}
 assert.equal(p,1);assert.ok(Math.abs(t-one)<.1,`press one took ${t.toFixed(2)}s`);
 t=0;while(p<2&&t<60){p=advanceClosing(p,2,frame);t+=frame}
 assert.equal(p,2);assert.ok(Math.abs(t-two)<.1,`press two took ${t.toFixed(2)}s`);
 t=0;while(p>1&&t<60){p=advanceClosing(p,1,frame);t+=frame}
 assert.equal(p,1);assert.ok(Math.abs(t-two)<.1);
 t=0;while(p>0&&t<60){p=advanceClosing(p,0,frame);t+=frame}
 assert.equal(p,0);assert.ok(Math.abs(t-one)<.1);
});
test('closing: a second press before the first has finished hurries on instead of waiting',()=>{
 const [one,two]=C.seconds,frame=1/60;
 let p=0,t=0;while(p<2&&t<60){p=advanceClosing(p,2,frame);t+=frame}
 assert.equal(p,2);assert.ok(t<one+two,'faster than the two presses played in full');
});
test('closing: a stalled or broken frame time never throws p out of range',()=>{
 for(const delta of [NaN,-1,Infinity,10]){const p=advanceClosing(.5,2,delta);assert.ok(p>=.5&&p<=2&&Number.isFinite(p))}
 assert.equal(advanceClosing(1,1,.016),1);
});
