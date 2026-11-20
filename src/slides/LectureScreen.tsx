import {useEffect,useLayoutEffect,useMemo,useRef,type CSSProperties} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {roundedShape,slabGeometry,slabImageGeometry} from '../visuals/geometry';
import {advanceFloat,advanceSlabSettle,seedOf} from '../visuals/slabMotion';
import {useVisualState} from '../visuals/VisualProvider';
import {motionTuning,useTuning,type TuningConfig} from '../editor/tuning';
import {ceilingArc,hallFloor,hallSeats,type HallParams} from './lectureHall';
import {lectureLayout as L} from './layouts';
import {sourceText,type SlideProps} from './types';
import {palette} from '../theme/palette';
import {hexNumber} from '../theme/colour';
const dials=(o:Record<string,number>,ranges:Record<string,[number,number,number]>):TuningConfig=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[v,...ranges[k]] as [number,number,number,number]]));
const config:TuningConfig={
 slab:dials(L.slab,{x:[0,100,.5],y:[0,100,.5],width:[30,90,.5]}),
 text:dials(L.text,{inset:[0,15,.25],fontScale:[.5,2,.01],lineGap:[.8,1.5,.01]}),
 hall:dials(L.hall,{rows:[2,8,1],rowSpacing:[.2,1,.01],rowCurve:[0,1.5,.01],seatSize:[.15,.7,.01],floorY:[50,95,.5],ceilingRadius:[3,10,.1],revealSeconds:[.1,2,.05],drift:[0,2,.05]}),
};
type Tuned={slab:typeof L.slab;text:typeof L.text;hall:typeof L.hall};
const smooth=(p:number)=>p<.5?2*p*p:1-(-2*p+2)**2/2;
const WORLD_PX=72; // 720px stage / 10 world units
function Slab({at,metrics}:{at:{x:number;y:number;width:number};metrics:StageMetrics}){
 const w=at.width/100*metrics.worldWidth,h=w*9/16;
 const geometry=useMemo(()=>slabGeometry(w,h),[w,h]),screen=useMemo(()=>slabImageGeometry(w,h),[w,h]);
 const group=useRef<THREE.Group>(null),elapsed=useRef(0),fclock=useRef(0),seed=useMemo(()=>seedOf('lecture-slab'),[]);
 useEffect(()=>()=>{geometry.dispose();screen.dispose()},[geometry,screen]);
 useFrame((_s,delta)=>{
  const g=group.current;if(!g)return;
  const base=worldPosition(at.x,at.y,metrics),rest=tiltNow(at.x,seed);
  if(!metrics.animate){g.rotation.set(rest.rotX,rest.rotY,0);g.position.set(...base);elapsed.current=0;return}
  elapsed.current=advanceSlabSettle(elapsed.current,delta);fclock.current=advanceFloat(fclock.current,delta);
  const settle=Math.exp(-elapsed.current*motionTuning.settleRate),f=floatNow(fclock.current,seed);
  g.rotation.set(.1*settle+rest.rotX+f.rotX,(at.x>50?-.22:.22)*settle+rest.rotY+f.rotY,f.rotZ);g.position.set(base[0]+f.x,base[1]+f.y,base[2]);
 });
 // Same rim and material as SilverSlab. The opening is a dark matte screen instead of an image.
 return <group ref={group} position={worldPosition(at.x,at.y,metrics)}><mesh geometry={geometry}><ChromeMaterial/></mesh><mesh geometry={screen} position={[0,0,.23]}><meshBasicMaterial color={palette.core.lectureScreen} toneMapped={false}/></mesh></group>
}
/** The hall behind the slab: stage floor, curved rows of seat backs and two faint ceiling arcs. Fades in and rises when step is 1. */
function Hall({shown,hall,metrics}:{shown:boolean;hall:HallParams&{revealSeconds:number;drift:number};metrics:StageMetrics}){
 const group=useRef<THREE.Group>(null),seatsRef=useRef<THREE.InstancedMesh>(null),p=useRef(shown?1:0),target=useRef(shown),invalidate=useThree(s=>s.invalidate);
 target.current=shown;
 const mats=useMemo(()=>{const chrome=(color:number,rough:number)=>new THREE.MeshPhysicalMaterial({color,metalness:1,roughness:rough,clearcoat:.6,envMapIntensity:.9,transparent:true,opacity:0});
  return{floor:new THREE.MeshPhysicalMaterial({color:palette.lecture.floor,metalness:.7,roughness:.32,clearcoat:.6,envMapIntensity:.5,transparent:true,opacity:0,side:THREE.DoubleSide}),seat:chrome(hexNumber(palette.lecture.seat),.4),arc:chrome(hexNumber(palette.lecture.ceilingArc),.2),max:{floor:.95,seat:1,arc:.55}}},[]);
 const seats=useMemo(()=>hallSeats(hall,metrics.worldWidth),[hall.rows,hall.rowSpacing,hall.rowCurve,hall.seatSize,hall.floorY,metrics.worldWidth]);
 const floor=hallFloor(hall.floorY,metrics.worldWidth);
 const floorGeometry=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-floor.topHalf,floor.top);s.lineTo(floor.topHalf,floor.top);s.lineTo(floor.bottomHalf,floor.bottom);s.lineTo(-floor.bottomHalf,floor.bottom);s.closePath();return new THREE.ShapeGeometry(s)},[floor.top,floor.bottom,floor.topHalf,floor.bottomHalf]);
 const seatGeometry=useMemo(()=>{const g=new THREE.ExtrudeGeometry(roundedShape(1,1.15,.32),{depth:.12,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:3,curveSegments:10});g.center();return g},[]);
 const arcs=useMemo(()=>[1,1.22].map(k=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ceilingArc(hall.ceilingRadius,k).map(([x,y])=>new THREE.Vector3(x,y,-3.6))),80,.03,8,false)),[hall.ceilingRadius]);
 useEffect(()=>()=>{floorGeometry.dispose()},[floorGeometry]);useEffect(()=>()=>seatGeometry.dispose(),[seatGeometry]);useEffect(()=>()=>arcs.forEach(a=>a.dispose()),[arcs]);useEffect(()=>()=>{mats.floor.dispose();mats.seat.dispose();mats.arc.dispose()},[mats]);
 useLayoutEffect(()=>{const m=seatsRef.current;if(!m)return;const o=new THREE.Object3D();seats.forEach((s,i)=>{o.position.set(s.x,s.y,s.z);o.rotation.set(0,0,s.tilt);o.scale.set(s.size,s.size,s.size);o.updateMatrix();m.setMatrixAt(i,o.matrix)});m.count=seats.length;m.instanceMatrix.needsUpdate=true;invalidate(2)},[seats,invalidate]);
 useEffect(()=>{invalidate(2)},[shown,invalidate]);
 useFrame((_s,delta)=>{
  const g=group.current;if(!g)return;const to=target.current?1:0;
  // Bounded local frame time. Under pause or reduced motion, jump to the end state.
  if(!metrics.animate)p.current=to;else{const d=Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)/Math.max(.05,hall.revealSeconds);p.current=to>p.current?Math.min(1,p.current+d):Math.max(0,p.current-d)}
  const e=smooth(p.current);mats.floor.opacity=e*mats.max.floor;mats.seat.opacity=e*mats.max.seat;mats.arc.opacity=e*mats.max.arc;
  g.visible=p.current>.002;g.position.y=-hall.drift*(1-e);
 });
 return <group ref={group}>
  <mesh geometry={floorGeometry} position={[0,0,-4.5]} material={mats.floor}/>
  <mesh position={[0,floor.top,-4.4]} material={mats.arc}><boxGeometry args={[floor.topHalf*2,.05,.05]}/></mesh>
  {arcs.map((a,i)=><mesh key={i} geometry={a} material={mats.arc}/>)}
  <instancedMesh key={seats.length} ref={seatsRef} args={[seatGeometry,mats.seat,seats.length]} frustumCulled={false}/>
 </group>
}
/** Inline SVG hall for the static fallback, drawn from the same layout as the WebGL hall. */
function HallFallback({hall,shown,worldWidth}:{hall:HallParams;shown:boolean;worldWidth:number}){
 const px=(x:number,y:number)=>`${((x/worldWidth+.5)*1280).toFixed(1)},${((.5-y/10)*720).toFixed(1)}`;
 const seats=hallSeats(hall,worldWidth),rows=[...new Set(seats.map(s=>s.row))],floor=hallFloor(hall.floorY,worldWidth);
 return <svg className="lecture-hall-fallback" data-shown={shown} viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
  <polygon points={[[-floor.topHalf,floor.top],[floor.topHalf,floor.top],[floor.bottomHalf,floor.bottom],[-floor.bottomHalf,floor.bottom]].map(([x,y])=>px(x,y)).join(' ')} fill={palette.lecture.floor}/>
  {[1,1.22].map(k=><polyline key={k} points={ceilingArc(hall.ceilingRadius,k).map(([x,y])=>px(x,y)).join(' ')} fill="none" stroke={palette.lecture.ceilingArc} strokeOpacity=".5" strokeWidth="2.5"/>)}
  {rows.map(r=>{const row=seats.filter(s=>s.row===r),size=row[0].size*WORLD_PX;return <polyline key={r} points={row.map(s=>px(s.x,s.y)).join(' ')} fill="none" stroke={palette.lecture.seat} strokeWidth={size*1.05} strokeDasharray={`${size*.85} ${size*1.15}`} strokeLinejoin="round"/>})}
 </svg>
}
/** Lecture screen: a silver slab with a dark screen, no image. Slide 4's "Design" sits lower left. Step 1 (slide 5, pinned) keeps that word in place,
 * fades two lines in above it and brings up a lecture hall around the slab. The slab never moves between steps. */
export function LectureScreen(props:SlideProps){
 const {slide,pinned,step=0}=props,follower=pinned?.[0],{motion}=useVisualState();
 if(!follower)throw new Error(`Slide ${slide.id} needs a pinned follower slide (see layouts.ts) to show its second step.`);
 const t=useTuning('Lecture screen',config,{id:'lecture-screen',persist:true}) as unknown as Tuned;
 const second=step>=1,hall={...t.hall,rows:Math.round(t.hall.rows)};
 // The same word stays put. Its source node follows the visible slide.
 const word=second?{id:'3:34',text:sourceText(follower,'3:34')}:{id:'8:5',text:sourceText(slide,'8:5')};
 const lines=[{id:'3:32',text:sourceText(follower,'3:32')},{id:'3:33',text:sourceText(follower,'3:33')}];
 return <Stage {...props} className="content-stage content-lecture" scene={m=><><Hall shown={second} hall={hall} metrics={m}/><Slab at={t.slab} metrics={m}/></>}>{m=>{
  const widthPx=t.slab.width/100*m.width,font=widthPx*.108*t.text.fontScale,animate=m.animate&&motion;
  return <>
   <HallFallback hall={hall} shown={second} worldWidth={m.worldWidth}/>
   <div className="lecture-screen" style={{left:`${t.slab.x}%`,top:`${t.slab.y}%`,width:`${t.slab.width}%`,aspectRatio:'16 / 9'}}>
    <div className="lecture-slab-fallback"/>
    <h2 className="lecture-title raised-type" style={{fontSize:font,lineHeight:t.text.lineGap,left:`${t.text.inset}%`,bottom:`${t.text.inset*16/9}%`,'--fade':animate?`${L.lines.fadeSeconds}s`:'0s','--stagger':`${L.lines.staggerSeconds}s`} as CSSProperties}>
     {lines.map((l,i)=><span key={l.id} className="lecture-line" data-hidden={!second} aria-hidden={!second} data-source-node={l.id} style={{'--delay':`${i*L.lines.staggerSeconds}s`} as CSSProperties}>{l.text}</span>)}
     <span className="lecture-word" data-source-node={word.id}>{word.text}</span>
    </h2>
   </div>
  </>}}</Stage>
}
