import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,DisplayHit,floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {slabGeometry,slabImageGeometry} from '../visuals/geometry';
import {advanceFloat,advanceSlabSettle,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {motionTuning,useTuning,type TuningConfig} from '../editor/tuning';
import {galleryLayout,type GalleryPlacement} from './layouts';
import {advanceWipe,galleryMove,galleryPose,galleryTargets,galleryWindows,wipeHandle,wipePosition,wipeSeconds,wipeTarget,type GalleryMove} from './galleryMotion';
export {galleryTargets};
import type {SlideAsset,PresentationCrop} from '../data/types';
import type {SlideProps} from './types';
export const aspectOf=(a:SlideAsset)=>a.presentationCrop?a.presentationCrop.width/a.presentationCrop.height:a.exportedWidth&&a.exportedHeight?a.exportedWidth/a.exportedHeight:a.width&&a.height?a.width/a.height:16/9;
const dial=(p:GalleryPlacement):TuningConfig=>({x:[p.x,0,100,.5],y:[p.y,0,100,.5],width:[p.width,5,100,.5],rotation:[p.rotation,-.6,.6,.01],z:[p.z,-3,8,.1]});
const group=(list:GalleryPlacement[],name:string):TuningConfig=>Object.fromEntries(list.map((p,i)=>[`${name}${i+1}`,dial(p)]));
/** Draws the before picture right of the divider and the after picture left of it, plus the divider and its round handle. divide runs 0 (all before) to 1 (all after). knob is the handle's radius. */
const wipeShader={
 vertexShader:'varying vec2 vUv;varying vec2 vP;void main(){vUv=uv;vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D before;uniform sampler2D after;uniform float divide;uniform float shade;uniform float w;uniform float show;uniform float knob;varying vec2 vUv;varying vec2 vP;
void main(){
 float edge=(divide-.5)*w;
 vec4 c=vP.x<edge?texture2D(after,vUv):texture2D(before,vUv);
 c.rgb*=shade;
 vec3 ink=vec3(.03,.035,.09);
 float d=abs(vP.x-edge);
 c.rgb=mix(c.rgb,ink,(1.-smoothstep(.022,.034,d))*show);
 if(knob>0.){
  vec2 q=vec2(d,abs(vP.y));float r=length(q);
  float disc=(1.-smoothstep(knob,knob+.012,r))*show;
  c.rgb=mix(c.rgb,ink,disc);
  c.rgb=mix(c.rgb,vec3(1.),(1.-smoothstep(knob-.04,knob-.028,r))*show);
  float arrow=step(knob*.24,q.x)*step(q.x+q.y,knob*.62);
  c.rgb=mix(c.rgb,ink,arrow*disc);
 }
 gl_FragColor=vec4(c.rgb,1.);
 #include <colorspace_fragment>
}`};
const config:TuningConfig={wipe:{hold:[galleryLayout.wipe.hold,0,4,.05]},motion:{seconds:[galleryLayout.motion.seconds,.1,3,.05],lift:[galleryLayout.motion.lift,0,3,.1],part:[galleryLayout.motion.part,0,12,.5],pinch:[galleryLayout.motion.pinch,.2,1,.02],dim:[galleryLayout.motion.dim,.2,1,.02]},maxHeight:[galleryLayout.maxHeight,30,100,1],slotMaxHeight:[galleryLayout.slotMaxHeight,20,100,1],featured:dial(galleryLayout.featured),cluster:group(galleryLayout.cluster,'slab'),parked:group(galleryLayout.parked,'slot')};
const pick=(o:Record<string,GalleryPlacement>|undefined,n:number,name:string)=>Array.from({length:n},(_,i)=>o?.[`${name}${i+1}`]);
type Pose=GalleryPlacement;
function GallerySlab({before,wipeTo,wipe,src,crop,aspect,at,featuredWidth,stepKey,seconds,metrics,front,seedKey,move,lift,part,pinch,dim}:{before?:string;wipeTo:number;wipe:{hold:number};front:boolean;seedKey:string;move:GalleryMove;lift:number;part:number;pinch:number;dim:number;src:string;crop?:PresentationCrop;aspect:number;at:Pose;featuredWidth:number;stepKey:number;seconds:number;metrics:StageMetrics}){
 const texture=useTexture(src);texture.colorSpace=THREE.SRGBColorSpace;
 // A slab with no before picture loads its own image twice, which costs nothing, so the hook order never changes.
 const beforeTexture=useTexture(before??src);beforeTexture.colorSpace=THREE.SRGBColorSpace;
 const wiping=useRef({wait:0,p:wipeTo}),uniforms=useMemo(()=>({before:{value:beforeTexture},after:{value:texture},divide:{value:wipeTo},shade:{value:1},w:{value:1},show:{value:0},knob:{value:0}}),[beforeTexture,texture]);// eslint-disable-line react-hooks/exhaustive-deps
 // Built by hand so the frame loop writes to the very uniforms the material reads.
 const wipeMaterial=useMemo(()=>new THREE.ShaderMaterial({...wipeShader,uniforms,toneMapped:false}),[uniforms]);
 const w=featuredWidth/100*metrics.worldWidth,h=w/aspect;
 const geometry=useMemo(()=>slabGeometry(w,h),[w,h]),imageGeometry=useMemo(()=>slabImageGeometry(w,h,crop),[w,h,crop]);
 const ref=useRef<THREE.Group>(null),image=useRef<THREE.MeshBasicMaterial>(null),shade=useRef(dim),target=useRef(at);target.current=at;
 const cur=useRef<Pose|null>(null),run=useRef<{key:number;from:Pose|null;p:number}>({key:stepKey,from:null,p:1}),elapsed=useRef(0),fclock=useRef(0),tiltK=useRef(front?.5:1),seed=useMemo(()=>seedOf(seedKey),[seedKey]);
 useFrame((_s,delta)=>{
  const g=ref.current;if(!g)return;const to=target.current,r=run.current;
  if(!cur.current||!metrics.animate){cur.current={...to};r.key=stepKey;r.p=1;elapsed.current=0;wiping.current={wait:0,p:wipeTo}}
  else{
   if(r.key!==stepKey){r.key=stepKey;r.from={...cur.current};r.p=0}
   // Bounded local frame time, never a subtraction from the global clock (see DESIGN.md).
   if(r.p<1)r.p=Math.min(1,r.p+Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)/Math.max(.05,seconds));
   // Depth, size and travel each run in their own part of the move, so slabs swap depth only while apart (galleryMotion.ts).
   cur.current=galleryPose(r.from??to,to,r.p,move,lift,part,pinch);
   elapsed.current=advanceSlabSettle(elapsed.current,delta);
   // The before picture rests until the slab has arrived and `hold` has passed, then the divider crosses.
   if(before)wiping.current=advanceWipe(wiping.current,wipeTo,delta,seconds+wipe.hold,wipeSeconds);
  }
  if(before){const at=wipePosition(wiping.current.p);uniforms.divide.value=at;uniforms.show.value=wipeHandle(at);uniforms.w.value=w;uniforms.knob.value=Math.min(.3,h*.09)}
  const c=cur.current!,settle=metrics.animate?Math.exp(-elapsed.current*motionTuning.settleRate):0;
  // The featured slab keeps half the resting tilt so the image stays readable. The tilt blends with bounded local time.
  const goal=front?.5:1;tiltK.current=metrics.animate?tiltK.current+(goal-tiltK.current)*Math.min(1,Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)*6):goal;
  const rest=tiltNow(c.x,seed,tiltK.current),wp=worldPosition(c.x,c.y,metrics,c.z);let f={x:0,y:0,rotX:0,rotY:0,rotZ:0};
  if(metrics.animate){fclock.current=advanceFloat(fclock.current,delta);f=floatNow(fclock.current,seed)}
  // Images behind a featured one dim a little, so the front image reads as the subject.
  shade.current=metrics.animate?shade.current+(dim-shade.current)*Math.min(1,Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)*5):dim;image.current?.color.setScalar(shade.current);uniforms.shade.value=shade.current;
  g.position.set(wp[0]+f.x,wp[1]+f.y,wp[2]);g.scale.setScalar(c.width/featuredWidth);g.rotation.set(.1*settle+rest.rotX+f.rotX,(c.x>50?-.22:.22)*settle+rest.rotY+f.rotY,c.rotation+f.rotZ);
 });
 return <group ref={ref}><mesh geometry={geometry}><ChromeMaterial/></mesh><mesh geometry={imageGeometry} position={[0,0,.23]}>{before?<primitive object={wipeMaterial} attach="material"/>:<meshBasicMaterial ref={image} map={texture} toneMapped={false}/>}</mesh></group>
}
/** Several images as silver slabs. Each in-slide step brings one to the front and parks the rest behind it. */
export function Gallery(props:SlideProps){
 const {slide,step=0}=props,assets=slide.assets,{motion}=useVisualState();
 const t=useTuning('Gallery',config,{id:'gallery',persist:true}) as unknown as {wipe:{hold:number};motion:{seconds:number;lift:number;part:number;pinch:number;dim:number};maxHeight:number;slotMaxHeight:number;featured:GalleryPlacement;cluster:Record<string,GalleryPlacement>;parked:Record<string,GalleryPlacement>};
 // A slide with a heading fits every slab below it: y maps into the space under headingTop, and the height cap shrinks with it.
 const top=slide.text.length?galleryLayout.headingTop:0,fit=(100-top)/100;
 const raw=galleryTargets(assets.length,step,pick(t.cluster,galleryLayout.cluster.length,'slab') as GalleryPlacement[],t.featured,pick(t.parked,galleryLayout.parked.length,'slot') as GalleryPlacement[]);
 // The step we came from decides each slab's role in the move. Kept in a ref so a re-render mid-move does not change it.
 const hist=useRef({step,from:step});if(hist.current.step!==step)hist.current={step,from:hist.current.step};
 const featuring=step>=1&&step<=assets.length,moveOf=(i:number)=>galleryMove(i,assets.length,hist.current.from,step);
 const wipe={hold:t.wipe.hold};
 const jump=props.paused||!motion,seconds=t.motion.seconds,featuredWidth=(i:number)=>Math.min(t.featured.width,t.maxHeight*fit*aspectOf(assets[i])*9/16);
 // Width is capped by height for the featured slab and, more tightly, for the rest; y is then kept inside the stage.
 const targets=raw.map((p,i)=>{const cap=(p===t.featured?t.maxHeight:t.slotMaxHeight)*fit,width=Math.min(p.width,cap*aspectOf(assets[i])*9/16),half=width*16/9/aspectOf(assets[i])/2;return{...p,width,y:Math.max(top+half+2,Math.min(100-half-2,top+p.y*fit))}});
 return <Stage {...props} className="content-stage content-gallery" scene={m=><>{assets.map((a,i)=>{if(!a.src||a.status!=='ready')throw new Error(`Missing ready image ${a.id} for slide ${slide.id}`);const to=targets[i];return <GallerySlab key={a.id} before={galleryLayout.wipe.before[a.id]} wipeTo={wipeTarget(i,step)} wipe={wipe} src={a.src} crop={a.presentationCrop} aspect={aspectOf(a)} at={to} featuredWidth={featuredWidth(i)} stepKey={step} seconds={seconds} metrics={m} front={featuring&&i===step-1} seedKey={a.id} move={moveOf(i)} lift={t.motion.lift} part={t.motion.part} pinch={t.motion.pinch} dim={featuring&&i!==step-1?t.motion.dim:1}/>})}</>}>{()=><>{assets.map((a,i)=>{const to=targets[i],w=galleryWindows(moveOf(i)),span=([a,b]:readonly [number,number])=>`${((b-a)*seconds).toFixed(3)}s ease-in-out ${(a*seconds).toFixed(3)}s`;
  // The click targets follow the same timing as the slabs, and the featured one is always on top.
  const move=jump?'none':`left ${span(w.travel)},top ${span(w.travel)},width ${span(w.size)},transform ${span(w.travel)}`;
  return <DisplayHit key={a.id} assetId={a.id} src={a.src} crop={a.presentationCrop} alt={a.alt} at={{x:to.x,y:to.y,width:to.width}} aspect={aspectOf(a)} onOpen={props.onImageOpen} style={{transform:`translate(-50%,-50%) rotate(${-to.rotation}rad)`,transition:move,zIndex:featuring&&i===step-1?30:5+Math.round(to.z*2)}}/>})}{slide.text.length>0&&<div className="image-heading">{slide.text.map(n=><span key={n.id} data-source-node={n.id}>{n.text}</span>)}</div>}</>}</Stage>
}
