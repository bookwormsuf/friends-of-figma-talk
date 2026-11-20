import {useEffect,useMemo,useRef,type CSSProperties} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,floatNow,smoothChrome} from '../visuals/ChromePrimitives';
import {blendReshape,cushion,outline,reshapePair,svgShape} from '../visuals/geometry';
import {Glow,PALETTE} from '../visuals/Glow';
import {advanceFloat,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {slideLayouts} from './layouts';
import {editorEnabled,useTuning} from '../editor/tuning';
import {advanceClosing,closingConfig as C,closingState} from './closingMotion';
import type {SlideProps} from './types';
import {palette} from '../theme/palette';
import {rgba} from '../theme/colour';
/** Glow that hugs the shape, in world units beyond its edge. The wide wash of light is the halo below. */
const HUG=1.1;
/** A soft round falloff, bright in the middle and nothing at the edge, so the stage never clips it. */
function haloTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!,g=ctx.createRadialGradient(128,128,0,128,128,128);
 [[0,1],[.1,.74],[.24,.46],[.42,.27],[.62,.13],[.8,.05],[.93,.012],[1,0]].forEach(([at,a])=>g.addColorStop(at,rgba(palette.closing.halo,a)));
 ctx.fillStyle=g;ctx.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const hex=(h:string)=>new THREE.Color(h);
const COLOURS={cloud:{wide:hex(PALETTE.cloud.far),tight:hex(PALETTE.cloud.near)},spark:{wide:hex(PALETTE.burst.far),tight:hex(PALETTE.burst.near)}};
const LIGHT={cloud:hex(palette.closing.lightCloud),spark:hex(palette.closing.lightBurst)};
/** How strong the wide glow is, and how strong the light it throws on the ring. Sufyan's values from the dials. The dial panel writes here in editor mode. */
const look={glow:1.3,tint:1.55};
/** The whole closing animation in 3D. Everything is read from one number, p, so stepping back is the same move in reverse and an interrupted move stays continuous. */
function ClosingScene({step,metrics,count,small:smallWidth,centre:centreWidth}:{step:number;metrics:StageMetrics;count:number;small:number;centre:number}){
 const pair=useMemo(()=>reshapePair(smoothChrome.plateau),[]);
 // The centre object: one mesh whose outline is rewritten as it turns from cloud to spark.
 const centreGeometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pair.cloud),3));g.setIndex(pair.index);g.computeVertexNormals();return g},[pair]);
 // The other clouds share one shape and one material.
 const small=useMemo(()=>cushion('cloud',smoothChrome.plateau),[]);
 const smallBox=useMemo(()=>new THREE.Box2().setFromPoints(outline('cloud').getSpacedPoints(100)).getSize(new THREE.Vector2()),[]);
 const halo=useMemo(haloTexture,[]);
 const plane=useMemo(()=>new THREE.PlaneGeometry(1,1),[]);
 useEffect(()=>()=>{centreGeometry.dispose();small.dispose();halo.dispose();plane.dispose()},[centreGeometry,small,halo,plane]);
 const others=useRef<(THREE.Mesh|null)[]>([]),centre=useRef<THREE.Group>(null),shape=useRef<THREE.Mesh>(null),hug=useRef<THREE.Group>(null);
 const wide=useRef<THREE.Mesh>(null),tight=useRef<THREE.Mesh>(null),light=useRef<THREE.PointLight>(null);
 const cloudLevel=useRef(0),sparkLevel=useRef(0);
 const p=useRef(Math.max(0,Math.min(2,step))),fclock=useRef(0),drawn=useRef(-1);
 const seeds=useMemo(()=>Array.from({length:count+1},(_,i)=>seedOf(`closing-${i}`)),[count]);
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate(2)},[step,invalidate]);
 const W=metrics.worldWidth;
 const smallW=smallWidth/100*W,sx=smallW/smallBox.x,thin=sx*(smoothChrome.depth??1);
 const fullW=centreWidth/100*W,cloudH=fullW*pair.aspect.cloud,sparkH=fullW*C.sparkAspect;
 useFrame((_s,delta)=>{
  if(!metrics.animate)p.current=Math.max(0,Math.min(2,step));
  else{p.current=advanceClosing(p.current,step,delta);fclock.current=advanceFloat(fclock.current,delta)}
  const s=closingState(p.current),still={x:0,y:0,rotX:0,rotY:0,rotZ:0};
  s.others.forEach((o,i)=>{
   const m=others.current[i];if(!m)return;m.visible=o.visible;if(!o.visible)return;
   const f=metrics.animate?floatNow(fclock.current,seeds[i]):still,at=worldPosition(o.x,o.y,metrics,-i*.04);
   m.position.set(at[0]+f.x,at[1]+f.y,at[2]);m.rotation.set(f.rotX,f.rotY,o.rotation+f.rotZ);m.scale.set(sx*o.scale,sx*o.scale,thin*o.scale);
  });
  const g=centre.current,mesh=shape.current;if(!g||!mesh)return;
  g.visible=s.centre.visible;
  // Behind the swarm, so the others hide it until they part.
  const f=metrics.animate?floatNow(fclock.current,seeds[count]):still,at=worldPosition(s.centre.x,s.centre.y,metrics,-1.4);
  g.position.set(at[0]+f.x*.5,at[1]+f.y*.5,at[2]);
  if(drawn.current!==s.centre.reshape){
   const attribute=centreGeometry.getAttribute('position') as THREE.BufferAttribute;
   blendReshape(attribute.array as Float32Array,pair,s.centre.reshape);attribute.needsUpdate=true;centreGeometry.computeVertexNormals();
   drawn.current=s.centre.reshape;
  }
  // Height follows the shape: the cloud's own proportions, a round blob halfway, then the oval spark.
  const w=s.centre.width/100*W,r=s.centre.reshape,h=w*(r<.5?pair.aspect.cloud+(1-pair.aspect.cloud)*r*2:1+(C.sparkAspect-1)*(r*2-1));
  mesh.scale.set(w,h,w*.075);mesh.rotation.set(f.rotX,f.rotY,f.rotZ);
  // The hugging glows were painted at full size. Scale them with the shape while it grows or swells.
  hug.current?.scale.setScalar(w/fullW);
  cloudLevel.current=Math.min(1.3,s.glow.cloud);sparkLevel.current=Math.min(1.3,s.glow.spark);
  // The wide wash of light. It is an ellipse that just fits the stage at full spread, and fades to nothing before its own edge.
  const total=Math.max(s.glow.cloud,s.glow.spark),warm=s.glow.cloud+s.glow.spark>0?s.glow.spark/(s.glow.cloud+s.glow.spark):0;
  const breath=metrics.animate?1+.025*Math.sin(fclock.current*1.1)+.015*Math.sin(fclock.current*.63+1):1;
  const reach=(.24+.72*s.glow.spread)*breath,across=W*reach,tall=Math.min(across,10*reach);
  const paint=(m:THREE.Mesh|null,from:THREE.Color,to:THREE.Color,sizeBy:number,opacity:number)=>{
   if(!m)return;const material=m.material as THREE.MeshBasicMaterial;m.visible=total>.002;if(!m.visible)return;
   material.color.copy(from).lerp(to,warm);material.opacity=Math.min(1,opacity*total*look.glow);m.scale.set(across*sizeBy,tall*sizeBy,1);
  };
  paint(wide.current,COLOURS.cloud.wide,COLOURS.spark.wide,1,.5+.25*s.glow.spread);
  paint(tight.current,COLOURS.cloud.tight,COLOURS.spark.tight,.42,.34+.3*s.glow.spread);
  // Light from the centre falls on the ring: the cloud's violet while it glows, turning to the spark's warm orange. It follows the glow's own strength and colour.
  if(light.current){light.current.color.copy(LIGHT.cloud).lerp(LIGHT.spark,warm);light.current.intensity=Math.max(s.glow.cloud*.85,s.tint)*46*look.tint}
 });
 return <>
  {Array.from({length:count},(_,i)=><mesh key={i} ref={m=>{others.current[i]=m}} geometry={small} visible={false}><ChromeMaterial roughness={smoothChrome.roughness} tone={smoothChrome.tone}/></mesh>)}
  <group ref={centre} visible={false}>
   <mesh ref={wide} geometry={plane} position={[0,0,-4]} renderOrder={-3} visible={false}><meshBasicMaterial map={halo} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
   <mesh ref={tight} geometry={plane} position={[0,0,-3.8]} renderOrder={-2} visible={false}><meshBasicMaterial map={halo} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
   <group ref={hug}>
    <Glow kind="cloud" w={fullW} h={cloudH} reach={HUG} seed={seeds[count]} animate={metrics.animate} level={cloudLevel}/>
    <Glow kind="burst" w={fullW} h={sparkH} reach={HUG} seed={seeds[count]+1} animate={metrics.animate} level={sparkLevel}/>
   </group>
   <mesh ref={shape} geometry={centreGeometry}><ChromeMaterial roughness={smoothChrome.roughness} tone={smoothChrome.tone}/></mesh>
   {/* Behind the shapes, so it catches only the edges of the ring clouds that face the centre and leaves every flat face alone. */}
   <pointLight ref={light} position={[0,0,-.7]} color={palette.closing.lightBurst} intensity={0} distance={0} decay={1.2}/>
  </group>
 </>
}
/** The closing animation on slide 4:140. Step 0 is the slide's words. Step 1: the words float off the top, a swarm of clouds rises, parts into a ring, and the one left in the centre glows.
 * Step 2: that cloud reshapes into a spark, which glows very wide. See closingMotion.ts and docs/closing-animation-spec.md. Reduced motion, pause and no-WebGL show each step's still end state. */
export function Closing(props:SlideProps){
 const {slide,step=0}=props,{motion}=useVisualState(),layout=slideLayouts[slide.id];
 // Dials for editor mode (?editor). Outside it useTuning hands back these defaults and nothing below is applied, so closingConfig stays in charge.
 // The defaults are read once, before the panel has written anything, so they are always the values in the code.
 const defaults=useMemo(()=>({...C,ring:{...C.ring},spread:{...C.spread},look:{...look}}),[]);
 const dials=useTuning('Closing animation',{
  speed:[1,.25,3,.05],
  clouds:{count:[defaults.others,6,40,1],smallWidth:[defaults.small,4,16,.5]},
  centre:{width:[defaults.centre,6,30,.5],blobSize:[defaults.blob,.2,1,.05],sparkOval:[defaults.sparkAspect,.5,1.2,.02]},
  ring:{wide:[defaults.ring.x,20,46,.5],tall:[defaults.ring.y,20,46,.5],innerLane:[defaults.ring.inner,.5,1,.01],outerLane:[defaults.ring.outer,1,1.2,.01]},
  glow:{cloudSpread:[defaults.spread.cloud,.1,1,.02],sparkSpread:[defaults.spread.spark,.3,1,.02],brightness:[defaults.look.glow,0,2,.05],ringLight:[defaults.look.tint,0,3,.05]},
  wordsLeave:[defaults.wordsLeave,.05,.4,.01],
 },{id:'closing-2',persist:true});
 if(editorEnabled()){
  C.others=Math.round(dials.clouds.count);C.small=dials.clouds.smallWidth;C.centre=dials.centre.width;C.blob=dials.centre.blobSize;C.sparkAspect=dials.centre.sparkOval;
  C.ring={x:dials.ring.wide,y:dials.ring.tall,inner:dials.ring.innerLane,outer:dials.ring.outerLane};C.spread={cloud:dials.glow.cloudSpread,spark:dials.glow.sparkSpread};
  C.wordsLeave=dials.wordsLeave;C.speed=dials.speed;look.glow=dials.glow.brightness;look.tint=dials.glow.ringLight;
 }
 return <Stage {...props} className="content-stage content-closing" scene={m=><ClosingScene step={step} metrics={m} count={C.others} small={C.small} centre={C.centre}/>}>{m=>{
  const moving=m.animate&&motion,gone=step>=1,seconds=C.seconds[0]/Math.max(.05,C.speed),font=Math.min(118,m.width*.075)*(layout?.fontScale||1);
  // The words leave at the start of press one, and come back at its very end when stepping back.
  const words:CSSProperties={fontSize:font,width:`${layout?.textWidth||80}%`,transform:`translate(-50%,calc(-50% - ${gone?m.height*.86:0}px))`,opacity:gone?0:1,
   transition:moving?`transform ${seconds*C.wordsLeave}s cubic-bezier(.45,0,.85,.55) ${gone?0:seconds*(1-C.wordsLeave)}s, opacity ${seconds*C.wordsLeave*.4}s linear ${gone?seconds*C.wordsLeave*.6:seconds*(1-C.wordsLeave)}s`:'none'};
  const kind=step>=2?'burst':'cloud',glow=step>=2?PALETTE.burst:PALETTE.cloud,reach=step>=2?95:70;
  return <>
   <h2 className="statement-copy raised-type" style={words} aria-hidden={gone}>{slide.text.map(t=><span key={t.id} data-source-node={t.id}>{t.text}</span>)}</h2>
   {step>=1&&<div className="shape-fallback" aria-hidden="true" style={{position:'absolute',inset:'auto',left:'50%',top:'50%',width:`${C.centre}%`,height:'auto',aspectRatio:kind==='burst'?`${1/C.sparkAspect}`:'1.95',transform:'translate(-50%,-50%)',filter:`drop-shadow(0 0 ${reach*.25}px ${glow.near}) drop-shadow(0 0 ${reach}px ${glow.mid}) drop-shadow(0 0 ${reach*2.2}px ${glow.far})`}}>
    <svg viewBox="-3 -3 106 106" preserveAspectRatio="none" style={{width:'100%',height:'100%',overflow:'visible'}}><path d={svgShape(kind)} fill={palette.closing.shapeFallbackFill} stroke={palette.closing.shapeFallbackOutline} strokeWidth="2"/></svg>
   </div>}
  </>}}</Stage>
}
