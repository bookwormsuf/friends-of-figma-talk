import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {outline} from './geometry';
import {advanceFloat} from './slabMotion';
import {glowTuning} from '../editor/tuning';
import {palette} from '../theme/palette';
import {rgba} from '../theme/colour';
export type GlowKind='cloud'|'burst';
/** Cloud runs blue to purple, burst runs orange to pink. Pink is in both, so the two blend where they meet.
 * far, mid and near are the glow from widest to tightest. rim is the hot edge, patch is the other shape's colour bleeding in. */
export const PALETTE={
 cloud:{far:palette.glow.cloudFar,mid:palette.glow.cloudMid,near:palette.glow.cloudNear,rim:palette.glow.cloudRim,patch:palette.glow.cloudPatch},
 burst:{far:palette.glow.burstFar,mid:palette.glow.burstMid,near:palette.glow.burstNear,rim:palette.glow.burstRim,patch:palette.glow.burstPatch},
} as const;
const PX=512,OFF=4096;
/** Overall look. SOFT scales every layer's brightness and DIFFUSE scales every blur. How far the glow spreads is `reach`, set in ChromeObject. */
const SOFT=.8,DIFFUSE=1.1;
function canvasOf(w:number,h:number){const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return[c,c.getContext('2d')!] as const}
/** Draws only the blurred shadow of a path. shadowBlur works in every browser, where canvas filter does not (Safari). */
function soft(ctx:CanvasRenderingContext2D,color:string,blur:number,draw:()=>void){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.shadowOffsetX=OFF;ctx.translate(-OFF,0);draw();ctx.restore()}
/** One glow image for a shape drawn w by h world units, with `reach` world units of glow around it. */
function paint(kind:GlowKind,w:number,h:number,reach:number){
 const unit=PX/Math.max(w,h),R=reach*unit,[canvas,ctx]=canvasOf((w+2*reach)*unit,(h+2*reach)*unit),W=canvas.width,H=canvas.height,c=PALETTE[kind];
 const pts=outline(kind).getSpacedPoints(180),box=new THREE.Box2().setFromPoints(pts),size=box.getSize(new THREE.Vector2()),mid=box.getCenter(new THREE.Vector2());
 const trace=(to:CanvasRenderingContext2D)=>{to.beginPath();pts.forEach((p,i)=>{const x=W/2+(p.x-mid.x)/size.x*w*unit,y=H/2-(p.y-mid.y)/size.y*h*unit;i?to.lineTo(x,y):to.moveTo(x,y)});to.closePath()};
 ctx.globalCompositeOperation='lighter';ctx.fillStyle=palette.glow.ink;
 // Three blurred copies of the silhouette, widest first. Kept faint: the glow should sit behind the shape, not outline it.
 soft(ctx,rgba(c.far,.45*SOFT),R*DIFFUSE,()=>{trace(ctx);ctx.fill()});
 soft(ctx,rgba(c.mid,.38*SOFT),R*.6*DIFFUSE,()=>{trace(ctx);ctx.fill()});
 soft(ctx,rgba(c.near,.3*SOFT),R*.3*DIFFUSE,()=>{trace(ctx);ctx.fill()});
 // The other shape's colour, low on the cloud and high on the burst.
 const py=kind==='cloud'?H-R*1.25:R*1.25,pr=Math.min(W,H)*.34,g=ctx.createRadialGradient(W/2,py,0,W/2,py,pr);g.addColorStop(0,rgba(c.patch,.25*SOFT));g.addColorStop(1,rgba(c.patch,0));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Hot rim: a soft bright band just outside the edge, strongest at the top left and gone by the bottom right.
 const [rimCanvas,rim]=canvasOf(W,H);rim.strokeStyle=palette.glow.ink;rim.lineWidth=R*.1;rim.lineJoin='round';
 const stroke=()=>{trace(rim);rim.stroke()};
 soft(rim,rgba(c.rim,.5*SOFT),R*.2*DIFFUSE,stroke);soft(rim,rgba(c.rim,.4*SOFT),R*.4*DIFFUSE,stroke);
 rim.globalCompositeOperation='destination-in';const fade=rim.createLinearGradient(0,0,W*.75,H*.9);fade.addColorStop(0,palette.glow.ink);fade.addColorStop(.45,palette.glow.inkFade);fade.addColorStop(1,palette.glow.inkClear);rim.fillStyle=fade;rim.fillRect(0,0,W,H);
 ctx.drawImage(rimCanvas,0,0);
 // Fade to nothing at the canvas edge, so the stage never clips a visible glow. The mask is built on its own canvas: a shadow drawn straight in with destination-in would wipe everything.
 const [maskCanvas,mask]=canvasOf(W,H),m=R*.5;mask.fillStyle=palette.glow.ink;soft(mask,palette.glow.ink,m,()=>mask.fillRect(m,m,W-2*m,H-2*m));
 ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const cache=new Map<string,THREE.CanvasTexture>();
function glowTexture(kind:GlowKind,w:number,h:number,reach:number){
 const key=[kind,w.toFixed(2),h.toFixed(2),reach.toFixed(2)].join('|');let t=cache.get(key);if(!t){t=paint(kind,w,h,reach);cache.set(key,t)}return t;
}
/** Soft coloured glow that hugs the outline of a cloud or burst. Lives inside the shape's group, so it follows the float. It breathes slowly on its own clock.
 * w and h are the shape's drawn size and reach is how far the glow may spread, all in world units. */
export function Glow({kind,w,h,reach,seed,animate,level}:{kind:GlowKind;w:number;h:number;reach:number;seed:number;animate:boolean;/** Optional live dimmer, 0 to 1 or a little above. Read every frame. */level?:{current:number}}){
 const mesh=useRef<THREE.Mesh>(null),material=useRef<THREE.MeshBasicMaterial>(null),clock=useRef(0),texture=useMemo(()=>glowTexture(kind,w,h,reach),[kind,w,h,reach]);
 const geometry=useMemo(()=>new THREE.PlaneGeometry(w+2*reach,h+2*reach),[w,h,reach]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame((_s,delta)=>{
  const m=mesh.current,mat=material.current;if(!m||!mat)return;
  if(animate)clock.current=advanceFloat(clock.current,delta);
  // Two slow sines, so the breath never looks like a metronome.
  const breath=animate?(.6*Math.sin(clock.current*1.05+seed)+.4*Math.sin(clock.current*.61+seed*1.7))*glowTuning.breathe:0;
  m.scale.setScalar(glowTuning.size*(1+.035*breath));mat.opacity=Math.max(0,Math.min(1,glowTuning.strength*(.86+.14*breath)*(level?level.current:1)));
 });
 return <mesh ref={mesh} geometry={geometry} position={[0,0,-3]} renderOrder={-1}><meshBasicMaterial ref={material} map={texture} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
}
