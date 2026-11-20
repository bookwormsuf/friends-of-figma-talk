import * as THREE from 'three';
import type {PresentationCrop} from '../data/types';
export type ShapeKind='cloud'|'burst'|'oval'|'circle';
export function outline(kind:ShapeKind){
 if(kind==='circle'){const s=new THREE.Shape();s.absarc(0,0,1,0,Math.PI*2,false);return s;}
 if(kind==='oval')return roundedShape(1.25,.8,.4);
 const s=new THREE.Shape();
 if(kind==='cloud'){s.moveTo(-2,-.55);s.bezierCurveTo(-3,-.5,-2.9,.7,-2,.8);s.bezierCurveTo(-2,1.8,-.9,2,-.4,1.3);s.bezierCurveTo(.4,2,1.5,1.6,1.6,.8);s.bezierCurveTo(2.6,1,2.9,-.6,1.8,-.8);s.bezierCurveTo(.8,-1,-.9,-1,-2,-.55);return s;}
 const pts=Array.from({length:20},(_,i)=>new THREE.Vector2(Math.cos(i*Math.PI/10)*(i%2?1.35:2.25),Math.sin(i*Math.PI/10)*(i%2?1.35:2.25)));const mid=(a:THREE.Vector2,b:THREE.Vector2)=>a.clone().add(b).multiplyScalar(.5);const start=mid(pts[19],pts[0]);s.moveTo(start.x,start.y);pts.forEach((p,i)=>{const m=mid(p,pts[(i+1)%20]);s.quadraticCurveTo(p.x,p.y,m.x,m.y)});s.closePath();return s;
}
export function roundedShape(w:number,h:number,r:number){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
/** `plateau` sets how much of the face is flat before it rolls over the rim. 4 is the approved default dome. Higher values give a flat, even face with the curve pushed out to the edge. */
export function cushion(kind:ShapeKind,plateau=4){const shape=outline(kind),edge=shape.getSpacedPoints(140).slice(0,-1),N=edge.length,L=40,positions:number[]=[],indices:number[]=[];const box=new THREE.Box2().setFromPoints(edge),center=box.getCenter(new THREE.Vector2());const depth=kind==='oval'?.23:kind==='circle'?.23:kind==='cloud'?.8:.72;for(let j=0;j<=L;j++){const theta=j/L*Math.PI,r=Math.sin(theta),z=Math.sign(Math.cos(theta))*depth*Math.sqrt(Math.max(0,1-r**plateau));for(let i=0;i<=N;i++){const p=edge[i%N];positions.push((p.x-center.x)*r,(p.y-center.y)*r,z);}}for(let j=0;j<L;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+N+1;indices.push(a,b,a+1,b,b+1,a+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;}
/** A cloud cushion, a round blob and a spark cushion with the same vertex layout, so one can be bent into the next (closing animation).
 * Positions sit in a unit box: x and y run -0.5 to 0.5 across each shape's own width and height, z runs -1 to 1. The mesh's scale gives the real size.
 * Both outlines are sampled at the same angles around their centres, so each bump of the cloud has a partner on the spark. */
export function reshapePair(plateau=12,N=180,L=40){
 const ring=(kind:ShapeKind)=>{
  const dense=outline(kind).getSpacedPoints(1800).slice(0,-1),box=new THREE.Box2().setFromPoints(dense),size=box.getSize(new THREE.Vector2()),mid=box.getCenter(new THREE.Vector2());
  const unit=dense.map(p=>({x:(p.x-mid.x)/size.x,y:(p.y-mid.y)/size.y})),angle=unit.map(p=>Math.atan2(p.y,p.x));
  return Array.from({length:N},(_,i)=>{
   const want=i/N*Math.PI*2-Math.PI;let best=0,gap=Infinity;
   for(let k=0;k<unit.length;k++){let d=Math.abs(angle[k]-want);if(d>Math.PI)d=Math.PI*2-d;if(d<gap){gap=d;best=k}}
   return unit[best];
  });
 };
 const round=Array.from({length:N},(_,i)=>{const a=i/N*Math.PI*2-Math.PI;return{x:Math.cos(a)*.5,y:Math.sin(a)*.5}});
 const build=(edge:{x:number;y:number}[])=>{
  const out=new Float32Array((L+1)*N*3);let o=0;
  for(let j=0;j<=L;j++){const theta=j/L*Math.PI,r=Math.sin(theta),z=Math.sign(Math.cos(theta))*Math.sqrt(Math.max(0,1-r**plateau));for(let i=0;i<N;i++){out[o++]=edge[i].x*r;out[o++]=edge[i].y*r;out[o++]=z}}
  return out;
 };
 const index:number[]=[];
 for(let j=0;j<L;j++)for(let i=0;i<N;i++){const a=j*N+i,a1=j*N+(i+1)%N,b=a+N,b1=a1+N;index.push(a,b,a1,b,b1,a1)}
 return{cloud:build(ring('cloud')),blob:build(round),spark:build(ring('burst')),index,N,L,aspect:{cloud:outlineAspect('cloud'),spark:outlineAspect('burst')}};
}
/** Height over width of a shape's outline. */
export function outlineAspect(kind:ShapeKind){const size=new THREE.Box2().setFromPoints(outline(kind).getSpacedPoints(200)).getSize(new THREE.Vector2());return size.y/size.x}
/** Writes the shape `amount` of the way from cloud (0) through a round blob (0.5) to spark (1) into `target`. With stagger above 0 the change runs around the outline, so the points come out one after another. */
export function blendReshape(target:Float32Array,pair:ReturnType<typeof reshapePair>,amount:number,stagger=0){
 const{cloud,blob,spark,N}=pair;
 for(let v=0,count=target.length/3;v<count;v++){
  const along=(v%N)/N,a=stagger>0?Math.max(0,Math.min(1,amount*(1+stagger)-stagger*along)):amount,o=v*3;
  const from=a<.5?cloud:blob,to=a<.5?blob:spark,k=a<.5?a*2:a*2-1;
  target[o]=from[o]+(to[o]-from[o])*k;target[o+1]=from[o+1]+(to[o+1]-from[o+1])*k;target[o+2]=cloud[o+2];
 }
}
export function slabGeometry(w:number,h:number){const s=roundedShape(w+.28,h+.28,.26);s.holes.push(roundedShape(w-.02,h-.02,.11));const g=new THREE.ExtrudeGeometry(s,{depth:.24,bevelEnabled:true,bevelSegments:6,steps:1,bevelSize:.085,bevelThickness:.085,curveSegments:24});g.center();return g;}
export function flatShape(kind:ShapeKind){const g=new THREE.ShapeGeometry(outline(kind),32);g.center();return g;}
export function svgShape(kind:ShapeKind){const pts=outline(kind).getSpacedPoints(140),box=new THREE.Box2().setFromPoints(pts),size=box.getSize(new THREE.Vector2());return pts.map((p,i)=>`${i?'L':'M'}${((p.x-box.min.x)/size.x*100).toFixed(2)},${((box.max.y-p.y)/size.y*100).toFixed(2)}`).join(' ')+'Z';}

/** Same rounded inset as the slab opening, with a tiny overlap to avoid seams. */
export function slabImageGeometry(w:number,h:number,crop?:PresentationCrop){
 const g=new THREE.ShapeGeometry(roundedShape(w,h,Math.min(.12,w/2,h/2)),24);
 const positions=g.getAttribute('position'),uv=g.getAttribute('uv');
 for(let i=0;i<positions.count;i++){
  const u=positions.getX(i)/w+.5,v=positions.getY(i)/h+.5;
  uv.setXY(i,crop?(crop.x+u*crop.width)/crop.sourceWidth:u,crop?1-(crop.y+(1-v)*crop.height)/crop.sourceHeight:v);
 }
 uv.needsUpdate=true;
 return g;
}
