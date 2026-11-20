import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,DisplayHit,floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {slabGeometry,slabImageGeometry} from '../visuals/geometry';
import {advanceFloat,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {splitLayout as L} from './layouts';
import {splitChild,splitParent,type SplitVariation} from './splitMotion';
import type {SlideProps} from './types';
type Panel={src:string;aspect:number;width:number;key:string};
/** ?split=1, 2 or 3 picks a variation while comparing them; without it the layout's own choice is used. */
const variation=():SplitVariation=>{const v=Number(new URLSearchParams(location.search).get('split'));return v===1||v===2||v===3?v:L.variation as SplitVariation};
function Slab({panel,metrics,reg}:{panel:Panel;metrics:StageMetrics;reg:(g:THREE.Group|null)=>void}){
 const texture=useTexture(panel.src);texture.colorSpace=THREE.SRGBColorSpace;
 const w=panel.width/100*metrics.worldWidth,h=w/panel.aspect;
 const slab=useMemo(()=>slabGeometry(w,h),[w,h]),img=useMemo(()=>slabImageGeometry(w,h),[w,h]);
 useEffect(()=>()=>{slab.dispose();img.dispose()},[slab,img]);
 const group=useRef<THREE.Group>(null);
 useEffect(()=>{reg(group.current);return()=>reg(null)});
 return <group ref={group} visible={false}><mesh geometry={slab}><ChromeMaterial/></mesh><mesh geometry={img} position={[0,0,.23]}><meshBasicMaterial map={texture} toneMapped={false}/></mesh></group>
}
/** The parent and its children as silver slabs. One number, p, runs from 0 (parent only) to 1 (children only) and every pose is read from it, so going back is the same move in reverse and an interrupted move stays continuous. */
function SplitScene({step,metrics}:{step:number;metrics:StageMetrics}){
 const parent:Panel={src:L.parent.src,aspect:L.parent.aspect,width:L.parent.width,key:'parent'},kids:Panel[]=L.children.map((c,i)=>({src:c.src,aspect:L.childAspect,width:L.childWidth,key:`child-${i}`}));
 const groups=useRef<(THREE.Group|null)[]>([]),p=useRef(step>=1?1:0),fclock=useRef(0),v=useMemo(variation,[]);
 const seeds=useMemo(()=>[parent,...kids].map(k=>seedOf(`split-${k.key}`)),[]);
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate(2)},[step,invalidate]);
 useFrame((_s,delta)=>{
  const to=step>=1?1:0;
  if(!metrics.animate)p.current=to;
  else{
   // Bounded local frame time, never a subtraction from the global clock (see DESIGN.md).
   const d=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)/Math.max(.05,L.seconds);
   p.current=to>p.current?Math.min(to,p.current+d):Math.max(to,p.current-d);
   fclock.current=advanceFloat(fclock.current,delta);
  }
  const place=(g:THREE.Group|null,x:number,y:number,z:number,scale:number,rotation:number,visible:boolean,seed:number)=>{
   if(!g)return;g.visible=visible&&scale>.002;if(!g.visible)return;
   const wp=worldPosition(x,y,metrics,z),rest=tiltNow(x,seed,.5),f=metrics.animate?floatNow(fclock.current,seed):{x:0,y:0,rotX:0,rotY:0,rotZ:0};
   g.position.set(wp[0]+f.x,wp[1]+f.y,wp[2]);g.scale.setScalar(scale);g.rotation.set(rest.rotX+f.rotX,rest.rotY+f.rotY,rotation+f.rotZ);
  };
  place(groups.current[0],L.parent.x,L.parent.y,0,splitParent(v,p.current),0,true,seeds[0]);
  // Children sit behind the parent, each on its own depth, so they come out from behind it and never cut through each other.
  L.children.forEach((c,i)=>{const pose=splitChild(v,i,L.children.length,p.current,L.parent,c,L.columns);place(groups.current[i+1],pose.x,pose.y,-2-i,pose.scale,pose.rotation,pose.visible,seeds[i+1])});
 });
 return <>{[parent,...kids].map((k,i)=><Slab key={k.key} panel={k} metrics={metrics} reg={g=>{groups.current[i]=g}}/>)}</>
}
/** One large panel that splits into several smaller ones on its single in-slide step (slide 27:99). See splitLayout and DESIGN.md. Reduced motion and pause snap. */
export function Split(props:SlideProps){
 const {slide,step=0}=props,{motion}=useVisualState(),split=step>=1,asset=slide.assets[0];
 if(!asset)throw new Error(`Slide ${slide.id} needs its source image to stay bound.`);
 return <Stage {...props} className="content-stage content-split" scene={m=><SplitScene step={step} metrics={m}/>}>{m=>{
  // The click targets swap once the move is over. They are the still images when 3D is off.
  const wait=m.animate&&motion?L.seconds:0,show=(on:boolean)=>({visibility:on?'visible':'hidden',transition:`visibility 0s linear ${on?wait:0}s`} as const);
  return <>
   <DisplayHit assetId={asset.id} src={L.parent.src} alt={L.parent.alt} at={{x:L.parent.x,y:L.parent.y,width:L.parent.width}} aspect={L.parent.aspect} onOpen={props.onImageOpen} style={show(!split)}/>
   {L.children.map(c=><DisplayHit key={c.src} src={c.src} alt={c.alt} at={{x:c.x,y:c.y,width:L.childWidth}} aspect={L.childAspect} onOpen={props.onImageOpen} style={{transform:`translate(-50%,-50%) rotate(${-c.rotation}rad)`,...show(split)}}/>)}
  </>}}</Stage>
}
