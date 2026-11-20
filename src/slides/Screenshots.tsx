import {useEffect,useMemo,useRef,type ReactNode} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Stage,worldPosition,type StageMetrics} from '../visuals/Stage';
import {SilverSlab,DisplayHit} from '../visuals/ChromePrimitives';
import {useVisualState} from '../visuals/VisualProvider';
import {slabImageGeometry} from '../visuals/geometry';
import {sourceText,type SlideProps} from './types';
import {palette} from '../theme/palette';
/** Each concept has a one-line mental model under it (Figma 163:2 and 163:3). It follows its screenshot and is shown only while that concept is in view and not pushed aside: the spreadsheet's on steps 0 and 1, the inbox's on steps 1 and 2.
 * captionGap is the space between a screenshot's bottom edge and the middle of its caption, in stage percent.
 * Step 0 shows the spreadsheet alone at `solo`. Step 1 slides it to its two-up place and brings the inbox in beside it. Step 2 focuses the inbox: it grows to the solo size in the centre while the spreadsheet
 * moves to `aside` (smaller, pushed back by z, dimmed). x, y and width are stage percent; `aside.scale` is relative to the two-up width. */
export const screenshotsLayout={captionGap:7.5,desktop:[{x:26,y:50,width:41},{x:74,y:50,width:41}],mobile:[{x:50,y:30,width:83},{x:50,y:72,width:83}],solo:{x:50,y:47.5,width:62},aside:{x:15,y:47.5,scale:.6,z:-1.4,dim:.55},asideMobile:{x:50,y:19,scale:.7,z:-1.4,dim:.55},inbox:{x:50,y:47.5,width:62,z:.5},inboxMobile:{x:50,y:62,width:90,z:.5},seconds:.7};
const smooth=(p:number)=>p<.5?2*p*p:1-(-2*p+2)**2/2;
type Pose={x:number;y:number;scale:number;z:number;dim:number};
/** Carries a slab from its current pose to the target over `seconds`. The slab is built at its two-up width and scaled, so the geometry never rebuilds. */
function Glide({to,seconds,metrics,size,children}:{to:Pose;seconds:number;metrics:StageMetrics;size:[number,number];children:ReactNode}){
 const ref=useRef<THREE.Group>(null),dimMat=useRef<THREE.MeshBasicMaterial>(null),dimMesh=useRef<THREE.Mesh>(null),dimGeo=useMemo(()=>slabImageGeometry(size[0]+.3,size[1]+.3),[size[0],size[1]]),cur=useRef<Pose|null>(null),run=useRef<{to:Pose;from:Pose;p:number}|null>(null),invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{invalidate(2)},[to.x,to.y,to.scale,to.z,to.dim,invalidate]);
 useFrame((_s,delta)=>{
  const g=ref.current;if(!g)return;
  if(!cur.current||!metrics.animate){cur.current={...to};run.current=null}
  else{
   const r=run.current;
   if(!r||r.to.x!==to.x||r.to.y!==to.y||r.to.scale!==to.scale||r.to.z!==to.z||r.to.dim!==to.dim)run.current={to:{...to},from:{...cur.current},p:0};
   const q=run.current!;
   // Bounded local frame time, never a subtraction from the global clock (see DESIGN.md).
   if(q.p<1)q.p=Math.min(1,q.p+Math.min(Number.isFinite(delta)?Math.max(0,delta):0,.05)/Math.max(.05,seconds));
   const e=smooth(q.p);cur.current={x:q.from.x+(to.x-q.from.x)*e,y:q.from.y+(to.y-q.from.y)*e,scale:q.from.scale+(to.scale-q.from.scale)*e,z:q.from.z+(to.z-q.from.z)*e,dim:q.from.dim+(to.dim-q.from.dim)*e};
  }
  const c=cur.current,wp=worldPosition(c.x,c.y,metrics);g.position.set(wp[0],wp[1],wp[2]+c.z);g.scale.setScalar(c.scale);
  if(dimMat.current)dimMat.current.opacity=c.dim;if(dimMesh.current)dimMesh.current.visible=c.dim>.005;
 });
 useEffect(()=>()=>dimGeo.dispose(),[dimGeo]);
 return <group ref={ref}>{children}{/* The dimming sheet sits well clear of the slab: the slab tilts and floats inside this group, and at .3 one side of it poked through the sheet, leaving a diagonal undimmed wedge. */}<mesh ref={dimMesh} geometry={dimGeo} position={[0,0,.8]} visible={false} renderOrder={10}><meshBasicMaterial ref={dimMat} color={palette.screenshots.dimSheet} transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh></group>
}
export function Screenshots(props:SlideProps){
 const step=props.step??0,{motion}=useVisualState(),assets=props.slide.assets.slice(0,2),L=screenshotsLayout,second=step>=1,focus=step>=2;
 const poses=(narrow:boolean)=>{
  const two=narrow?L.mobile:L.desktop,aside=narrow?L.asideMobile:L.aside,inbox=narrow?L.inboxMobile:L.inbox;
  const first:Pose=focus?{x:aside.x,y:aside.y,scale:aside.scale,z:aside.z,dim:aside.dim}:{...(second||narrow?two[0]:L.solo),scale:1,z:0,dim:0};
  const firstW=two[0].width;
  const f={x:first.x,y:first.y,width:firstW*(focus?aside.scale:(second||narrow?1:L.solo.width/firstW)),pose:{x:first.x,y:first.y,scale:focus?aside.scale:(second||narrow?1:L.solo.width/firstW),z:first.z,dim:first.dim}};
  const inboxPose:Pose=focus?{x:inbox.x,y:inbox.y,scale:inbox.width/two[1].width,z:inbox.z,dim:0}:{x:two[1].x,y:two[1].y,scale:1,z:0,dim:0};
  const ib={x:inboxPose.x,y:inboxPose.y,width:two[1].width*inboxPose.scale};
  return{two,f,ib,inboxPose}
 };
 const move=props.paused||!motion?'none':`left ${L.seconds}s ease-in-out,top ${L.seconds}s ease-in-out,width ${L.seconds}s ease-in-out,filter ${L.seconds}s ease-in-out`;
 const size=(w:number,m:StageMetrics):[number,number]=>{const ww=w/100*m.worldWidth;return[ww,ww/1.6]};
 // Screenshots are 16:10, so a slab's height in stage percent is its width times (16/9)/1.6. The caption sits just under that.
 const under=(at:{y:number;width:number})=>at.y+at.width*(16/9)/1.6/2+L.captionGap;
 const fade=move==='none'?'none':`left ${L.seconds}s ease-in-out,top ${L.seconds}s ease-in-out,opacity ${L.seconds*.6}s ease-in-out`;
 return <Stage {...props} className="screenshots-stage" scene={m=>{const {two,f,inboxPose}=poses(m.narrow),sz=size(two[0].width,m);return <>
  <Glide to={f.pose} seconds={L.seconds} metrics={m} size={sz}><SilverSlab src={assets[0].src} at={{x:50,y:50,width:two[0].width}} metrics={m} sideX={two[0].x} floatKey={assets[0].id}/></Glide>
  <Glide to={inboxPose} seconds={L.seconds} metrics={m} size={size(two[1].width,m)}><SilverSlab src={assets[1].src} at={{x:50,y:50,width:two[1].width}} metrics={m} visible={second} sideX={two[1].x} floatKey={assets[1].id} tiltScale={focus?.5:1}/></Glide>
 </>}}>{m=>{const {f,ib}=poses(m.narrow);return <>
  <DisplayHit assetId={assets[0].id} src={assets[0].src} alt={assets[0].alt} at={f} onOpen={props.onImageOpen} style={{transition:move,filter:focus?`brightness(${1-L.aside.dim})`:'none'}}/>
  <DisplayHit assetId={assets[1].id} src={assets[1].src} alt={assets[1].alt} at={ib} onOpen={props.onImageOpen} style={{zIndex:focus?3:2,transition:move==='none'?'none':`${move},opacity ${L.seconds}s ease-in-out,visibility 0s linear ${second?0:L.seconds}s`,...(second?{}:{opacity:0,visibility:'hidden'})}}/>
  {/* The headings are not shown, but stay bound to their source nodes. */}
  <p className="concept-caption raised-type" data-source-node="163:2" aria-hidden={focus} style={{left:`${f.x}%`,top:`${under(f)}%`,opacity:focus?0:1,transition:fade}}>{sourceText(props.slide,'163:2')}</p>
  <p className="concept-caption raised-type" data-source-node="163:3" aria-hidden={!second} style={{left:`${ib.x}%`,top:`${under(ib)}%`,opacity:second?1:0,transition:fade}}>{sourceText(props.slide,'163:3')}</p>
  <div className="book-source-text">{['32:4','32:5'].map(id=><span key={id} data-source-node={id}>{sourceText(props.slide,id)}</span>)}</div>
 </>}}</Stage>
}
