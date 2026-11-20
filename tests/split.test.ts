import test from 'node:test';
import assert from 'node:assert/strict';
import {splitChild,splitParent,type SplitVariation} from '../src/slides/splitMotion.ts';
import {splitLayout as L} from '../src/slides/layouts.ts';
const n=L.children.length;
for(const v of [1,2,3] as SplitVariation[]){
 test(`split variation ${v} starts as the parent alone and ends as the children alone, exactly on their spots`,()=>{
  assert.equal(splitParent(v,0),1);assert.equal(splitParent(v,1),0);
  L.children.forEach((c,i)=>{
   assert.equal(splitChild(v,i,n,0,L.parent,c,L.columns).visible,false);
   assert.deepEqual(splitChild(v,i,n,1,L.parent,c,L.columns),{x:c.x,y:c.y,scale:1,rotation:c.rotation,visible:true});
  });
 });
 test(`split variation ${v} has no jump at either end and never leaves the stage`,()=>{
  L.children.forEach((c,i)=>{
   const near=splitChild(v,i,n,.999,L.parent,c,L.columns);
   assert.ok(Math.abs(near.x-c.x)<.5&&Math.abs(near.y-c.y)<.5&&Math.abs(near.scale-1)<.02,`child ${i} jumps at the end`);
   for(let k=0;k<=200;k++){const q=splitChild(v,i,n,k/200,L.parent,c,L.columns);assert.ok(q.x>0&&q.x<100&&q.y>0&&q.y<100&&q.scale<=1.15,`child ${i} at p=${k/200}`)}
  });
  assert.ok(splitParent(v,.001)>.98&&splitParent(v,.999)<.02);
 });
}
test('the six children sit in the pinned order and do not cover each other',()=>{
 assert.deepEqual(L.children.map(c=>c.src.replace('/assets/brand-','').replace('.png','')),['campsite','fruitful','v2-c','v3-b','v5-h','v6']);
 const h=L.childWidth*16/9/L.childAspect;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=L.children[i],b=L.children[j];assert.ok(Math.abs(a.x-b.x)>L.childWidth||Math.abs(a.y-b.y)>h,`children ${i} and ${j} overlap`)}
});
