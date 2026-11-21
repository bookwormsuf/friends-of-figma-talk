import {Component,useEffect,useRef,type KeyboardEvent,type ReactNode} from 'react';
import type {SlideData} from '../data/types';
import {SlideVisual} from '../visuals/SlideVisual';
import {VisualProvider} from '../visuals/VisualProvider';
import type {OverviewCard,Section} from './navigation';
/** A thumbnail that fails to render falls back to its number and first text, never a blank card. */
class ThumbBoundary extends Component<{children:ReactNode;card:OverviewCard},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<div className="overview-thumb-fallback"><b>{this.props.card.number}</b><span>{this.props.card.caption}</span></div>:this.props.children}}
type Props={slides:SlideData[];sections:Section[];cards:OverviewCard[];current:number;onJump:(card:OverviewCard)=>void;onClose:()=>void};
export function Overview({slides,sections,cards,current,onJump,onClose}:Props){
 const root=useRef<HTMLDivElement>(null),grid=useRef<HTMLOListElement>(null);
 const hits=()=>Array.from(grid.current?.querySelectorAll<HTMLButtonElement>('.overview-hit')??[]);
 useEffect(()=>{const hit=hits()[current];hit?.focus({preventScroll:true});hit?.scrollIntoView({block:'center'})},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const onKey=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return}
  if(e.key==='Tab'){const f=Array.from(root.current?.querySelectorAll<HTMLElement>('button')??[]);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}
  const list=hits(),at=list.indexOf(document.activeElement as HTMLButtonElement);if(at<0)return;
  const cols=new Set(list.map(b=>b.offsetTop)).size?list.filter(b=>b.offsetTop===list[0].offsetTop).length:1;
  const to=e.key==='ArrowRight'?at+1:e.key==='ArrowLeft'?at-1:e.key==='ArrowDown'?at+cols:e.key==='ArrowUp'?at-cols:e.key==='Home'?0:e.key==='End'?list.length-1:null;
  if(to===null||e.altKey||e.ctrlKey||e.metaKey)return;e.preventDefault();e.stopPropagation();list[Math.max(0,Math.min(list.length-1,to))].focus();
 };
 return <div ref={root} className="overview" role="dialog" aria-modal="true" aria-label="All slides" onKeyDown={onKey}>
  <div className="overview-bar"><h2>All slides <span>{cards.length}</span></h2><button className="close-button" onClick={onClose}>Close <kbd>Esc</kbd></button></div>
  <VisualProvider paused staticOnly><ol ref={grid} className="overview-grid">{cards.map(c=>{const anchor=slides[sections[c.section].anchorIndex],pinned=sections[c.section].slideIndices.slice(1).map(i=>slides[i]);
   return <li key={c.slideId} className="overview-card" data-current={c.index===current||undefined} data-pinned={c.pinned||undefined}>
    <div className="overview-thumb" aria-hidden="true" inert><div className="overview-thumb-inner"><ThumbBoundary card={c}><SlideVisual slide={anchor} pinned={pinned} active paused step={c.step}/></ThumbBoundary></div></div>
    <div className="overview-meta"><b>{c.number}</b><span className="overview-caption">{c.caption||`Slide ${c.number}`}</span>{c.steps>0&&<em>{c.steps} {c.steps===1?"step":"steps"}</em>}{c.pinned&&<em>pinned</em>}</div>
    <button className="overview-hit" aria-current={c.index===current||undefined} aria-label={`Go to slide ${c.number}${c.caption?`: ${c.caption}`:''}`} onClick={()=>onJump(c)}/>
   </li>})}</ol></VisualProvider>
 </div>;
}
