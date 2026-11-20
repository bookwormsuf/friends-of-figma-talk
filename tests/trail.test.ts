import test from 'node:test';
import assert from 'node:assert/strict';
import {trailPose,type TrailSpec,type TrailVariation} from '../src/slides/trailMotion.ts';
import {trailLayout as L} from '../src/slides/layouts.ts';
const spec=(v:TrailVariation):TrailSpec=>({slab:L.slab,diagram:L.diagram,chain:L.chains[v] as TrailSpec['chain']});
const near=(a:number,b:number,slack=1e-9)=>Math.abs(a-b)<=slack;
for(const v of [1,2,3] as TrailVariation[]){
 const S=spec(v),D=L.diagram;
 test(`trail variation ${v} starts as the screenshot alone`,()=>{
  const p=trailPose(v,0,S);
  assert.deepEqual(p.slab,{x:L.slab.x,y:L.slab.y,scale:1,rotation:0});
  assert.equal(p.capsule.scale,0);assert.equal(p.arrow,0);assert.equal(p.labels.ends,0);assert.equal(p.labels.question,0);
  p.ends.forEach(e=>assert.equal(e.width,0));p.nodes.forEach(n=>assert.equal(n.r,0));
 });
 test(`trail variation ${v} lands exactly on the slide 13 diagram at step 1`,()=>{
  const p=trailPose(v,1,S);
  assert.equal(p.slab.scale,0);assert.equal(p.capsule.scale,1);assert.equal(p.arrow,1);assert.equal(p.grow,1);
  assert.deepEqual(p.ends,[D.left,D.right]);assert.deepEqual(p.labels,{ends:1,question:1});
  p.nodes.forEach(n=>assert.equal(n.r,0));
  // The links draw one straight thread, the same thickness as on slide 13.
  p.links.forEach(l=>assert.deepEqual(l,{ra:D.line,rb:D.line,neck:D.line}));
  p.nodes.forEach(n=>assert.ok(near(n.y,D.left.y)&&n.x>=D.left.x&&n.x<=D.right.x));
 });
 test(`trail variation ${v} ends as the string of nodes, each exactly on its spot`,()=>{
  const p=trailPose(v,2,S);
  assert.deepEqual(p.ends,S.chain.ends);assert.deepEqual(p.nodes,S.chain.nodes);
  assert.equal(p.capsule.scale,0);assert.equal(p.labels.question,0);assert.equal(p.labels.ends,1);assert.equal(p.arrow,S.chain.arrow?1:0);
 });
 test(`trail variation ${v} never jumps and never leaves the stage`,()=>{
  let last=trailPose(v,0,S);
  for(let k=1;k<=2000;k++){
   const p=trailPose(v,k/1000,S),at=`t=${k/1000}`;
   assert.ok(Math.abs(p.slab.scale-last.slab.scale)<.02&&Math.abs(p.capsule.scale-last.capsule.scale)<.03,`slab or pill jumps at ${at}`);
   p.ends.forEach((e,i)=>{assert.ok(Math.abs(e.x-last.ends[i].x)<.5&&Math.abs(e.width-last.ends[i].width)<.5,`disc ${i} jumps at ${at}`);assert.ok(e.x-e.width/2>0&&e.x+e.width/2<100,`disc ${i} leaves the stage at ${at}`)});
   p.nodes.forEach((n,j)=>{assert.ok(Math.abs(n.x-last.nodes[j].x)<.6&&Math.abs(n.y-last.nodes[j].y)<.9&&Math.abs(n.r-last.nodes[j].r)<.02,`node ${j} jumps at ${at}`);assert.ok(n.x>2&&n.x<98&&n.y>4&&n.y<96,`node ${j} leaves the stage at ${at}`)});
   last=p;
  }
 });
 test(`trail variation ${v}: resting nodes and discs do not overlap`,()=>{
  // Everything in world units: the stage is 160/9 wide and 10 tall.
  const W=160/9,all=[...S.chain.ends.map(e=>({x:e.x,y:e.y,r:e.width/100*W/2})),...S.chain.nodes].map(n=>({x:n.x/100*W,y:n.y/10,r:n.r}));
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(Math.hypot(all[i].x-all[j].x,all[i].y-all[j].y)>all[i].r+all[j].r+.2,`${i} and ${j} touch`);
 });
}
