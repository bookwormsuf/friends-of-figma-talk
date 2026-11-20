import {test} from 'node:test';import assert from 'node:assert/strict';
import {HOLD,idleHold,holdTouches,holdDue,holdFired,type TouchPoint} from '../src/shell/threeFingerHold.ts';
const at=(n:number,dx=0):TouchPoint[]=>Array.from({length:n},(_,i)=>({id:i,x:100*i+dx,y:50}));
/** Fingers land one at a time, as they do on a real screen. */
const land=(n:number,t=0)=>{let s=idleHold;for(let i=1;i<=n;i++)s=holdTouches(s,at(i),t);return s};
test('three still fingers fire after the hold time, not before',()=>{
 const s=land(3);assert.equal(s.status,'holding');
 assert.equal(holdDue(s,HOLD.ms-1),false);assert.equal(holdDue(s,HOLD.ms),true);
});
test('one or two fingers never start a hold',()=>{assert.equal(holdDue(land(1),9999),false);assert.equal(holdDue(land(2),9999),false)});
test('small drift is fine, a real movement cancels',()=>{
 assert.equal(holdTouches(land(3),at(3,HOLD.drift-1),100).status,'holding');
 const moved=holdTouches(land(3),at(3,HOLD.drift),100);assert.equal(moved.status,'spent');assert.equal(holdDue(moved,9999),false);
});
test('drift is measured from where the fingers landed, so a slow creep still cancels',()=>{
 let s=land(3);for(let d=4;d<=16;d+=4)s=holdTouches(s,at(3,d),d*10);assert.equal(s.status,'spent');
});
test('a fourth finger cancels, and stays cancelled when it lifts again',()=>{
 let s=holdTouches(land(3),at(4),100);assert.equal(s.status,'spent');
 s=holdTouches(s,at(3),200);assert.equal(s.status,'spent');assert.equal(holdDue(s,9999),false);
});
test('lifting one finger cancels, and putting it back does not restart',()=>{
 let s=holdTouches(land(3),at(2),100);assert.equal(s.status,'spent');
 s=holdTouches(s,at(3),200);assert.equal(holdDue(s,9999),false);
});
test('a hold fires once, then needs every finger lifted',()=>{
 let s=holdFired();assert.equal(holdDue(s,9999),false);
 s=holdTouches(s,at(3),600);assert.equal(holdDue(s,9999),false);
 s=holdTouches(s,[],700);assert.equal(s.status,'idle');
 s=holdTouches(holdTouches(holdTouches(s,at(1),800),at(2),800),at(3),800);assert.equal(holdDue(s,800+HOLD.ms),true);
});
test('the clock starts when the third finger lands',()=>{
 let s=holdTouches(idleHold,at(1),0);s=holdTouches(s,at(2),300);s=holdTouches(s,at(3),400);
 assert.equal(holdDue(s,HOLD.ms),false);assert.equal(holdDue(s,400+HOLD.ms),true);
});
