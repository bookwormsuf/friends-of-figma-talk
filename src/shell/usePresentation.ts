import {useCallback,useEffect,useRef,useState} from 'react';
import type {SlideData} from '../data/types';
import {INTERACTIVE,isNavigationKey,locateSlide,logicalSlide,navigationTarget,slideHash,stepNavigation,type Section} from './navigation';
/** Scroll position gives the section; step picks the logical slide inside it (a pinned slide, or a gallery image). `index` is the logical slide index. */
/** instant: slide changes jump instead of gliding. The Notes view sets it, because the deck it moves is out of sight. */
export function usePresentation(slides:SlideData[],blocked:boolean,sections:Section[],instant=false){
 const [section,setSection]=useState(0),[step,setStep]=useState(0),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const frame=useRef(0),requested=useRef<number|null>(null),current=useRef(0),blockedRef=useRef(blocked),instantRef=useRef(instant);blockedRef.current=blocked;instantRef.current=instant;
 // Step belongs to stepIndex (a section). A navigate-initiated scroll parks its landing step in pending until that section arrives.
 const stepRef=useRef(0),stepIndex=useRef(0),pending=useRef<{index:number;step:number}|null>(null),sectionsRef=useRef(sections);sectionsRef.current=sections;
 const ready=useRef(false);
 const writeHash=useCallback((sec:number,st:number)=>{const hash=slideHash(slides[logicalSlide(sectionsRef.current,sec,st)]?.id??'');if(hash!==location.hash)history.replaceState(null,'',location.pathname+location.search+hash)},[slides]);
 const applyStep=useCallback((n:number,sec=stepIndex.current)=>{stepRef.current=n;setStep(n);if(ready.current)writeHash(sec,n)},[writeHash]);
 const els=()=>Array.from(document.querySelectorAll<HTMLElement>('.story-section'));
 const cancel=useCallback(()=>{cancelAnimationFrame(frame.current);frame.current=0;requested.current=null;document.documentElement.style.scrollSnapType='';},[]);
 const update=useCallback(()=>{const list=els();const marker=scrollY+Math.min(innerHeight*.32,220);let next=0;list.forEach((e,i)=>{if(e.offsetTop<=marker)next=i});current.current=next;setSection(next);
  if(next!==stepIndex.current){stepIndex.current=next;const p=pending.current;if(p&&p.index===next){pending.current=null;applyStep(p.step,next)}else{if(requested.current===null)pending.current=null;applyStep(0,next)}}
  document.documentElement.dataset.section=String(next);writeHash(next,stepRef.current);},[applyStep,writeHash]);
 const scroll=useCallback((top:number,target:number)=>{cancelAnimationFrame(frame.current);requested.current=target;const start=scrollY,started=performance.now();document.documentElement.style.scrollSnapType='none';if(reduced||document.hidden||instantRef.current){window.scrollTo({top,behavior:'instant'});cancel();update();return;}const tick=(now:number)=>{const p=Math.min(1,(now-started)/460);window.scrollTo({top:start+(top-start)*(1-(1-p)**3),behavior:'instant'});if(p<1)frame.current=requestAnimationFrame(tick);else{cancel();update();}};frame.current=requestAnimationFrame(tick);},[reduced,cancel,update]);
 // force: the presenter window closes any open panel and moves in the same message, before blocked has re-rendered.
 const navigate=useCallback((direction:number,force=false)=>{if(blockedRef.current&&!force)return;const dir=direction>0?1:-1,at=requested.current??current.current,waiting=requested.current!==null&&pending.current?.index===at?pending.current.step:requested.current!==null?0:stepRef.current,s=stepNavigation(waiting,sectionsRef.current[at]?.steps??0,dir);if(!s.move){pending.current=null;applyStep(s.step,at);return}
 const list=els();const target=navigationTarget(list.map(e=>({top:e.offsetTop,height:e.offsetHeight})),current.current,requested.current,direction,scrollY,innerHeight);
 // Long slides scroll internally first: that is not a slide change, so leave steps alone.
 pending.current=target.index!==at?{index:target.index,step:dir>0?0:sectionsRef.current[target.index]?.steps??0}:null;scroll(target.top,target.index);},[scroll,applyStep]);
 /** Jump to any logical slide, including a pinned one: scroll to its anchor section and set the step. */
 const goToSlide=useCallback((slideIndex:number,instant=false)=>{if(slideIndex<0)return;const loc=locateSlide(sectionsRef.current,slideIndex),el=els()[loc.section];if(!el)return;
  if(loc.section===(requested.current??current.current)){pending.current=null;applyStep(loc.step,loc.section)}else pending.current={index:loc.section,step:loc.step};
  if(instant){window.scrollTo({top:el.offsetTop,behavior:'instant'});update()}else scroll(el.offsetTop,loc.section);},[scroll,applyStep,update]);
 const goTo=useCallback((id:string)=>goToSlide(slides.findIndex(s=>s.id===id)),[slides,goToSlide]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 useEffect(()=>{let updateFrame=0;const onScroll=()=>{if(!updateFrame)updateFrame=requestAnimationFrame(()=>{updateFrame=0;update()})};const onHash=()=>{const i=slides.findIndex(s=>slideHash(s.id)===location.hash);if(i>=0)goToSlide(i)};// A key held a moment too long repeats. Each repeat used to count as another press, which skipped in-slide steps such as the spark on the last animation.
   const onKey=(e:KeyboardEvent)=>{if(blockedRef.current||e.repeat||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target instanceof Element&&e.target.closest(INTERACTIVE))return;const d=isNavigationKey(e.key);if(d){e.preventDefault();navigate(d)}};addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);const interrupt=()=>{pending.current=null;cancel()};addEventListener('wheel',interrupt,{passive:true});addEventListener('touchstart',interrupt,{passive:true});addEventListener('keydown',onKey);addEventListener('hashchange',onHash);
  // Read the link before anything writes the hash back.
  const initialHash=location.hash;const init=requestAnimationFrame(()=>{const i=slides.findIndex(s=>slideHash(s.id)===initialHash);if(i>=0){const loc=locateSlide(sectionsRef.current,i);window.scrollTo({top:els()[loc.section]?.offsetTop??0,behavior:'instant'});if(loc.section===stepIndex.current)applyStep(loc.step,loc.section);else pending.current={index:loc.section,step:loc.step}}update();ready.current=true});
  return()=>{cancel();cancelAnimationFrame(init);cancelAnimationFrame(updateFrame);removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);removeEventListener('wheel',interrupt);removeEventListener('touchstart',interrupt);removeEventListener('keydown',onKey);removeEventListener('hashchange',onHash)};},[slides,navigate,goToSlide,cancel,update,applyStep]);
 useEffect(()=>{if(blocked)cancel()},[blocked,cancel]);
 return{index:logicalSlide(sections,section,step),section,step,reduced,navigate,goTo,cancel};
}
