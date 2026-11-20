import {useEffect,useMemo,useRef,type CSSProperties,type Ref} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {cushion,outline,slabGeometry,slabImageGeometry,svgShape,type ShapeKind} from './geometry';
import type {PresentationCrop} from '../data/types';
import {CroppedImage} from './CroppedImage';
import {advanceFloat,advanceSlabSettle,floatPose,restingTilt,seedOf} from './slabMotion';
import {worldPosition,type StageMetrics} from './Stage';
import {motionTuning} from '../editor/tuning';
import {Glow} from './Glow';
import {threadRadius,threadSway} from './threadProfile';
import {palette} from '../theme/palette';
/** Live float and resting tilt, read from the global dials. */
export const floatNow=(t:number,seed:number)=>floatPose(t*motionTuning.floatSpeed,seed,motionTuning.floatAmount);
export const tiltNow=(x:number,seed:number,scale=1)=>restingTilt(x,seed,motionTuning.slabTilt*scale);
export type Placement={x:number;y:number;width:number;height?:number;rotation?:number};
const CHROME=new THREE.Color(palette.chrome.base);
export function ChromeMaterial({roughness=.17,tone=1,gloss=1}:{roughness?:number;tone?:number;gloss?:number}){const color=useMemo(()=>CHROME.clone().multiplyScalar(tone),[tone]);return <meshPhysicalMaterial color={color} side={THREE.DoubleSide} metalness={1} roughness={roughness} clearcoat={gloss} envMapIntensity={1.4}/>}
/** Optional per-use surface override. `depth` scales how far the shape bulges (1 is the approved default, lower is flatter). `roughness` blurs the reflections (default .17, higher is softer). `tone` darkens the metal itself (1 is the default, lower is darker). A rougher, flatter surface averages out to a lighter grey, so lower the tone with it to keep light lettering readable.
 * `plateau` flattens the face and moves the curve to the rim (default 4, higher is flatter and more even). `gloss` is the clear top coat that adds a sharp shine (default 1, 0 is none). */
export type ChromeFinish={depth?:number;roughness?:number;tone?:number;plateau?:number;gloss?:number};
/** The house finish for clouds, bursts and ovals: a flat, smooth, polished face with the curve at the rim, so lettering sits on an even surface. Chosen by Sufyan on 15 November 2026. Circles keep the older dome. */
export const smoothChrome:ChromeFinish={depth:.5,roughness:.2,tone:.66,plateau:12};
/** A chrome cloud, burst or oval. Clouds and bursts carry a soft glow behind them, in the same group, so it floats with the shape. */
export function ChromeObject({kind,at,metrics,finish}:{kind:ShapeKind;at:Placement;metrics:StageMetrics;finish?:ChromeFinish}){
 // A slide can still pass its own finish. Without one, everything but circles gets the house finish.
 finish??=kind==='circle'?undefined:smoothChrome;
 const geometry=useMemo(()=>cushion(kind,finish?.plateau),[kind,finish?.plateau]),ref=useRef<THREE.Group>(null);
 const dimensions=useMemo(()=>new THREE.Box2().setFromPoints(outline(kind).getSpacedPoints(100)).getSize(new THREE.Vector2()),[kind]);
 const w=at.width/100*metrics.worldWidth,sx=w/dimensions.x,sy=at.height?(at.height/100*10)/dimensions.y:sx,h=dimensions.y*sy;
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const seed=useMemo(()=>seedOf(`${kind}-${at.x}-${at.y}`),[kind,at.x,at.y]),fclock=useRef(0);
 // The glow may spread about as far as the nearest stage edge. It fades out before its own edge, so the stage never clips it visibly.
 const reach=Math.max(.66,Math.min(2.64,1.045*Math.min(at.x/100*metrics.worldWidth-w/2,(1-at.x/100)*metrics.worldWidth-w/2,at.y/10-h/2,10-at.y/10-h/2)));
 useFrame(({clock},delta)=>{const m=ref.current;if(!m)return;const base=worldPosition(at.x,at.y,metrics);
  if(metrics.animate){fclock.current=advanceFloat(fclock.current,delta);const f=floatNow(fclock.current,seed);m.position.set(base[0]+f.x,base[1]+f.y,base[2]);m.rotation.set(f.rotX,Math.sin(clock.elapsedTime*.21+at.x)*.04+f.rotY,(at.rotation||0)+f.rotZ)}
  else{m.position.set(...base);m.rotation.set(0,0,at.rotation||0)}});
 return <group ref={ref} position={worldPosition(at.x,at.y,metrics)} rotation={[0,0,at.rotation||0]}>
  {(kind==='cloud'||kind==='burst')&&<Glow kind={kind} w={w} h={h} reach={reach} seed={seed} animate={metrics.animate}/>}
  <mesh geometry={geometry} scale={[sx,sy,Math.min(sx,sy)*(finish?.depth??1)]}><ChromeMaterial roughness={finish?.roughness} tone={finish?.tone} gloss={finish?.gloss}/></mesh>
 </group>
}
export function ChromeLabel({kind,at,text,fontSize,sourceId,className='',labelRef,opacity}:{kind:ShapeKind;at:Placement;text:string;fontSize?:number;sourceId?:string;className?:string;labelRef?:Ref<HTMLDivElement>;opacity?:number}){const id=`chrome-${sourceId?.replace(':','-')||kind}-${at.x}`;return <div ref={labelRef} className={`chrome-label ${className}`} style={{left:`${at.x}%`,top:`${at.y}%`,width:`${at.width}%`,height:`${at.height||20}%`,opacity,'--object-font':fontSize?`${fontSize}px`:undefined} as CSSProperties}><svg className="shape-fallback" viewBox="-4 -4 108 108" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stopColor={palette.chrome.shapeFallbackStart}/><stop offset=".22" stopColor={palette.chrome.shapeFallbackDark}/><stop offset=".44" stopColor={palette.chrome.shapeFallbackGleam}/><stop offset=".7" stopColor={palette.chrome.shapeFallbackShade}/><stop offset="1" stopColor={palette.chrome.shapeFallbackEnd}/></linearGradient></defs><path d={svgShape(kind)} fill={`url(#${id})`} stroke={palette.chrome.shapeFallbackOutline} strokeWidth="1.4"/></svg><span className="raised-type" data-source-node={sourceId}>{text}</span></div>}
export function LiquidMaterial(){return <meshPhysicalMaterial color={palette.chrome.liquid} side={THREE.DoubleSide} metalness={1} roughness={.05} clearcoat={1} clearcoatRoughness={.04} envMapIntensity={1.9}/>}
const LINE={along:120,around:16,base:.07,swell:.42,pulse:.11,pulseLength:.65,sway:.04};
/** Softer than LiquidMaterial: on something this thin a sharp mirror breaks into separate bright strands, and a rougher finish reads as one body of metal. */
export function ThreadMaterial(){return <meshPhysicalMaterial color={palette.chrome.thread} side={THREE.DoubleSide} metalness={1} roughness={.3} clearcoat={.5} clearcoatRoughness={.3} envMapIntensity={3}/>}
/** A thread of liquid metal through the given stage points. Its thickness swells and thins slowly along its length, it sways a little between its fixed ends,
 * and a pulse travels down it as a bulge in the thread itself, like a drop running through mercury. One mesh, reshaped each frame. */
export function MetalLine({points,metrics,arrow=false}:{points:[number,number][];metrics:StageMetrics;arrow?:boolean}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(...worldPosition(x,y,metrics,-.6)))),[points,metrics.worldWidth]);
 const {geometry,centres,tangents,sides,length}=useMemo(()=>{
  const A=LINE.along,R=LINE.around,centres=curve.getSpacedPoints(A),tangents=centres.map((_,i)=>curve.getTangentAt(i/A).normalize());
  // The curve lies flat at one depth, so "sideways" is the tangent turned a quarter turn in the stage plane.
  const sides=tangents.map(t=>new THREE.Vector3(-t.y,t.x,0).normalize()),g=new THREE.BufferGeometry(),index:number[]=[];
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((A+1)*(R+1)*3),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array((A+1)*(R+1)*3),3));
  for(let i=0;i<A;i++)for(let j=0;j<R;j++){const a=i*(R+1)+j,b=a+R+1;index.push(a,b,a+1,b,b+1,a+1)}
  g.setIndex(index);return{geometry:g,centres,tangents,sides,length:curve.getLength()};
 },[curve]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const time=useRef(0),mesh=useRef<THREE.Mesh>(null),radii=useMemo(()=>new Float32Array(LINE.along+1),[]);
 useFrame((_,delta)=>{
  if(metrics.animate)time.current+=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05);
  const t=time.current,A=LINE.along,R=LINE.around,pos=geometry.getAttribute('position') as THREE.BufferAttribute,nor=geometry.getAttribute('normal') as THREE.BufferAttribute;
  // The pulse runs a little past both ends so it enters and leaves smoothly. Its length is in world units, so short and long lines get the same drop.
  for(let i=0;i<=A;i++)radii[i]=threadRadius(i/A,length,t,motionTuning.beadSpeed,metrics.animate);
  for(let i=0;i<=A;i++){const u=i/A,c=centres[i],side=sides[i],tan=tangents[i],r=radii[i];
   const sway=metrics.animate?threadSway(u,length,t,metrics.animate):0;
   // Where the radius changes, the surface leans along the thread; without this the bulge would shade like a plain tube.
   const slope=(radii[Math.min(A,i+1)]-radii[Math.max(0,i-1)])/(length/A*(i===0||i===A?1:2));
   for(let j=0;j<=R;j++){const a=j/R*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a),k=i*(R+1)+j;
    const nx=side.x*cs,ny=side.y*cs,nz=sn;
    pos.setXYZ(k,c.x+side.x*sway+nx*r,c.y+side.y*sway+ny*r,c.z+nz*r);
    const lx=nx-tan.x*slope,ly=ny-tan.y*slope,lz=nz-tan.z*slope,len=Math.hypot(lx,ly,lz)||1;nor.setXYZ(k,lx/len,ly/len,lz/len)}}
  pos.needsUpdate=true;nor.needsUpdate=true;
 });
 const end=curve.getPoint(1),direction=curve.getTangent(1);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
 return <><mesh ref={mesh} geometry={geometry} frustumCulled={false}><ThreadMaterial/></mesh>{arrow&&<mesh position={end} quaternion={q}><coneGeometry args={[.16,.42,20]}/><ThreadMaterial/></mesh>}</>}
export function FallbackLine({points,arrow=false}:{points:[number,number][];arrow?:boolean}){return <svg className="line-fallback" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke={palette.chrome.lineFallback} strokeWidth=".25"/>{arrow&&<path d={`M${points.at(-1)![0]-1},${points.at(-1)![1]-1}L${points.at(-1)![0]},${points.at(-1)![1]}L${points.at(-1)![0]-1},${points.at(-1)![1]+1}`} fill="none" stroke={palette.chrome.lineFallback} strokeWidth=".3"/>}</svg>}
const REVEAL_SECONDS=.45;
/** Overshoots slightly on the way in, so a revealed slab pops; the way out is a plain ease. */
const easeOutBack=(t:number)=>t>=1?1:t<=0?0:1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2);
/** `visible` scales the slab in or out over REVEAL_SECONDS with bounded local time; a slab that becomes visible replays its settle. */
export function SilverSlab({src,at,metrics,aspect=1.6,crop,visible=true,tiltScale=1,sideX,floatKey}:{src:string;at:Placement;metrics:StageMetrics;aspect?:number;crop?:PresentationCrop;visible?:boolean;tiltScale?:number;sideX?:number;floatKey?:string}){
 const texture=useTexture(src);texture.colorSpace=THREE.SRGBColorSpace;
 const w=at.width/100*metrics.worldWidth,h=w/aspect;
 const geometry=useMemo(()=>slabGeometry(w,h),[w,h]);
 const imageGeometry=useMemo(()=>slabImageGeometry(w,h,crop),[w,h,crop]);
 const seed=useMemo(()=>seedOf(floatKey??src),[floatKey,src]),fclock=useRef(0);
 const group=useRef<THREE.Group>(null),elapsed=useRef(0),reveal=useRef(visible?1:0),wasVisible=useRef(visible);
 useEffect(()=>()=>{geometry.dispose();imageGeometry.dispose()},[geometry,imageGeometry]);
 useFrame((_state,delta)=>{
  const g=group.current;if(!g)return;
  if(visible&&!wasVisible.current)elapsed.current=0;wasVisible.current=visible;
  const base=worldPosition(at.x,at.y,metrics),rest=tiltNow(sideX??at.x,seed,tiltScale);
  if(!metrics.animate){g.rotation.set(rest.rotX,rest.rotY,at.rotation||0);g.position.set(...base);elapsed.current=0;reveal.current=visible?1:0}
  else{
   // R3F resets its clock when frameloop changes. Local bounded deltas cannot run backwards.
   elapsed.current=advanceSlabSettle(elapsed.current,delta);
   const settle=Math.exp(-elapsed.current*motionTuning.settleRate);
   fclock.current=advanceFloat(fclock.current,delta);const f=floatNow(fclock.current,seed);
   g.rotation.set(.1*settle+rest.rotX+f.rotX,(at.x>50?-.22:.22)*settle+rest.rotY+f.rotY,(at.rotation||0)+f.rotZ);g.position.set(base[0]+f.x,base[1]+f.y,base[2]);
   reveal.current=THREE.MathUtils.clamp(reveal.current+(visible?1:-1)*Math.min(delta,.05)/REVEAL_SECONDS,0,1);
  }
  const s=easeOutBack(reveal.current);g.visible=s>0;g.scale.setScalar(Math.max(s,1e-4));
 });
 return <group ref={group} position={worldPosition(at.x,at.y,metrics)}><mesh geometry={geometry}><ChromeMaterial/></mesh><mesh geometry={imageGeometry} position={[0,0,.23]}><meshBasicMaterial map={texture} toneMapped={false}/></mesh></group>
}
export function DisplayHit({src,alt,at,aspect=1.6,label,labelId,onOpen,assetId,crop,style}:{src:string;alt:string;assetId?:string;at:Placement;aspect?:number;label?:string;labelId?:string;crop?:PresentationCrop;style?:CSSProperties;onOpen?:(src:string,alt:string,crop?:PresentationCrop)=>void}){return <div className="display-overlay" data-source-asset={assetId} style={{left:`${at.x}%`,top:`${at.y}%`,width:`${at.width}%`,aspectRatio:aspect,...style}}>{label&&<span className="display-title" data-source-node={labelId}>{label}</span>}<button className="display-hit" aria-label={`Enlarge ${alt}`} onClick={()=>onOpen?.(src,alt,crop)}><CroppedImage className="display-fallback" src={src} alt={alt} crop={crop}/></button></div>}
