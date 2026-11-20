import test from 'node:test';
import assert from 'node:assert/strict';
import {threadRadius,trimThreadSegment} from '../src/visuals/threadProfile.ts';
import {starfield} from '../src/visuals/starfield.ts';
test('thread segments never cross endpoint discs, including hidden intermediate nodes',()=>{
 const lengths=[1,1,1,1,1,1,1,1],total=8;
 lengths.forEach((len,i)=>{const q=trimThreadSegment(i,len,total,1.95,1.95,1);if(q){assert.ok(i+q.start>=1.99-1e-9);assert.ok(i+q.end<=5.59+1e-9)}});
 assert.equal(trimThreadSegment(0,1,8,1.95,1.95,1),null);
});
test('shared mercury profile stays finite and positive, including short connectors',()=>{
 for(const length of [.001,.3,2,10])for(let t=0;t<10;t+=.1)for(let u=0;u<=1;u+=.1){const r=threadRadius(u,length,t,1,true);assert.ok(Number.isFinite(r)&&r>0&&r<.3)}
});
test('star arrangements are stable, varied and sparse',()=>{
 assert.deepEqual(starfield('3:2'),starfield('3:2'));assert.notDeepEqual(starfield('3:2'),starfield('3:11'));
 for(const key of ['3:2','3:11','114:2']){const stars=starfield(key);assert.ok(stars.length>=3&&stars.length<=5);for(const s of stars){assert.ok(s.x>=5&&s.x<=95&&s.y>=5&&s.y<=95);assert.ok(s.x<=15||s.x>=85||s.y<=15||s.y>=85)}}
});
