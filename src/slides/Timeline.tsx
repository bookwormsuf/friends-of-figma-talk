import {useLayoutEffect,useRef,useState} from 'react';
import {Stage,worldPosition} from '../visuals/Stage';
import {ChromeMaterial,MetalLine,FallbackLine} from '../visuals/ChromePrimitives';
import {sourceText,type SlideProps} from './types';
export const timelineLayout={desktop:{x:[7,30,53,76],y:49},mobile:{x:17,y:[17,39,61,83]}};
const DOT_RADIUS=.17;
const ids=[['4:157','4:158','4:159'],['4:160','4:161','4:162'],['4:163','4:164','4:165'],['4:166','4:167','4:168']];
/** Each dot is centred under its year label. Years differ in width, so the centres come from measuring the rendered labels in composition pixels. */
export function Timeline(props:SlideProps){
 const years=useRef<(HTMLDivElement|null)[]>([]);
 const [centres,setCentres]=useState<number[]|null>(null);
 useLayoutEffect(()=>{
  const els=years.current.filter((e):e is HTMLDivElement=>!!e);if(els.length!==ids.length)return;
  const stage=els[0].closest<HTMLElement>('.visual-stage');if(!stage)return;
  const measure=()=>{const width=stage.offsetWidth||1;setCentres(els.map((el,i)=>timelineLayout.desktop.x[i]+(el.offsetWidth/2)/width*100))};
  measure();
  const observer=new ResizeObserver(measure);els.forEach(el=>observer.observe(el));
  document.fonts?.ready.then(measure);
  return()=>observer.disconnect();
 },[]);
 const dotX=(i:number)=>centres?.[i]??timelineLayout.desktop.x[i];
 const linePoints=(narrow:boolean):[number,number][]=>narrow?[[17,17],[17,83]]:[[dotX(0),49],[dotX(3),49]];
 return <Stage {...props} className="timeline-stage" scene={m=><><MetalLine points={linePoints(m.narrow)} metrics={m}/>{ids.map((_,i)=><mesh key={i} position={worldPosition(m.narrow?17:dotX(i),m.narrow?timelineLayout.mobile.y[i]:49,m,.1)}><sphereGeometry args={[m.narrow?DOT_RADIUS*.7:DOT_RADIUS,24,16]}/><ChromeMaterial/></mesh>)}</>}>{m=><><FallbackLine points={linePoints(m.narrow)}/><div className={`timeline-copy ${m.narrow?'vertical':''}`}>{ids.map(([year,name,detail],i)=><div className="timeline-stop" key={year} style={m.narrow?{left:'28%',top:`${timelineLayout.mobile.y[i]}%`}:{left:`${timelineLayout.desktop.x[i]}%`,top:'49%'}}><div ref={el=>{years.current[i]=el}} className="timeline-year raised-type" data-source-node={year}>{sourceText(props.slide,year)}</div><div className="timeline-name" data-source-node={name}>{sourceText(props.slide,name)}</div><p data-source-node={detail}>{sourceText(props.slide,detail)}</p></div>)}</div></>}</Stage>;
}
