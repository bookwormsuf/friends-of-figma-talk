import {useEffect,useMemo,useRef,type CSSProperties} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,DisplayHit,floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {slabGeometry,slabImageGeometry} from '../visuals/geometry';
import {advanceFloat,advanceSlabSettle,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {motionTuning,useTuning,type TuningConfig} from '../editor/tuning';
import {morphLayout as L} from './layouts';
import {aspectOf} from './Gallery';
import type {SlideData,PresentationCrop} from '../data/types';
import type {SlideProps} from './types';
const config:TuningConfig={seconds:[L.seconds,.2,4,.05],maxWidth:[L.maxWidth,40,100,1],maxHeight:[L.maxHeight,30,100,1],imageY:[L.imageY,20,80,.5]};
type Tuned=typeof L;
const smooth=(p:number)=>p<.5?2*p*p:1-(-2*p+2)**2/2;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
type Era={slide:SlideData;src:string;alt:string;id:string;crop?:PresentationCrop;aspect:number};
/** Same rules the 'image' kind uses: fit inside maxWidth and maxHeight for the image's own aspect. Stage percent. */
const widthPct=(aspect:number,t:Tuned,m:StageMetrics)=>Math.min(t.maxWidth,t.maxHeight*m.height/m.width*aspect);
/** One silver slab for one era, sized to that era's own image aspect. It registers its group with the parent, which slides it. */
function EraSlab({era,texture,t,metrics,reg}:{era:Era;texture:THREE.Texture;t:Tuned;metrics:StageMetrics;reg:(g:THREE.Group|null)=>void}){
 const w=widthPct(era.aspect,t,metrics)/100*metrics.worldWidth,h=w/era.aspect;
 const slab=useMemo(()=>slabGeometry(w,h),[w,h]),img=useMemo(()=>slabImageGeometry(w,h,era.crop),[w,h,era.crop]);
 useEffect(()=>()=>{slab.dispose();img.dispose()},[slab,img]);
 const group=useRef<THREE.Group>(null);
 useEffect(()=>{reg(group.current);return()=>reg(null)});
 return <group ref={group}><mesh geometry={slab}><ChromeMaterial/></mesh><mesh geometry={img} position={[0,0,.23]}><meshBasicMaterial map={texture} toneMapped={false}/></mesh></group>
}
/** One slab per era, side by side on a row one stage width apart, like a film strip. Only the current era is on stage. A step change slides the whole row: going forward the next era comes in from the right and pushes the old one off to the left, going back it reverses. */
function MorphSlabs({eras,step,t,metrics}:{eras:Era[];step:number;t:Tuned;metrics:StageMetrics}){
 const textures=useTexture(eras.map(e=>e.src)) as THREE.Texture[];
 useMemo(()=>textures.forEach(x=>{x.colorSpace=THREE.SRGBColorSpace}),[textures]);
 const root=useRef<THREE.Group>(null),groups=useRef<(THREE.Group|null)[]>([]);
 const target=useRef(step);target.current=clamp(step,0,eras.length-1);
 // pos is where the row is: 0 shows era 0, 1 shows era 1. A step change tweens it from where it is, so an interrupted slide stays continuous.
 const pos=useRef(target.current),run=useRef<{from:number;to:number;p:number}|null>(null),elapsed=useRef(0),fclock=useRef(0),seed=useMemo(()=>seedOf('morph-slab'),[]);
 const secondsRef=useRef(t.seconds);secondsRef.current=t.seconds;
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate(2)},[step,t.maxWidth,t.maxHeight,t.imageY,invalidate]);
 useFrame((_s,delta)=>{
  const g=root.current;if(!g)return;
  const to=target.current;
  if(!metrics.animate){pos.current=to;run.current=null;elapsed.current=0;fclock.current=0}
  else{
   if((!run.current&&pos.current!==to)||(run.current&&run.current.to!==to))run.current={from:pos.current,to,p:0};
   const r=run.current;
   if(r){
    // Bounded local frame time, never a subtraction from the global clock (see DESIGN.md).
    r.p=Math.min(1,r.p+Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)/Math.max(.05,secondsRef.current));
    pos.current=r.p>=1?r.to:r.from+(r.to-r.from)*smooth(r.p);
    if(r.p>=1)run.current=null;
   }
   elapsed.current=advanceSlabSettle(elapsed.current,delta);fclock.current=advanceFloat(fclock.current,delta);
  }
  eras.forEach((_e,k)=>{const gr=groups.current[k];if(!gr)return;const off=k-pos.current;gr.visible=Math.abs(off)<1.05;gr.position.x=off*metrics.worldWidth});
  const settle=metrics.animate?Math.exp(-elapsed.current*motionTuning.settleRate):0;
  const bp=worldPosition(50,t.imageY,metrics),rest=tiltNow(50,seed),f=metrics.animate?floatNow(fclock.current,seed):{x:0,y:0,rotX:0,rotY:0,rotZ:0};
  g.position.set(bp[0]+f.x,bp[1]+f.y,bp[2]);g.rotation.set(.1*settle+rest.rotX+f.rotX,.22*settle+rest.rotY+f.rotY,f.rotZ);
 });
 return <group ref={root}>{eras.map((e,k)=><EraSlab key={e.id} era={e} texture={textures[k]} t={t} metrics={metrics} reg={gr=>{groups.current[k]=gr}}/>)}</group>
}
/** One image per era, shown one at a time. The anchor slide (4:61) is era 0 and each pinned slide (4:64, 4:67) is the next step: each era has its own slab sized to its image. A step slides the next era in from the right over morphLayout.seconds, and its year slides with it. Reduced motion and pause snap. */
export function Morph(props:SlideProps){
 const {slide,pinned=[],step=0}=props,{motion}=useVisualState();
 if(!pinned.length)throw new Error(`Slide ${slide.id} needs pinned follower slides (see layouts.ts) to show its later eras.`);
 const t=useTuning('Morph',config,{id:'morph',persist:true}) as unknown as Tuned;
 const eras:Era[]=[slide,...pinned].map(s=>{const a=s.assets[0];if(!a||!a.src||a.status!=='ready')throw new Error(`Missing ready image for slide ${s.id}`);return{slide:s,src:a.src,alt:a.alt,id:a.id,crop:a.presentationCrop,aspect:aspectOf(a)}});
 const now=clamp(step,0,eras.length-1);
 return <Stage {...props} className="content-stage content-morph" scene={m=><MorphSlabs eras={eras} step={now} t={t} metrics={m}/>}>{m=>{
  const animate=m.animate&&motion,secs=animate?`${t.seconds}s`:'0s';
  return <>
   {eras.map((e,k)=>{const current=k===now;
    return <DisplayHit key={e.id} assetId={e.id} src={e.src} crop={e.crop} alt={e.alt} at={{x:50+(k-now)*100,y:t.imageY,width:widthPct(e.aspect,t,m)}} aspect={e.aspect} onOpen={props.onImageOpen}
     style={{visibility:current?'visible':'hidden',transition:animate?`left ${secs} ease-in-out,visibility 0s linear ${current?0:t.seconds}s`:'none'}}/>})}
   {eras.map((e,k)=><div key={e.slide.id} className="image-caption morph-caption raised-type" data-current={k===now} aria-hidden={k!==now} style={{'--morph-s':secs,'--morph-x':`${(k-now)*125}%`} as CSSProperties}>{e.slide.text.map(n=><span key={n.id} data-source-node={n.id}>{n.text}</span>)}</div>)}
  </>}}</Stage>
}
