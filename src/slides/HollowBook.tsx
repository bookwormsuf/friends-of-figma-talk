import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {useSilverRoom} from '../visuals/Environment';
import {floatNow,tiltNow} from '../visuals/ChromePrimitives';
import {roundedShape} from '../visuals/geometry';
import {advanceFloat,advanceSlabSettle,seedOf} from '../visuals/slabMotion';
import {motionTuning,useTuning,type TuningConfig} from '../editor/tuning';
import {bookLayout as L} from './layouts';
import type {SlideProps} from './types';
import {palette} from '../theme/palette';
const dials=(o:Record<string,number>,ranges:Record<string,[number,number,number]>):TuningConfig=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[v,...ranges[k]] as [number,number,number,number]]));
const config:TuningConfig={
 book:dials(L.book,{x:[0,100,.5],y:[0,100,.5],width:[20,70,.5],tilt:[-1.2,.3,.01],rim:[.04,.3,.005],thickness:[.15,1.2,.01]}),
 star:dials(L.star,{size:[.2,.9,.01],tilt:[-.6,.6,.01]}),
 open:dials(L.open,{angle:[1.5,3.1,.01],seconds:[.2,3,.05]}),
 flies:dials(L.flies,{count:[0,16,1],speed:[.2,3,.05],spread:[0,3,.05]}),
 fill:dials(L.fill,{fillSeconds:[.3,3,.05],dropHeight:[.5,5,.05],tumble:[0,1,.01],gap:[0,1,.01],chromeShare:[0,1,.01]}),
};
type Tuned={book:typeof L.book;star:typeof L.star;open:typeof L.open;flies:typeof L.flies;fill:typeof L.fill};
const smooth=(p:number)=>p<.5?2*p*p:1-(-2*p+2)**2/2;
const safe=(d:number)=>Math.min(Number.isFinite(d)?Math.max(0,d):0,.05);
/** Deterministic 0..1 from two integers, so each fly's life gets a fresh but repeatable offset. */
const hash=(a:number,b:number)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s)};
/** Nominal cover thickness. The drawn cover is this plus .04. */
const COVER=.26;
const FLY_GATE=.15;
/** Flies wait until the cover is this far open (0..1), then leave the hole one by one over this share of a fly's life (about 3 seconds). */
const FLY_OPEN=.98,FLY_STAGGER=.35;
/** Tiling of the hole into blocks, as [col,row,colSpan,rowSpan] on a 3x4 grid. Row 0 is the top. */
const TILES:ReadonlyArray<readonly [number,number,number,number]>=[[0,0,1,1],[1,0,1,1],[2,0,1,1],[0,1,1,2],[1,1,1,1],[2,1,1,1],[2,2,1,1],[1,2,1,1],[0,3,1,1],[1,3,1,1],[2,3,1,1]];
const GRID={cols:3,rows:4};
const clamp01=(v:number)=>Math.min(1,Math.max(0,v));
/** Share of each block's window that is spent in flight; the rest of the stagger is the start offset. */
const WINDOW=.4;
/** Bevel of each page layer; it shrinks the hole by this much per side. Blocks sit just under the rim top. */
const BEVEL=.06,SINK=.01;
/** The page block is a stack of rounded layers, so its sides read as ridged pages. */
const PAGE_LAYERS=5;
/** Mirror silver for the whole book and the light blocks; gunmetal for the dark blocks. */
// Fairly rough, with a soft clearcoat: the reflections spread into broad, diffuse light instead of hard-edged patches.
const SILVER={color:palette.book.silver,metalness:1,roughness:.38,clearcoat:.35,clearcoatRoughness:.45,envMapIntensity:1.3} as const;
const GUNMETAL={color:palette.book.gunmetal,metalness:1,roughness:.42,clearcoat:.35,clearcoatRoughness:.45,envMapIntensity:1.2} as const;
/** Leans the normals of the flat faces outward from the centre, as if the face bulged like a pillow.
 * A flat mirror reflects one patch of the room and reads as flat grey; with these normals the reflection sweeps across the face. k is the lean at the edge, in radians (roughly). */
function pillow(g:THREE.BufferGeometry,k:number){
 g.computeBoundingBox();const b=g.boundingBox!,cx=(b.min.x+b.max.x)/2,cy=(b.min.y+b.max.y)/2,hx=Math.max(1e-4,(b.max.x-b.min.x)/2),hy=Math.max(1e-4,(b.max.y-b.min.y)/2);
 const pos=g.getAttribute('position'),nor=g.getAttribute('normal'),v=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){const nz=nor.getZ(i);if(Math.abs(nz)<.9)continue;v.set((pos.getX(i)-cx)/hx*k,(pos.getY(i)-cy)/hy*k,Math.sign(nz)).normalize();nor.setXYZ(i,v.x,v.y,v.z)}
 nor.needsUpdate=true;return g;
}
/** Rounded rectangle centred on the origin with radii [topLeft,topRight,bottomRight,bottomLeft]. */
function cornerShape(w:number,h:number,[tl,tr,br,bl]:number[]){const s=new THREE.Shape(),x=w/2,y=h/2;s.moveTo(-x+bl,-y);s.lineTo(x-br,-y);s.quadraticCurveTo(x,-y,x,-y+br);s.lineTo(x,y-tr);s.quadraticCurveTo(x,y,x-tr,y);s.lineTo(-x+tl,y);s.quadraticCurveTo(-x,y,-x,y-tl);s.lineTo(-x,-y+bl);s.quadraticCurveTo(-x,-y,-x+bl,-y);return s}
/** Deterministic chrome pick: spreads round(share*n) chrome blocks evenly through the index order. */
const isChrome=(i:number,share:number)=>Math.floor((i+1)*share+1e-6)>Math.floor(i*share+1e-6);
function starShape(r:number){const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rad=i%2?r*.4:r;i?s.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):s.moveTo(Math.cos(a)*rad,Math.sin(a)*rad)}s.closePath();return s}
/** Extrusion with a rounded edge. thickness is the edge's depth, size is how far it spreads sideways, lean is the pillow amount on the flat faces. */
const extrude=(shape:THREE.Shape,depth:number,thickness:number,size=thickness,lean=0)=>{const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:thickness>0,bevelSize:size,bevelThickness:thickness,bevelSegments:8,curveSegments:20});g.center();return lean?pillow(g,lean):g};
function Fly({index,count,open,fill,hole,metrics,speed,spread,room}:{room:THREE.Texture;index:number;count:number;open:React.MutableRefObject<number>;fill:React.MutableRefObject<number>;hole:{w:number;h:number};metrics:StageMetrics;speed:number;spread:number}){
 const group=useRef<THREE.Group>(null),wingA=useRef<THREE.Mesh>(null),wingB=useRef<THREE.Mesh>(null);
 // With motion on, every fly starts just below zero life, so they come out of the hole one after another once the book is open. With motion off they sit spread out, as a still picture.
 const first=()=>metrics.animate?-index/Math.max(1,count)*FLY_STAGGER:index/Math.max(1,count);
 const life=useRef(first()),cycle=useRef(0),clock=useRef(0),gate=useRef(1),started=useRef(false);
  // Chrome bodies with rounded wings. Both are stretched spheres, so they catch the light as they turn and flap.
 const mats=useMemo(()=>({body:new THREE.MeshPhysicalMaterial({...GUNMETAL,color:palette.book.flyBody,transparent:true,envMap:room}),wing:new THREE.MeshPhysicalMaterial({...SILVER,transparent:true,envMap:room})}),[room]);
 const geo=useMemo(()=>({body:new THREE.SphereGeometry(.06,16,12).scale(1,1.25,1),wing:new THREE.SphereGeometry(.07,16,10).scale(1,.5,.16)}),[]);
 useEffect(()=>()=>{mats.body.dispose();mats.wing.dispose();geo.body.dispose();geo.wing.dispose()},[mats,geo]);
 const seed=index+1,phase=hash(seed,1)*6.28,pace=.8+hash(seed,2)*.5,wander=.6+hash(seed,3)*.8;
 useFrame((_s,delta)=>{
  const g=group.current;if(!g)return;
  // Start only once the cover has finished opening. Once started, keep flying until the cover is mostly shut again.
  if(open.current<=.6){g.visible=false;started.current=false;life.current=first();cycle.current=0;return}
  if(!started.current){if(open.current<FLY_OPEN){g.visible=false;return}started.current=true}
  const dt=metrics.animate?safe(delta):0;
  // While the fill is under way the flies fade out quickly and stop; they resume when it returns below the gate.
  const gone=fill.current>FLY_GATE;
  gate.current=metrics.animate?clamp01(gate.current+(gone?-1:1)*dt/.25):gone?0:1;
  if(gate.current<=.01&&gone){g.visible=false;return}
  clock.current+=dt;life.current+=dt*speed*pace/4.5;
  if(life.current<0){g.visible=false;return}
  if(life.current>=1){life.current-=Math.floor(life.current);cycle.current++}
  const t=life.current,n=cycle.current,c=clock.current*speed;
  const ox=(hash(seed,n*3+5)-.5)*hole.w*.7,oy=(hash(seed,n*3+6)-.5)*hole.h*.6;
  // Rises out of the void, then wanders above the book, spreading outward with life.
  const rise=Math.sqrt(t)*hole.h*.75,out=t*spread*wander*3;
  const jx=Math.sin(c*3.1+phase)*.28+Math.sin(c*7.3+phase*2)*.12,jy=Math.sin(c*4.3+phase*1.7)*.22+Math.sin(c*9.1+phase)*.1,jz=Math.sin(c*2.3+phase)*.3;
  const dir=hash(seed,n*3+7)<.5?-1:1;
  g.position.set(ox+dir*out+jx*(.3+t),oy+rise+jy*(.3+t),.6+t*1.4+jz);
  const fade=Math.min(1,t/.1,(1-t)/.2);mats.body.opacity=fade*gate.current;mats.wing.opacity=fade*gate.current;g.visible=fade*gate.current>.01;
  const flap=.25+Math.abs(Math.sin(c*55+phase));wingA.current?.scale.set(1,flap,1);wingB.current?.scale.set(1,flap,1);
 });
 return <group ref={group} visible={false} scale={1.3}>
  <mesh geometry={geo.body} material={mats.body}/>
  <mesh ref={wingA} geometry={geo.wing} material={mats.wing} position={[-.08,.05,.02]} rotation={[0,0,.5]}/>
  <mesh ref={wingB} geometry={geo.wing} material={mats.wing} position={[.08,.05,.02]} rotation={[0,0,-.5]}/>
 </group>
}
function Book({t,open:isOpen,filled,metrics}:{t:Tuned;open:boolean;filled:boolean;metrics:StageMetrics}){
 const invalidate=useThree(s=>s.invalidate);
 const W=t.book.width/100*metrics.worldWidth,H=W*4/3,T=t.book.thickness,rimW=t.book.rim*W;
 const geo=useMemo(()=>{
  // Each rounded edge spreads sideways, so a shape is drawn that much smaller (or its hole that much larger) to keep the old overall size.
  const holeShape=(grow:number)=>roundedShape(W-2*rimW+2*grow,H-2*rimW+2*grow,Math.min(.5,W*.06)+grow);
  const outer=(shrink:number)=>roundedShape(W-2*shrink,H-2*shrink,Math.max(.05,.5-shrink));
  // Covers: a fat rounded edge, COVER+.04 thick in all. Pages sit slightly inside the covers, like a hardback.
  const EDGE=.2,layer=T/PAGE_LAYERS,pt=Math.min(.09,layer*.42);
  const pages=outer(BEVEL+.03);pages.holes.push(holeShape(BEVEL-.02));
  const back=outer(EDGE-.02);back.holes.push(holeShape(EDGE-.02));
  return{pages:extrude(pages,layer-2*pt,pt,BEVEL,.18),back:extrude(back,.04,COVER/2,EDGE,.3),cover:extrude(outer(EDGE-.02),.04,COVER/2,EDGE,.3),star:extrude(starShape(t.star.size*W/2),.05,.04,.04,.45)};
 },[W,H,T,rimW,t.star.size]);
 useEffect(()=>()=>Object.values(geo).forEach(g=>g.dispose()),[geo]);
 const room=useSilverRoom();
 const paper=useMemo(()=>new THREE.MeshPhysicalMaterial({...SILVER,side:THREE.DoubleSide,envMap:room}),[room]),dark=useMemo(()=>new THREE.MeshPhysicalMaterial({...GUNMETAL,envMap:room}),[room]);
 useEffect(()=>()=>{paper.dispose();dark.dispose()},[paper,dark]);
 const blocks=useMemo(()=>{
  // The page layers' rounded edge pulls the hole in by .02 on every side, so the real opening is smaller than the nominal rim.
  const gap=t.fill.gap,hw=W-2*rimW-.04,hh=H-2*rimW-.04,cr=Math.max(.02,Math.min(.5,W*.06)-.02),D=T-.04;
  const x0=-hw/2+gap/2,y0=hh/2-gap/2,cw=(hw-gap)/GRID.cols,ch=(hh-gap)/GRID.rows;
  return TILES.map(([c,r,sc,sr],i)=>{
   const left=x0+c*cw+gap/2,right=x0+(c+sc)*cw-gap/2,top=y0-r*ch-gap/2,bottom=y0-(r+sr)*ch+gap/2;
   // Pillow blocks, like keycaps: a rounded edge all round and a bulged top. The shape is drawn smaller by the edge so the footprint is unchanged.
   const KEY=.11,out=Math.max(.02,cr-gap-KEY),rad=[r===0&&c===0,r===0&&c+sc===GRID.cols,r+sr===GRID.rows&&c+sc===GRID.cols,r+sr===GRID.rows&&c===0].map(v=>v?out:.03);
   const w=right-left,h=top-bottom;
   const geo=pillow(new THREE.ExtrudeGeometry(cornerShape(w-2*KEY,h-2*KEY,rad),{depth:D-2*KEY,bevelEnabled:true,bevelSize:KEY,bevelThickness:KEY,bevelSegments:8,curveSegments:12}).translate(0,0,-D/2+KEY),.22);
   return{x:(left+right)/2,y:(top+bottom)/2,chrome:isChrome(i,t.fill.chromeShare),geo,dx:(hash(i+1,41)-.5)*.8,dy:(hash(i+1,42)-.5)*.8,rx:(hash(i+1,43)*2-1),rz:(hash(i+1,44)*2-1)};
  });
 },[W,H,T,rimW,t.fill.gap,t.fill.chromeShare]);
 useEffect(()=>()=>blocks.forEach(b=>b.geo.dispose()),[blocks]);
 const blockRefs=useRef<(THREE.Mesh|null)[]>([]);
 const fillTarget=useRef(filled),fill=useRef(filled?1:0);
 fillTarget.current=filled;
 useEffect(()=>{invalidate(2)},[filled,invalidate]);
 const book=useRef<THREE.Group>(null),cover=useRef<THREE.Group>(null);
 const target=useRef(isOpen),p=useRef(isOpen?1:0),eased=useRef(isOpen?1:0),elapsed=useRef(0),fclock=useRef(0),seed=useMemo(()=>seedOf('hollow-book'),[]);
 target.current=isOpen;
 useEffect(()=>{invalidate(2)},[isOpen,invalidate]);
 useFrame((_s,delta)=>{
  const g=book.current,c=cover.current;if(!g||!c)return;
  const to=target.current?1:0;
  if(!metrics.animate){p.current=to;elapsed.current=0;fclock.current=0}
  else{p.current=Math.min(1,Math.max(0,p.current+(to?1:-1)*safe(delta)/Math.max(.05,t.open.seconds)));elapsed.current=advanceSlabSettle(elapsed.current,delta);fclock.current=advanceFloat(fclock.current,delta)}
  const e=smooth(p.current);eased.current=p.current;
  const settle=metrics.animate?Math.exp(-elapsed.current*motionTuning.settleRate):0;
  const toFill=fillTarget.current?1:-1;
  fill.current=metrics.animate?clamp01(fill.current+toFill*safe(delta)/Math.max(.05,t.fill.fillSeconds)):fillTarget.current?1:0;
  const n=blocks.length;
  blocks.forEach((b,i)=>{
   const m=blockRefs.current[i];if(!m)return;
   const start=i/n*(1-WINDOW),local=clamp01((fill.current-start)/WINDOW);
   if(local<=0){m.visible=false;return}
   m.visible=true;const k=1-smooth(local);
   m.position.set(b.x+b.dx*k,b.y+b.dy*k,T/2-SINK-(T-.04)/2+t.fill.dropHeight*k);
   m.scale.setScalar(1-.35*k);
   m.rotation.set(b.rx*t.fill.tumble*k,0,b.rz*t.fill.tumble*k);
  });
  c.rotation.y=-t.open.angle*e;
  const rest=tiltNow(t.book.x,seed),f=metrics.animate?floatNow(fclock.current,seed):{x:0,y:0,rotX:0,rotY:0,rotZ:0},bp=worldPosition(t.book.x,t.book.y,metrics);
  g.rotation.set(t.book.tilt+.1*settle+rest.rotX+f.rotX,-.15*settle+rest.rotY+f.rotY,f.rotZ);
  // Slide right as the cover swings left so the open pair stays on screen.
  g.position.x=bp[0]+W*.45*e+f.x;g.position.y=bp[1]+f.y;
 });
 const count=Math.round(t.flies.count);
 return <group ref={book} position={worldPosition(t.book.x,t.book.y,metrics)}>
  <mesh geometry={geo.back} position={[0,0,-T/2-COVER/2]} material={paper}/>
  {Array.from({length:PAGE_LAYERS},(_,i)=><mesh key={i} geometry={geo.pages} material={paper} position={[0,0,-T/2+(i+.5)*T/PAGE_LAYERS]}/>)}
  <group ref={cover} position={[-W/2,0,T/2+COVER/2]}>
   <mesh geometry={geo.cover} position={[W/2,0,0]} material={paper}/>
   <mesh geometry={geo.star} position={[W/2,0,COVER/2+.06]} rotation={[0,0,t.star.tilt]}><meshPhysicalMaterial color={palette.book.gold} side={THREE.DoubleSide} metalness={1} roughness={.36} clearcoat={.3} clearcoatRoughness={.45} envMap={room} envMapIntensity={1.2}/></mesh>
  </group>
  <group position={[0,0,0]}>{blocks.map((b,i)=><mesh key={i} ref={m=>{blockRefs.current[i]=m}} geometry={b.geo} material={b.chrome?dark:paper} position={[b.x,b.y,0]} visible={false}/>)}</group>
  <group position={[0,0,T/2]}>{Array.from({length:count},(_,i)=><Fly key={i} index={i} count={count} open={eased} fill={fill} hole={{w:W-2*rimW,h:H-2*rimW}} metrics={metrics} speed={t.flies.speed} spread={t.flies.spread} room={room}/>)}</group>
 </group>
}
/** Flat fallback: closed book with a star, or an open book with a dark hole in the right page and three flies. */
function BookFallback({open,filled}:{open:boolean;filled:boolean}){
 const tiles=TILES.map(([c,r,sc,sr],i)=>({x:700+c*90+2,y:130+r*110+2,w:sc*90-4,h:sr*110-4,chrome:i%3===2}));
 const star="M0,-150 L35,-48 L143,-46 57,19 88,121 0,60 -88,121 -57,19 -143,-46 -35,-48Z";
 return <svg className="book-fallback" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  {open?<g>
   <rect x="250" y="70" width="390" height="560" rx="14" fill={palette.book.fallbackLight} stroke={palette.book.fallbackEdge} strokeWidth="10"/>
   <rect x="640" y="70" width="390" height="560" rx="14" fill={palette.book.fallbackLight} stroke={palette.book.fallbackEdge} strokeWidth="10"/>
   <rect x="700" y="130" width="270" height="440" rx="24" fill={palette.book.fallbackDark}/>
   {filled&&tiles.map((b,i)=><rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={b.chrome?palette.book.fallbackEdge:palette.book.fallbackLight} stroke={palette.book.fallbackInk} strokeWidth="2"/>)}
   <rect x="636" y="70" width="8" height="560" fill={palette.book.fallbackInk}/>
   {!filled&&[[790,90,7],[860,48,6],[920,110,6]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill={palette.book.fallbackFly}/>)}
  </g>:<g transform="translate(640 360)">
   <rect x="-210" y="-290" width="420" height="580" rx="20" fill={palette.book.fallbackEdge} stroke={palette.book.fallbackLight} strokeWidth="8"/>
   <path d={star} fill={palette.book.fallbackLight} stroke={palette.book.fallbackInk} strokeWidth="6" strokeLinejoin="round" transform="rotate(7)"/>
  </g>}
 </svg>
}
/** Hollow book: a chrome book with a star on the cover. Step 1 opens it onto a big void with flies buzzing out. Step 2 fills the void with blocks. */
export function HollowBook(props:SlideProps){
 const {slide,step=0}=props,open=step>=1,filled=step>=2;
 const t=useTuning('Hollow book',config,{id:'hollow-book',persist:true}) as unknown as Tuned;
 return <Stage {...props} className="content-stage content-book" scene={m=><Book t={t} open={open} filled={filled} metrics={m}/>}>{()=><>
  <BookFallback open={open} filled={filled}/>
  <div className="book-source-text">{slide.text.map(n=><span key={n.id} data-source-node={n.id} className="book-source-text">{n.text}</span>)}</div>
 </>}</Stage>
}
