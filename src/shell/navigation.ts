export type SectionBounds = {top:number;height:number};
export const slideHash = (id:string) => `#slide-${id.replaceAll(':','-')}`;
export function navigationTarget(sections:SectionBounds[], index:number, requested:number|null, direction:number, y:number, viewport:number) {
 const from=requested??index, section=sections[from];
 if(!section)return {index,top:y};
 const bottom=Math.max(section.top,section.top+section.height-viewport);
 if(requested===null&&direction>0&&y<bottom-4)return{index:from,top:Math.min(bottom,y+viewport*.78)};
 if(requested===null&&direction<0&&y>section.top+4)return{index:from,top:Math.max(section.top,y-viewport*.78)};
 const next=Math.max(0,Math.min(sections.length-1,from+direction)),target=sections[next];
 return{index:next,top:direction<0?Math.max(target.top,target.top+target.height-viewport):target.top};
}
/** In-slide steps: consume a step before moving to the next or previous slide. */
export function stepNavigation(step:number,steps:number,direction:1|-1):{step:number;move:boolean}{
 if(direction>0)return step<steps?{step:step+1,move:false}:{step,move:true};
 return step>0?{step:step-1,move:false}:{step,move:true};
}
/** One scroll section. slideIndices[0] is the anchor slide; the rest are slides pinned to it, shown as in-slide steps 1..N. */
export type Section={anchorIndex:number;slideIndices:number[];steps:number};
type SectionSlide={id:string;assets:unknown[]};
type SectionLayout={kind:string;anchor?:string;steps?:number;reveal?:unknown[]};
/** Groups slides into sections. A pinned slide joins its anchor's section instead of getting its own.
 * Steps are the pinned count, an explicit `steps`, the image count for a gallery anchor, or one per reveal group after the first. */
export function buildSections(slides:SectionSlide[],layouts:Record<string,SectionLayout|undefined>):Section[]{
 const sections:Section[]=[],byId=new Map<string,Section>();
 slides.forEach((slide,i)=>{
  const layout=layouts[slide.id];
  if(layout?.kind==='pinned'){
   const anchor=layout.anchor?byId.get(layout.anchor):undefined;
   if(!anchor)throw new Error(`Slide ${slide.id} is pinned to ${layout.anchor}, which must come earlier in the deck.`);
   anchor.slideIndices.push(i);anchor.steps=anchor.slideIndices.length-1;return;
  }
  const section:Section={anchorIndex:i,slideIndices:[i],steps:layout?.steps??(layout?.kind==='gallery'?slide.assets.length:layout?.kind==='book'?2:layout?.reveal?Math.max(0,layout.reveal.length-1):0)};
  sections.push(section);byId.set(slide.id,section);
 });
 return sections;
}
/** True when there is nowhere left to go in that direction: the last section with all its in-slide steps used, or the first section at step 0.
 * The Next and Previous buttons use this, so Next stays live on the final slide while it still has steps to play. */
export function atEdge(sections:Section[],section:number,step:number,direction:1|-1):boolean{
 return direction>0?section>=sections.length-1&&step>=(sections[section]?.steps??0):section<=0&&step<=0;
}
/** The slide shown by a section at a step. Gallery steps (no pinned slides) stay on the anchor. */
export function logicalSlide(sections:Section[],sectionIndex:number,step:number):number{
 const s=sections[sectionIndex];if(!s)return 0;
 return s.slideIndices.length>1?s.slideIndices[Math.max(0,Math.min(s.slideIndices.length-1,step))]:s.anchorIndex;
}
/** Section and step that show a slide, for links and the slide picker. */
export function locateSlide(sections:Section[],slideIndex:number):{section:number;step:number}{
 for(let i=0;i<sections.length;i++){const k=sections[i].slideIndices.indexOf(slideIndex);if(k>=0)return{section:i,step:k}}
 return{section:0,step:0};
}
/** One Next or Previous press across sections: consume a step first, then move section, landing on step 0 going forward and the last step going back. Null at either end. */
export function advancePosition(sections:Section[],section:number,step:number,direction:1|-1):{section:number;step:number}|null{
 const s=stepNavigation(step,sections[section]?.steps??0,direction);
 if(!s.move)return{section,step:s.step};
 const next=section+direction;if(next<0||next>=sections.length)return null;
 return{section:next,step:direction>0?0:sections[next].steps};
}
export function isNavigationKey(key:string){return ['ArrowDown','ArrowRight','PageDown'].includes(key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(key)?-1:0;}
export const INTERACTIVE='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="spinbutton"],[role="textbox"],[role="combobox"],[role="listbox"],[role="menu"],[role="tablist"],[data-arrow-keys="local"],dialog[open]';

export type OverviewCard={index:number;slideId:string;number:number;caption:string;steps:number;pinned:boolean;section:number;step:number};
/** One card per logical slide, in deck order. Pinned slides get their own card pointing at their anchor's section and step. */
export function overviewCards(slides:{id:string;text:{text:string}[]}[],sections:Section[]):OverviewCard[]{
 return slides.map((slide,index)=>{const loc=locateSlide(sections,index),sec=sections[loc.section];
  return{index,slideId:slide.id,number:index+1,caption:slide.text.find(t=>t.text.trim())?.text.trim().replace(/\s+/g,' ')??'',steps:loc.step===0?sec.steps:0,pinned:loc.step>0&&sec.slideIndices.length>1,section:loc.section,step:loc.step};});
}
/** How far through the talk a position is, from just above 0 to 1, counting every press of Next: each slide change and each in-slide step. The progress bar uses it, so a slide with steps fills a little on every press. */
export function pressProgress(sections:Section[],section:number,step:number):number{
 let before=0,total=0;sections.forEach((s,i)=>{if(i<section)before+=s.steps+1;total+=s.steps+1});
 const at=sections[section];return total?(before+Math.max(0,Math.min(at?.steps??0,step))+1)/total:0;
}
