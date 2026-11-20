import {useEffect,useMemo,useRef,type RefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeLabel,ChromeMaterial,DisplayHit,FallbackLine,LiquidMaterial,ThreadMaterial,floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {cushion,slabGeometry,slabImageGeometry} from '../visuals/geometry';
import {advanceFloat,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {trailLayout as L} from './layouts';
import {trailPose,type TrailPose,type TrailSpec,type TrailVariation} from './trailMotion';
import {sourceText,type SlideProps} from './types';
import {threadRadius,threadSway,trimThreadSegment} from '../visuals/threadProfile';
import {motionTuning} from '../editor/tuning';
/** ?trail=1, 2 or 3 picks a variation while comparing them; without it the layout's own choice is used. */
const variation=():TrailVariation=>{const v=Number(new URLSearchParams(location.search).get('trail'));return v===1||v===2||v===3?v:L.variation as TrailVariation};
const specOf=(v:TrailVariation):TrailSpec=>({slab:L.slab,diagram:L.diagram,chain:L.chains[v] as TrailSpec['chain']});
/** Label size on slide 13 (Diagram.tsx), for a disc 22 wide. Labels scale with their disc from there. */
const FONT=(m:StageMetrics)=>Math.min(52,m.width*.037);
type Labels={left:RefObject<HTMLDivElement|null>;right:RefObject<HTMLDivElement|null>;question:RefObject<HTMLDivElement|null>};
/** Writes one label's place and size straight to its element, so it stays on its disc on every frame. */
function setLabel(el:HTMLDivElement|null,x:number,y:number,width:number,height:number,opacity:number,font:number){
 if(!el)return;const s=el.style;s.left=`${x}%`;s.top=`${y}%`;s.width=`${width}%`;s.height=`${height}%`;s.opacity=`${opacity}`;s.setProperty('--object-font',`${font}px`);
}
const ALONG=30,AROUND=16;
function linkGeometry(){
 const g=new THREE.BufferGeometry(),count=(ALONG+1)*(AROUND+1),index:number[]=[];
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(count*3),3));
 for(let i=0;i<ALONG;i++)for(let j=0;j<AROUND;j++){const a=i*(AROUND+1)+j,b=a+AROUND+1;index.push(a,b,a+1,b,b+1,a+1)}
 g.setIndex(index);return g;
}
/** Reshapes a link into a round tube from a to b (world units) that is ra thick at a, rb at b and `neck` halfway. */
function shapeLink(g:THREE.BufferGeometry,ax:number,ay:number,bx:number,by:number,z:number,ra:number,rb:number,neck:number,flare:number,profile?:(s:number)=>{radius:number;sway:number}){
 const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
 if(len<1e-3){g.setDrawRange(0,0);return}
 g.setDrawRange(0,Infinity);
 const tx=dx/len,ty=dy/len,sx=-ty,sy=tx,pos=g.getAttribute('position') as THREE.BufferAttribute,nor=g.getAttribute('normal') as THREE.BufferAttribute;
 const radius=(s:number)=>profile?profile(s).radius:s<.5?neck+(ra-neck)*(1-2*s)**flare:neck+(rb-neck)*(2*s-1)**flare;
 for(let i=0;i<=ALONG;i++){
  const s=i/ALONG,r=radius(s),sway=profile?.(s).sway??0,cx=ax+dx*s+sx*sway,cy=ay+dy*s+sy*sway;
  // Where the tube widens, its surface leans along its length; without this it would shade like a plain pipe.
  const slope=(radius(Math.min(1,s+.01))-radius(Math.max(0,s-.01)))/((Math.min(1,s+.01)-Math.max(0,s-.01))*len);
  for(let j=0;j<=AROUND;j++){
   const a=j/AROUND*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a),k=i*(AROUND+1)+j,nx=sx*cs,ny=sy*cs;
   pos.setXYZ(k,cx+nx*r,cy+ny*r,z+sn*r);
   const lx=nx-tx*slope,ly=ny-ty*slope,ll=Math.hypot(lx,ly,sn)||1;nor.setXYZ(k,lx/ll,ly/ll,sn/ll);
  }
 }
 pos.needsUpdate=true;nor.needsUpdate=true;
}
/** Everything on the slide, placed each frame from one number, t: 0 is the screenshot, 1 is the slide 13 diagram, 2 is the string of nodes. See trailMotion.ts.
 * Depth only decides what covers what (the camera has no perspective): slab in front, then the pill, then the two discs, with nodes and links behind them. */
function TrailScene({step,metrics,v,labels}:{step:number;metrics:StageMetrics;v:TrailVariation;labels:Labels}){
 const S=useMemo(()=>specOf(v),[v]),n=S.chain.nodes.length;
 const texture=useTexture(L.slab.src);texture.colorSpace=THREE.SRGBColorSpace;
 const sw=L.slab.width/100*metrics.worldWidth,sh=sw/L.slab.aspect;
 const geo=useMemo(()=>({slab:slabGeometry(sw,sh),image:slabImageGeometry(sw,sh),disc:cushion('circle'),pill:cushion('oval'),ball:new THREE.SphereGeometry(1,48,32),cone:new THREE.ConeGeometry(.16,.42,20),links:Array.from({length:n+1},linkGeometry)}),[sw,sh,n]);
 useEffect(()=>()=>{[geo.slab,geo.image,geo.disc,geo.pill,geo.ball,geo.cone,...geo.links].forEach(g=>g.dispose())},[geo]);
 const slab=useRef<THREE.Group>(null),pill=useRef<THREE.Mesh>(null),discs=useRef<(THREE.Mesh|null)[]>([]),balls=useRef<(THREE.Mesh|null)[]>([]),cone=useRef<THREE.Mesh>(null);
 const t=useRef(Math.max(0,Math.min(2,step))),fclock=useRef(0),seeds=useMemo(()=>Array.from({length:n+4},(_,i)=>seedOf(`trail-${v}-${i}`)),[n,v]);
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate(2)},[step,invalidate]);
 const up=useMemo(()=>new THREE.Vector3(0,1,0),[]),dir=useMemo(()=>new THREE.Vector3(),[]);
 useFrame((_s,delta)=>{
  const to=Math.max(0,Math.min(2,step));
  if(!metrics.animate)t.current=to;
  else{
   // Bounded local frame time, never a subtraction from the global clock (see DESIGN.md). Each step has its own length.
   const d=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05),rise=to>t.current,seconds=L.seconds[(rise?t.current<1:t.current<=1)?0:1];
   t.current=rise?Math.min(to,t.current+d/seconds):Math.max(to,t.current-d/seconds);
   fclock.current=advanceFloat(fclock.current,delta);
  }
  const P=trailPose(v,t.current,S),W=metrics.worldWidth,drift=(seed:number)=>metrics.animate?floatNow(fclock.current,seed):{x:0,y:0,rotX:0,rotY:0,rotZ:0};
  if(slab.current){
   const g=slab.current;g.visible=P.slab.scale>.002;
   if(g.visible){const wp=worldPosition(P.slab.x,P.slab.y,metrics,3),rest=tiltNow(P.slab.x,seeds[0],.5),f=drift(seeds[0]);g.position.set(wp[0]+f.x,wp[1]+f.y,wp[2]);g.scale.setScalar(P.slab.scale);g.rotation.set(rest.rotX+f.rotX,rest.rotY+f.rotY,P.slab.rotation+f.rotZ)}
  }
  if(pill.current){
   const m=pill.current,cap=L.diagram.capsule,sx=cap.width/100*W/1.25,sy=cap.height/100*10/.8,k=P.capsule.scale;m.visible=k>.002;
   if(m.visible){const wp=worldPosition(P.capsule.x,P.capsule.y,metrics,2),f=drift(seeds[1]);m.position.set(wp[0]+f.x,wp[1]+f.y,wp[2]);m.scale.set(sx*k,sy*k,Math.min(sx,sy)*k);m.rotation.set(f.rotX,f.rotY,f.rotZ)}
  }
  // The path the links follow: left disc, every node, right disc. World units, drift included, so the links stay attached.
  const path:{x:number;y:number;r:number}[]=[];
  P.ends.forEach((e,i)=>{
   const m=discs.current[i],r=e.width/100*W/2,wp=worldPosition(e.x,e.y,metrics,1),f=drift(seeds[2+i]),x=wp[0]+f.x,y=wp[1]+f.y;
   if(m){m.visible=r>.002;if(m.visible){m.position.set(x,y,1);m.scale.setScalar(r);m.rotation.set(f.rotX,f.rotY,f.rotZ)}}
   path[i?n+1:0]={x,y,r};
   const el=(i?labels.right:labels.left).current;
   setLabel(el,(x/W+.5)*100,(.5-y/10)*100,e.width,e.width*16/9,P.labels.ends,FONT(metrics)*e.width/L.diagram.left.width);
  });
  P.nodes.forEach((node,j)=>{
   const m=balls.current[j],wp=worldPosition(node.x,node.y,metrics,0),f=drift(seeds[4+j]),k=Math.min(1,node.r/Math.max(.001,S.chain.nodes[j].r)),u=(j+1)/(n+1),a=drift(seeds[2]),b=drift(seeds[3]);
   // Unborn nodes follow the same straight thread between the drifting discs. Their own float arrives with their size.
   const x=wp[0]+(a.x+(b.x-a.x)*u)*(1-k)+f.x*1.5*k,y=wp[1]+(a.y+(b.y-a.y)*u)*(1-k)+f.y*1.5*k;
   if(m){m.visible=node.r>.002;if(m.visible){m.position.set(x,y,0);m.scale.setScalar(node.r)}}
   path[j+1]={x,y,r:node.r};
  });
  setLabel(labels.question.current,P.capsule.x,P.capsule.y,L.diagram.capsule.width,L.diagram.capsule.height,P.labels.question,FONT(metrics)*1.6*Math.max(.01,P.capsule.scale));
  // The arrowhead touches the right disc, pointing along the last link. That link stops at the arrowhead while there is one.
  const last=path[n+1],prev=path[n];dir.set(last.x-prev.x,last.y-prev.y,0);
  const gap=dir.length();
  if(gap>1e-4)dir.multiplyScalar(1/gap);else dir.set(1,0,0);
  if(cone.current){const c=cone.current;c.visible=P.arrow>.002&&gap>1e-3;if(c.visible){c.position.set(last.x-dir.x*(last.r+.213),last.y-dir.y*(last.r+.213),-.6);c.quaternion.setFromUnitVectors(up,dir);c.scale.setScalar(P.arrow)}}
  const pts=path,lengths=P.links.map((_,i)=>Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y));
  const total=lengths.reduce((a,b)=>a+b,0),visibleLength=total*P.grow,blend=1-Math.min(1,Math.max(0,t.current-1)*3);
  let offset=0;
  P.links.forEach((link,i)=>{
   const a=pts[i],b=pts[i+1],len=lengths[i],interval=trimThreadSegment(offset,len,total,path[0].r,last.r,P.arrow);
   const start=interval?.start??0,end=Math.min(interval?.end??0,len>1e-6?(visibleLength-offset)/len:0),base=offset;
   offset+=len;
   if(end<=start){geo.links[i].setDrawRange(0,0);return}
   const profile=(s:number)=>{
    const along=start+(end-start)*s,u=(base+len*along)/Math.max(.001,total),plain=along<.5?link.neck+(link.ra-link.neck)*(1-2*along)**P.flare:link.neck+(link.rb-link.neck)*(2*along-1)**P.flare;
    return{radius:plain*(1-blend)+threadRadius(u,total,fclock.current,motionTuning.beadSpeed,metrics.animate)*blend,sway:threadSway(u,total,fclock.current,metrics.animate)*blend};
   };
   shapeLink(geo.links[i],a.x+(b.x-a.x)*start,a.y+(b.y-a.y)*start,a.x+(b.x-a.x)*end,a.y+(b.y-a.y)*end,-.6,link.ra,link.rb,link.neck,P.flare,profile);
  });
 });
 const Ball=v===1?ChromeMaterial:LiquidMaterial;
 return <>
  <group ref={slab} visible={false}><mesh geometry={geo.slab}><ChromeMaterial/></mesh><mesh geometry={geo.image} position={[0,0,.23]}><meshBasicMaterial map={texture} toneMapped={false}/></mesh></group>
  <mesh ref={pill} geometry={geo.pill} visible={false}><ChromeMaterial/></mesh>
  {[0,1].map(i=><mesh key={i} ref={m=>{discs.current[i]=m}} geometry={geo.disc} visible={false}><ChromeMaterial/></mesh>)}
  {S.chain.nodes.map((_,j)=><mesh key={j} ref={m=>{balls.current[j]=m}} geometry={geo.ball} visible={false}><Ball/></mesh>)}
  {geo.links.map((g,i)=><mesh key={i} geometry={g} frustumCulled={false}><ThreadMaterial/></mesh>)}
  <mesh ref={cone} geometry={geo.cone} visible={false}><ThreadMaterial/></mesh>
 </>
}
/** A screenshot that turns into the slide 13 diagram on step 1 and into a string of nodes on step 2 (slide 114:2). See trailLayout and trailMotion.ts. Reduced motion and pause snap. */
export function Trail(props:SlideProps){
 const {slide,step=0}=props,{motion}=useVisualState(),v=useMemo(variation,[]),S=useMemo(()=>specOf(v),[v]);
 const labels:Labels={left:useRef<HTMLDivElement>(null),right:useRef<HTMLDivElement>(null),question:useRef<HTMLDivElement>(null)};
 return <Stage {...props} className="diagram-stage content-trail" scene={m=><TrailScene step={step} metrics={m} v={v} labels={labels}/>}>{m=>{
  // What React draws is where the step ends. With 3D on, the scene moves the labels every frame on top of this. With 3D off, this is the whole picture.
  const P:TrailPose=trailPose(v,Math.max(0,Math.min(2,step)),S),cap=L.diagram.capsule,font=FONT(m),wait=m.animate&&motion?L.seconds[0]*.5:0;
  const line:[number,number][]=[P.ends[0],...(step>=2?P.nodes:[]),P.ends[1]].map(p=>[p.x,p.y]);
  return <>
   <DisplayHit src={L.slab.src} alt={L.slab.alt} at={{x:L.slab.x,y:L.slab.y,width:L.slab.width}} aspect={L.slab.aspect} onOpen={props.onImageOpen} style={{visibility:step<1?'visible':'hidden',transition:`visibility 0s linear ${step<1?wait:0}s`}}/>
   {step>=1&&<FallbackLine points={line} arrow/>}
   {P.ends.map((e,i)=><ChromeLabel key={i} labelRef={i?labels.right:labels.left} kind="circle" at={{x:e.x,y:e.y,width:e.width,height:e.width*16/9}} text={sourceText(slide,i?L.text.right:L.text.left)} sourceId={i?L.text.right:L.text.left} fontSize={font*e.width/L.diagram.left.width} opacity={P.labels.ends}/>)}
   <ChromeLabel labelRef={labels.question} kind="oval" at={{x:cap.x,y:cap.y,width:cap.width,height:cap.height}} text={sourceText(slide,L.text.question)} sourceId={L.text.question} fontSize={font*1.6*Math.max(.01,P.capsule.scale)} opacity={P.labels.question}/>
  </>}}</Stage>
}
