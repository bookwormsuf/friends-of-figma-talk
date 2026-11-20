import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {ChromeMaterial,LiquidMaterial} from '../visuals/ChromePrimitives';
import {useTuning,type TuningConfig} from '../editor/tuning';
import {drillLayout as L} from './layouts';
import type {SlideProps} from './types';
import {bubble,sonar,subPose,subSeconds,type Dive,type SubVariation} from './subMotion';
import {palette} from '../theme/palette';
/** ?sub=1, 2 or 3 swaps the drill for a submarine while comparing them; without it the layout's own choice is used, and 0 there keeps the drill. */
const subVariation=():0|SubVariation=>{const v=Number(new URLSearchParams(location.search).get('sub'));return v===1||v===2||v===3?v:L.sub.variation as 0|SubVariation};
/** Half the submarine's unscaled length, propeller included. */
const SUB_HALF=1;
const dials=(o:Record<string,number>,ranges:Record<string,[number,number,number]>):TuningConfig=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[v,...ranges[k]] as [number,number,number,number]]));
const config:TuningConfig={
 bead:dials(L.bead,{radius:[.2,.8,.01],x:[20,80,.5],y:[30,80,.5]}),
 drill:dials(L.drill,{seconds:[.3,4,.05],scale:[1,5,.1],spin:[0,30,.5],shavings:[0,14,1],bounce:[0,1.2,.02]}),
 rocket:dials(L.rocket,{scale:[1,4,.1],seconds:[.5,5,.05],turns:[.5,4,.05],radius:[.5,5,.05],exitX:[-40,50,.5],exitY:[-40,60,.5],trail:[0,30,1]}),
};
type Tuned={bead:typeof L.bead;drill:typeof L.drill;rocket:typeof L.rocket};
const clamp01=(v:number)=>Math.min(1,Math.max(0,v));
const safe=(d:number)=>Math.min(Number.isFinite(d)?Math.max(0,d):0,.05);
const smooth=(p:number)=>p<.5?2*p*p:1-(-2*p+2)**2/2;
const hash=(a:number,b:number)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s)};
/** Seconds for the second bead to appear, and to turn into the rocket. Lift-off follows for rocketSeconds. */
const BEAD_IN=.3,MORPH=.25;
const GOLD={color:palette.drill.gold,metalness:1,roughness:.2,clearcoat:.4,envMapIntensity:1.4};
/** Unscaled height of the ring stack, in world units. */
const STACK=.75,frontZ=.5;
/** Seconds a faint swirl of shavings keeps settling after the drill has left the stage. */
const SETTLE=.8;
/** The trail lingers this much longer than the rocket's own flight so the last beads leave the stage too. */
const TAIL=1.2,EASE_IN=.2,TRAIL_SPAN=.24;
/** Rocket progress along the path for flight time tl (0..TAIL): eases in over the first 20%, then constant speed. Reaches 1 at tl=1 and keeps going after. */
const along=(tl:number)=>(tl<EASE_IN?tl*tl/(2*EASE_IN):EASE_IN/2+(tl-EASE_IN))/(1-EASE_IN/2);
type Flight={x0:number;y0:number;cx:number;cy:number;turns:number;radius:number;ex:number;ey:number};
/** Parametric flight in stage world space: a spiral that widens as it rises (centre drifts from the slab to mid-stage), then the last stretch straightens out to the exit point. u in 0..1. */
function flightPoint(f:Flight,u:number):[number,number]{
 const spiral=(v:number):[number,number]=>{const a=f.turns*Math.PI*2*v,r=f.radius*v**.9,d=v**.6;return[f.x0+(f.cx-f.x0)*d+Math.cos(a)*r,f.y0+(f.cy-f.y0)*d+Math.sin(a)*r]};
 const c=clamp01(u),t0=.78,[sx,sy]=spiral(c);
 if(c<=t0)return[sx,sy];
 const[bx,by]=spiral(t0),k=(c-t0)/(1-t0),w=smooth(k),e=k*k*(3-2*k)*.35+k*.65;
 return[sx+(bx+(f.ex-bx)*e-sx)*w,sy+(by+(f.ey-by)*e-sy)*w];
}

const RINGS=7;
/** Chrome drill bit: a stack of flat rings, widest at the top, stepping in towards the tip. The origin is the bottom of the lowest ring and the axis runs up +y, so rotation.y spins it. */
function DrillBit({geo}:{geo:{ring:THREE.BufferGeometry}}){
 return <>{Array.from({length:RINGS},(_,i)=>{const k=i/(RINGS-1),r=.08+.22*k;return <mesh key={i} geometry={geo.ring} position={[0,.05+i*.11,0]} scale={[r/.3,1,r/.3]}><ChromeMaterial/></mesh>})}</>
}
function Rocket({geo}:{geo:{body:THREE.BufferGeometry;nose:THREE.BufferGeometry;tip:THREE.BufferGeometry;fin:THREE.BufferGeometry}}){
 return <>
  <mesh geometry={geo.body} position={[0,-.1,0]}><ChromeMaterial/></mesh>
  <mesh geometry={geo.nose} position={[0,.45,0]}><ChromeMaterial/></mesh>
  <mesh geometry={geo.tip} position={[0,.69,0]}><meshPhysicalMaterial {...GOLD} side={THREE.DoubleSide}/></mesh>
  {[0,1,2].map(i=><group key={i} rotation={[0,Math.PI/6+i*Math.PI*2/3,0]}><mesh geometry={geo.fin} position={[.2,-.38,0]} rotation={[0,0,-.18]}><ChromeMaterial/></mesh></group>)}
 </>
}
/** Chrome submarine, nose along +x. Gold portholes on both sides so it reads whichever way it turns, a periscope, tail planes and a propeller that spins about the long axis. */
function Submarine({geo,prop}:{geo:Record<'hull'|'tower'|'scope'|'scopeTop'|'port'|'rudder'|'plane'|'blade'|'hub',THREE.BufferGeometry>;prop:React.Ref<THREE.Group>}){
 return <>
  <mesh geometry={geo.hull} rotation={[0,0,Math.PI/2]}><ChromeMaterial/></mesh>
  <mesh geometry={geo.tower} position={[.12,.36,0]} scale={[1,1,.7]}><ChromeMaterial/></mesh>
  <mesh geometry={geo.scope} position={[.16,.6,0]}><meshPhysicalMaterial {...GOLD}/></mesh>
  <mesh geometry={geo.scopeTop} position={[.2,.74,0]}><meshPhysicalMaterial {...GOLD}/></mesh>
  {[-1,1].map(side=>[.42,.1,-.22].map(x=><mesh key={`${side}${x}`} geometry={geo.port} position={[x,.02,.272*side]}><meshPhysicalMaterial {...GOLD}/></mesh>))}
  <mesh geometry={geo.rudder} position={[-.74,0,0]}><ChromeMaterial/></mesh>
  <mesh geometry={geo.plane} position={[-.74,0,0]}><ChromeMaterial/></mesh>
  <group ref={prop} position={[-.92,0,0]}>
   <mesh geometry={geo.hub}><meshPhysicalMaterial {...GOLD}/></mesh>
   <mesh geometry={geo.blade}><meshPhysicalMaterial {...GOLD}/></mesh>
   <mesh geometry={geo.blade} rotation={[Math.PI/2,0,0]}><meshPhysicalMaterial {...GOLD}/></mesh>
  </group>
 </>
}
/** Pooled particles for shavings and trail. Each lives `life` seconds on bounded local time, gets spawned by the caller and fades by shrinking.
 * Shavings use vx/vy; trail beads use `spin` as their starting scale. */
type Particle={life:number;x:number;y:number;vx:number;vy:number;spin:number;dur:number;sc:number;curl:number;g:number};
const deadParticle=():Particle=>({life:1e9,x:0,y:0,vx:0,vy:0,spin:0,dur:.55,sc:1,curl:0,g:6});
function Scene({t,step,metrics,sub}:{t:Tuned;step:number;metrics:StageMetrics;sub:0|SubVariation}){
 const invalidate=useThree(s=>s.invalidate);
 const R=t.bead.radius,DS=t.drill.scale,RS=t.rocket.scale;
 const [cx,beadY]=worldPosition(t.bead.x,t.bead.y,metrics),bottomY=worldPosition(50,100,metrics)[1];
 const SS=L.sub.scale,bubbleCount=sub?L.sub.bubbles:0,ringCount=sub===3?sonar.starts.length:0;
 const shavingCount=sub?0:Math.round(t.drill.shavings),trailCount=Math.round(t.rocket.trail);
 const geo=useMemo(()=>({
  bead:new THREE.SphereGeometry(1,32,20),
  ring:new THREE.CylinderGeometry(.3,.3,.08,32),
  body:new THREE.CylinderGeometry(.19,.19,.7,24),nose:new THREE.ConeGeometry(.19,.4,24),tip:new THREE.ConeGeometry(.07,.12,16),
  fin:(()=>{const s=new THREE.Shape();s.moveTo(0,.3);s.lineTo(.22,-.12);s.lineTo(0,-.12);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.03,bevelEnabled:false});g.translate(0,0,-.015);return g})(),
  shaving:new THREE.TetrahedronGeometry(.06),
  trail:new THREE.SphereGeometry(.1,14,10),
  hull:new THREE.CapsuleGeometry(.28,1.1,12,28),tower:new THREE.CylinderGeometry(.13,.16,.26,20),scope:new THREE.CylinderGeometry(.025,.025,.3,10),scopeTop:new THREE.BoxGeometry(.12,.045,.045),
  port:new THREE.TorusGeometry(.07,.022,10,24),rudder:new THREE.BoxGeometry(.2,.62,.03),plane:new THREE.BoxGeometry(.2,.03,.62),blade:new THREE.BoxGeometry(.03,.42,.09),hub:new THREE.SphereGeometry(.06,12,8),
  sonar:new THREE.RingGeometry(.975,1,72),
 }),[]);
 const ringMaterials=useMemo(()=>sonar.starts.map(()=>new THREE.MeshBasicMaterial({color:palette.drill.sonarRing,transparent:true,opacity:0,depthWrite:false,toneMapped:false})),[]);
 useEffect(()=>()=>ringMaterials.forEach(m=>m.dispose()),[ringMaterials]);
 useEffect(()=>()=>Object.values(geo).forEach(g=>g.dispose()),[geo]);

 const bead1=useRef<THREE.Mesh>(null),bead2=useRef<THREE.Mesh>(null),drill=useRef<THREE.Group>(null),drillSpin=useRef<THREE.Group>(null),rocket=useRef<THREE.Group>(null);
 const subRef=useRef<THREE.Group>(null),subPitch=useRef<THREE.Group>(null),subProp=useRef<THREE.Group>(null),bubbles=useRef<(THREE.Mesh|null)[]>([]),rings=useRef<(THREE.Mesh|null)[]>([]);
 const shavings=useRef<(THREE.Mesh|null)[]>([]),trail=useRef<(THREE.Mesh|null)[]>([]);
 const target=useRef(step);target.current=step;
 const d=useRef(step>=1?1:0),r=useRef(step>=2?BEAD_IN+MORPH:0),time=useRef(0),spin=useRef(0),settle=useRef(0);
 const shavingPool=useRef<Particle[]>([]),shavingAcc=useRef(0),settleAcc=useRef(0);
 useEffect(()=>{invalidate(2)},[step,invalidate]);
 useFrame((_s,delta)=>{
  const dt=metrics.animate?safe(delta):0;
  const toD=target.current>=1?1:0,toR=target.current>=2?1:0,rTotal=BEAD_IN+MORPH+Math.max(.1,t.rocket.seconds)*TAIL;
  const dBefore=d.current;
  if(metrics.animate){
   d.current=clamp01(d.current+(toD?1:-1)*dt/Math.max(.1,sub?subSeconds[sub]:t.drill.seconds));
   r.current=Math.min(rTotal,Math.max(0,r.current+(toR?1:-1)*dt));
   time.current+=dt;
  }else{d.current=toD;r.current=toR?BEAD_IN+MORPH:0;settle.current=0;shavingPool.current.forEach(p=>{p.life=1e9})}
  const drillMoving=d.current!==dBefore,drillDir=Math.sign(d.current-dBefore);
  if(!sub&&drillDir>0&&d.current>=1)settle.current=SETTLE;
  if(drillDir<0)settle.current=0;
  const wob=metrics.animate?Math.sin(time.current*5)*.08:0;
  const bob=metrics.animate?Math.sin(time.current*1.7)*.06:0;

  // Bead 1: floats in place until the drill takes over, then shrinks away as the drill grows from its centre.
  const m=clamp01(d.current/.2);
  if(bead1.current){const s=R*(1-m);bead1.current.visible=s>.002;bead1.current.position.set(cx,beadY+bob,frontZ);bead1.current.scale.set(s*(1+wob),s*(1-wob*.6),s*(1-wob*.6))}
  // Drill: grows from the bead's centre, spins up and bores straight down off the bottom, easing in. Reduced motion parks it lower-centre.
  const x=clamp01((d.current-.15)/.85),q=x*x,stackH=STACK*DS;
  const endCentre=bottomY-stackH/2-.4,parkCentre=worldPosition(50,68,metrics)[1];
  // Two decaying hops while the descent is still slow, so the drill bounces on the spot before it bites. Stateless in x, so reversing unwinds it.
  const hopSpan=.55,hop=x<hopSpan?(t.drill.bounce||0)*Math.abs(Math.sin(Math.PI*2*x/hopSpan))*(1-x/hopSpan):0;
  const centreY=metrics.animate?beadY+(endCentre-beadY)*q+hop:parkCentre;
  const drillOn=!sub&&(metrics.animate?(d.current>0&&m>.01):target.current===1);
  const dm=metrics.animate?m:1;
  const noseY=centreY-stackH*dm/2;
  if(drill.current){drill.current.visible=drillOn;drill.current.position.set(cx,noseY,frontZ);drill.current.scale.setScalar(Math.max(.001,dm*DS))}
  if(drillMoving)spin.current+=dt*t.drill.spin*(.3+.7*Math.min(1,d.current/.4));
  if(drillSpin.current)drillSpin.current.rotation.y=spin.current;
  // Submarine: grows from the bead's centre like the drill does, then follows its dive. Its pose, bubbles and sonar rings all come from progress alone, so reversing unwinds them.
  if(sub){
   const dive:Dive={x0:cx,y0:beadY,bottom:bottomY,size:SUB_HALF*SS+.3};
   const pose=metrics.animate?subPose(sub,dive,x):{x:cx,y:parkCentre,z:0,pitch:-.3,yaw:0};
   const on=metrics.animate?(d.current>0&&m>.01&&d.current<1):target.current===1;
   if(subRef.current){subRef.current.visible=on;subRef.current.position.set(pose.x,pose.y,frontZ+pose.z);subRef.current.rotation.y=pose.yaw;subRef.current.scale.setScalar(Math.max(.001,dm*SS))}
   if(subPitch.current)subPitch.current.rotation.z=pose.pitch;
   if(subProp.current)subProp.current.rotation.x=spin.current*1.3;
   bubbles.current.forEach((mesh,i)=>{
    if(!mesh)return;
    const b=metrics.animate&&d.current>0&&d.current<1?bubble(sub,dive,i,bubbleCount,x):null;
    if(!b){mesh.visible=false;return}
    mesh.visible=true;mesh.position.set(b.x,b.y,frontZ+.4);mesh.scale.setScalar(Math.max(.001,b.size*2.4*Math.min(1,b.age*6)*Math.sqrt(1-b.age)));
   });
   rings.current.forEach((mesh,k)=>{
    if(!mesh)return;
    const a=(x-sonar.starts[k])/sonar.life;
    if(!metrics.animate||!(a>0&&a<1)){mesh.visible=false;return}
    const from=subPose(sub,dive,sonar.starts[k]);
    mesh.visible=true;mesh.position.set(from.x,from.y,frontZ-.6);mesh.scale.setScalar(.8+4.6*a);ringMaterials[k].opacity=.5*(1-a)*Math.min(1,a*8);
   });
  }
  // Shavings kick up from the drill's nose while it moves and the nose is on stage, then a faint swirl settles near the bottom edge.
  const sp=shavingPool.current;while(sp.length<shavingCount)sp.push(deadParticle());sp.length=shavingCount;
  const sk=DS/3;
  const emitting=metrics.animate&&drillMoving&&q>.02&&noseY>bottomY-.1&&d.current<1;
  if(emitting){shavingAcc.current+=dt*shavingCount/.55;while(shavingAcc.current>=1){shavingAcc.current-=1;const p=sp.find(y=>y.life>=1);if(!p)break;const k=Math.floor(time.current*60);p.life=0;p.dur=.55;p.sc=sk;p.curl=0;p.g=6;p.x=cx+(hash(k,1)-.5)*.5*sk;p.y=Math.max(noseY,bottomY);p.vx=(hash(k,2)-.5)*2.4*sk;p.vy=(1.6+hash(k,3)*1.6)*sk;p.spin=hash(k,4)*8}}
  if(metrics.animate&&settle.current>0){
   settle.current=Math.max(0,settle.current-dt);settleAcc.current+=dt*shavingCount/SETTLE*.8;
   while(settleAcc.current>=1){settleAcc.current-=1;const p=sp.find(y=>y.life>=1);if(!p)break;const k=Math.floor(time.current*60);p.life=0;p.dur=SETTLE;p.sc=.6*sk;p.curl=(hash(k,6)>.5?1:-1)*3;p.g=.5;p.x=cx+(hash(k,1)-.5)*1.2*sk;p.y=bottomY+.15+hash(k,5)*.5;p.vx=(hash(k,2)-.5)*1.4*sk;p.vy=(.5+hash(k,3)*.9)*sk;p.spin=hash(k,4)*8}
  }
  sp.forEach((p,i)=>{
   const mesh=shavings.current[i];if(!mesh)return;
   if(p.life>=1){mesh.visible=false;return}
   p.life+=dt/p.dur;p.vy-=p.g*dt;
   if(p.curl){const c=Math.cos(p.curl*dt),s=Math.sin(p.curl*dt),vx=p.vx*c-p.vy*s;p.vy=p.vx*s+p.vy*c;p.vx=vx}
   p.x+=p.vx*dt;p.y+=p.vy*dt;
   mesh.visible=true;mesh.position.set(p.x,p.y,frontZ+.1);mesh.rotation.set(p.life*p.spin,p.life*p.spin*.7,0);mesh.scale.setScalar(Math.max(.001,(1-p.life)*p.sc));
  });

  // Bead 2 and the rocket share one timeline in seconds: appear at the same spot, morph, lift off.
  const rr=r.current,show=clamp01(rr/BEAD_IN),mr=clamp01((rr-BEAD_IN)/MORPH);
  const parkedY=worldPosition(50,32,metrics)[1];
  const tl=Math.min(TAIL,Math.max(0,(rr-BEAD_IN-MORPH)/Math.max(.1,t.rocket.seconds))),u=along(tl);
  const mid=worldPosition(50,45,metrics),exit=worldPosition(t.rocket.exitX,t.rocket.exitY,metrics);
  const flight:Flight={x0:cx,y0:beadY,cx:mid[0],cy:mid[1],turns:t.rocket.turns,radius:t.rocket.radius,ex:exit[0],ey:exit[1]};
  const [rx,ry]=flightPoint(flight,u),[nx,ny]=flightPoint(flight,Math.min(1,u+.012)),[px,py]=flightPoint(flight,Math.max(0,u-.012));
  // Nose along the velocity; eased in from upright so lift-off does not snap.
  const ang=Math.atan2(ny-py,nx-px)-Math.PI/2,face=smooth(clamp01(u/.08)),rot=ang*face;
  if(bead2.current){const s=R*smooth(show)*(1-smooth(mr));bead2.current.visible=s>.002;bead2.current.position.set(cx,beadY+bob,frontZ);bead2.current.scale.set(s*(1+wob),s*(1-wob*.6),s*(1-wob*.6))}
  if(rocket.current){
   const s=smooth(mr);rocket.current.visible=s>.01&&u<1;
   if(!metrics.animate)rocket.current.position.set(cx,parkedY,frontZ);
   else rocket.current.position.set(mr<1||tl===0?cx:rx,mr<1||tl===0?beadY:ry,frontZ);
   rocket.current.rotation.z=metrics.animate?rot:0;rocket.current.scale.setScalar(Math.max(.001,s*RS));
  }
  // Trail: a chain of liquid beads placed along the path behind the rocket. Biggest at the rocket, tiny at the tail. Stateless, so reversing just unwinds it.
  trail.current.forEach((mesh,i)=>{
   if(!mesh)return;
   const ui=u-(i+1)/trailCount*TRAIL_SPAN,k=(i+1)/trailCount,sc=(.17*(1-k)**1.3+.015)*RS;
   if(!metrics.animate||tl<=0||ui<=0||ui>=1){mesh.visible=false;return}
   const[bx,by]=flightPoint(flight,ui);mesh.visible=true;mesh.position.set(bx,by,frontZ-.05);mesh.scale.setScalar(sc/.1);
  });
 });
 return <>
  <mesh ref={bead1} geometry={geo.bead} position={[cx,beadY,frontZ]} scale={R}><LiquidMaterial/></mesh>
  <group ref={drill} visible={false}><group ref={drillSpin}><DrillBit geo={geo}/></group></group>
  {Array.from({length:shavingCount},(_,i)=><mesh key={i} ref={y=>{shavings.current[i]=y}} geometry={geo.shaving} visible={false}><LiquidMaterial/></mesh>)}
  {sub?<group ref={subRef} visible={false}><group ref={subPitch}><Submarine geo={geo} prop={subProp}/></group></group>:null}
  {Array.from({length:bubbleCount},(_,i)=><mesh key={`b${i}`} ref={y=>{bubbles.current[i]=y}} geometry={geo.trail} visible={false}><LiquidMaterial/></mesh>)}
  {Array.from({length:ringCount},(_,k)=><mesh key={`s${k}`} ref={y=>{rings.current[k]=y}} geometry={geo.sonar} material={ringMaterials[k]} visible={false}/>)}
  <mesh ref={bead2} geometry={geo.bead} visible={false}><LiquidMaterial/></mesh>
  <group ref={rocket} visible={false}><Rocket geo={geo}/></group>
  {Array.from({length:trailCount},(_,i)=><mesh key={i} ref={y=>{trail.current[i]=y}} geometry={geo.trail} visible={false}><LiquidMaterial/></mesh>)}
 </>
}
/** Flat fallback for ?no-webgl: a bead, then a big ring drill parked lower-centre, then a rocket parked upper-centre with a dashed looping trail. No slab. */
function DrillFallback({step,sub}:{step:number;sub:boolean}){
 return <svg className="drill-fallback" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  {step===0&&<circle cx="640" cy="418" r="58" fill={palette.drill.fallbackLight} stroke={palette.drill.fallbackEdge} strokeWidth="4"/>}
  {step===1&&sub&&<g transform="rotate(18 640 500)" stroke={palette.drill.fallbackEdge} strokeWidth="4"><rect x="470" y="450" width="340" height="104" rx="52" fill={palette.drill.fallbackLight}/><rect x="630" y="404" width="60" height="50" rx="8" fill={palette.drill.fallbackLight}/><path d="M470 470L440 440V564L470 534Z" fill={palette.drill.fallbackShade}/>{[590,650,710].map(x=><circle key={x} cx={x} cy="502" r="14" fill="none" stroke={palette.drill.gold}/>)}</g>}
  {step===1&&!sub&&<g fill={palette.drill.fallbackLight} stroke={palette.drill.fallbackEdge} strokeWidth="4">{[0,1,2,3,4,5,6].map(i=>{const hw=30+82*(i/6);return <rect key={i} x={640-hw} y={610-i*29-26} width={2*hw} height="26" rx="5"/>})}</g>}
  {step>=2&&<g>
   <path d="M640 230C470 150 470 380 640 380C820 380 840 190 700 170" fill="none" stroke={palette.drill.fallbackLight} strokeWidth="10" strokeDasharray="6 22" strokeLinecap="round"/>
   <g transform="translate(640 330) scale(2.2) translate(-640 -250)">
    <path d="M640 150L612 250V360H668V250Z" fill={palette.drill.fallbackLight} stroke={palette.drill.fallbackEdge} strokeWidth="3"/>
    <path d="M640 120L624 152H656Z" fill={palette.drill.gold}/>
    <path d="M612 330L585 375L612 360ZM668 330L695 375L668 360Z" fill={palette.drill.fallbackShade}/>
   </g>
  </g>}
 </svg>
}
/** Drill and rocket: one liquid-metal bead under the heading. Step 1 turns it into a big drill that bores off the bottom. Step 2 forms a bead again that becomes a rocket and spirals off the top-left. */
export function DrillRocket(props:SlideProps){
 const {slide,step=0}=props;
 const t=useTuning('Drill and rocket',config,{id:'drill-rocket',persist:true}) as unknown as Tuned;
 const heading=slide.text[0],sub=subVariation();
 return <Stage {...props} className="content-stage illustration-full" scene={m=><Scene t={t} step={step} metrics={m} sub={sub}/>}>{()=><>
  <h2 className="illustration-heading" data-source-node={heading?.id}>{heading?.text}</h2>
  <DrillFallback step={step} sub={sub>0}/>
 </>}</Stage>
}
