import {Suspense,useEffect,useRef,useState,type ReactNode} from 'react';
import {View,OrthographicCamera} from '@react-three/drei';
import {Studio} from './Environment';
import {useVisualState} from './VisualProvider';
import {SpaceStars} from './SpaceStars';
import {starfield} from './starfield';
export type StageMetrics={width:number;height:number;worldWidth:number;narrow:boolean;animate:boolean};
// One authoring canvas on every screen. Only its final presentation scale changes.
const WIDTH=1280,HEIGHT=720,MAX_WIDTH=1440;
export function Stage({active=true,paused=false,className='',scene,children,slide}:{slide?:{id:string};active?:boolean;paused?:boolean;className?:string;scene:(metrics:StageMetrics)=>ReactNode;children:ReactNode|((metrics:StageMetrics)=>ReactNode)}){
 const ref=useRef<HTMLDivElement>(null);
 const[scale,setScale]=useState(1),[inView,setInView]=useState(false);
 const{webgl,motion}=useVisualState();
 useEffect(()=>{
  if(!ref.current)return;
  const el=ref.current;
  const resize=new ResizeObserver(([entry])=>{
   const audience=!!el.closest('.story-section');
   const horizontal=audience?32:0,vertical=audience?144:0;
   setScale(Math.max(.01,Math.min((entry.contentRect.width-horizontal)/WIDTH,(entry.contentRect.height-vertical)/HEIGHT,MAX_WIDTH/WIDTH)));
  });
  resize.observe(el);
  const intersection=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{rootMargin:'100px'});
  intersection.observe(el);
  return()=>{resize.disconnect();intersection.disconnect()};
 },[]);
 const seed=slide?.id??className,stars=starfield(seed);
 const metrics={width:WIDTH,height:HEIGHT,worldWidth:10*WIDTH/HEIGHT,narrow:false,animate:active&&!paused&&motion&&inView};
 return <div ref={ref} className="visual-frame"><div className={`visual-stage ${className}`} style={{transform:`translate(-50%,-50%) scale(${scale})`}} data-renderer={webgl?'three':'static'}>{inView&&webgl&&<View style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} visible={inView}><OrthographicCamera manual makeDefault position={[0,0,20]} left={-metrics.worldWidth/2} right={metrics.worldWidth/2} top={5} bottom={-5} near={.1} far={100}/><Studio/><SpaceStars seed={seed} metrics={metrics}/><Suspense fallback={null}>{scene(metrics)}</Suspense></View>}{typeof children==='function'?children(metrics):children}<div className="space-sparks" aria-hidden="true">{stars.map((s,i)=><i key={i} style={{left:`${s.x}%`,top:`${s.y}%`,fontSize:s.size,opacity:s.opacity}}>✦</i>)}</div></div></div>;
}
export const worldPosition=(x:number,y:number,metrics:StageMetrics,z=0):[number,number,number]=>[(x/100-.5)*metrics.worldWidth,(.5-y/100)*10,z];
