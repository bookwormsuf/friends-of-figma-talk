import {galleryLayout as L} from '../src/slides/layouts.ts';
import {galleryMove,galleryPose,galleryTargets} from '../src/slides/galleryMotion.ts';
import {restingTilt,seedOf} from '../src/visuals/slabMotion.ts';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const deck=JSON.parse(fs.readFileSync('src/data/deck.json','utf8')),slides=deck.slides||deck;
const WW=10*1280/720;
const aspectOf=(a:any)=>a.presentationCrop?a.presentationCrop.width/a.presentationCrop.height:a.exportedWidth&&a.exportedHeight?a.exportedWidth/a.exportedHeight:a.width/a.height;
const rot=(rx:number,ry:number,rz:number)=>{const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
 return[[c*e,-c*f,d],[a*f+b*e*d,a*e-b*f*d,-b*c],[b*f-a*e*d,b*e+a*f*d,a*c]]};
const mul=(m:number[][],v:number[])=>m.map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]);
const mulT=(m:number[][],v:number[])=>[0,1,2].map(i=>m[0][i]*v[0]+m[1][i]*v[1]+m[2][i]*v[2]);
/** Smallest gap, in world units, between the bodies of any two gallery slabs that cover each other on screen, over every step change of one real slide.
 * Unlike gallery.test.ts this uses the slide's real images and the slabs' real tilt. settle 1 is the extra tilt a slab has just after the slide appears, 0 is at rest. Negative means they cut through each other. */
function sim(id:string,settle:number,layout=L,verbose=false){
 const slide=slides.find((s:any)=>s.id===id),assets=slide.assets,n=assets.length,top=slide.text.length?layout.headingTop:0,fit=(100-top)/100;
 const targetsAt=(step:number)=>galleryTargets(n,step,layout.cluster,layout.featured,layout.parked).map((p,i)=>{const cap=(p===layout.featured?layout.maxHeight:layout.slotMaxHeight)*fit,width=Math.min(p.width,cap*aspectOf(assets[i])*9/16),half=width*16/9/aspectOf(assets[i])/2;return{...p,width,y:Math.max(top+half+2,Math.min(100-half-2,top+p.y*fit))}});
 const fw=(i:number)=>Math.min(layout.featured.width,layout.maxHeight*fit*aspectOf(assets[i])*9/16);
 let worst=Infinity;const out:string[]=[];
 const trans:[number,number][]=[];for(let s=0;s<n;s++){trans.push([s,s+1],[s+1,s])}trans.push([n,0],[0,n]);
 for(const [a,b] of trans){const from=targetsAt(a),to=targetsAt(b);let min=Infinity,at='';
  for(let k=0;k<=200;k++){const p=k/200;
   const slabs=assets.map((as:any,i:number)=>{const mv=galleryMove(i,n,a,b),c=k===200?to[i]:galleryPose(from[i],to[i],p,mv,layout.motion.lift,layout.motion.part,layout.motion.pinch);
    const front=b>=1&&b<=n&&i===b-1,seed=seedOf(as.id),rest=restingTilt(c.x,seed,front?.5:1);
    const R=rot(.1*settle+rest.rotX,(c.x>50?-.22:.22)*settle+rest.rotY,c.rotation),s=c.width/fw(i),w=fw(i)/100*WW,h=w/aspectOf(as);
    return{R,s,w:(w+.45)*s,h:(h+.45)*s,pos:[(c.x/100-.5)*WW,(.5-c.y/100)*10,c.z]}});
   for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===j)continue;const A=slabs[i],B=slabs[j],nB=mul(B.R,[0,0,1]);
    for(let u=-1;u<=1;u+=.1)for(let v=-1;v<=1;v+=.1){const P=mul(A.R,[u*A.w/2,v*A.h/2,0]).map((x,q)=>x+A.pos[q]);
     const zB=B.pos[2]-(nB[0]*(P[0]-B.pos[0])+nB[1]*(P[1]-B.pos[1]))/nB[2],loc=mulT(B.R,[P[0]-B.pos[0],P[1]-B.pos[1],zB-B.pos[2]]);
     if(Math.abs(loc[0])<=B.w/2&&Math.abs(loc[1])<=B.h/2){const gap=Math.abs(P[2]-zB)-.41*(A.s+B.s)/2;if(gap<min){min=gap;at=`p=${p.toFixed(2)} slabs ${i}&${j}`}}}}
  }
  worst=Math.min(worst,min);out.push(`${a}->${b} gap ${min===Infinity?'none':min.toFixed(2)} ${at}`)}
 if(verbose)console.log(id,'settle',settle,'\n '+out.join('\n '));return worst}
const galleries=slides.filter((s:any)=>s.assets.length>1&&['3:19','4:92','4:121'].includes(s.id)).map((s:any)=>s.id);
test('gallery slabs on the real slides never cut through each other, at rest or just after the slide appears',()=>{
 assert.equal(galleries.length,3);
 for(const id of galleries)for(const settle of[0,1]){const gap=sim(id,settle);assert.ok(gap>.2,`slide ${id} (settle ${settle}) has slabs ${gap.toFixed(2)} apart`)}
});
test('the old depths and timing do cut through, so the check can fail',()=>{
 // Depths 1 apart in the cluster, as before: the entry tilt alone swings one slab through its neighbour.
 const old={...L,cluster:L.cluster.map((c,i)=>({...c,z:[1,2,0][i]})),featured:{...L.featured,z:3},parked:L.parked.map((c,i)=>({...c,z:i}))};
 assert.ok(sim('3:19',1,old)<0);
 // No pinch: slabs keep their size while depths swap in the pile.
 assert.ok(sim('3:19',0,{...L,motion:{...L.motion,pinch:1}})<0);
});
