/** Motion for the layout kind 'split': one parent panel becomes several child panels. Pure: same inputs, same poses.
 * p runs 0 (only the parent) to 1 (only the children). Going back is the same function with p running down. */
export type SplitTarget={x:number;y:number;rotation:number};
/** x and y are stage percent, scale is relative to the panel's own full size, rotation is radians. A panel with visible false is not drawn. */
export type SplitPose={x:number;y:number;scale:number;rotation:number;visible:boolean};
export type SplitVariation=1|2|3;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(p:number)=>p*p*p*(p*(p*6-15)+10);
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const span=(p:number,a:number,b:number)=>clamp01((p-a)/(b-a));
/** Overshoots a little before settling. */
const back=(t:number)=>t>=1?1:t<=0?0:1+2.2*(t-1)**3+1.2*(t-1)**2;
/** How big the parent is at p. It is gone (0) by the end in every variation. */
export function splitParent(v:SplitVariation,p:number):number{
 if(p<=0)return 1;if(p>=1)return 0;
 // 1: eases back a touch, holds while the children leave, then shrinks away. 2: collapses fast, like a breath in. 3: shrinks steadily as the two halves pull apart.
 if(v===1)return mix(1,.9,smooth(span(p,0,.15)))*(1-smooth(span(p,.5,.9)));
 if(v===2)return 1-span(p,0,.28)**2;
 return 1-smooth(span(p,0,.42));
}
/** Pose of child i of `count` at p. `from` is the parent's centre. `columns` is how many children sit in a row, used by variation 3.
 * 1 deal: children slide out from behind the parent one after another. 2 burst: all pop out of the centre at once, spinning a little, and overshoot.
 * 3 divide: the parent splits into one stack per row, then each stack fans out into its panels. */
export function splitChild(v:SplitVariation,i:number,_count:number,p:number,from:{x:number;y:number},to:SplitTarget,columns=3):SplitPose{
 if(p>=1)return{x:to.x,y:to.y,scale:1,rotation:to.rotation,visible:true};
 if(v===1){
  const start=.1+i*.067,e=smooth(span(p,start,start+.5));
  return{x:mix(from.x,to.x,e),y:mix(from.y,to.y,e),scale:mix(.55,1,e),rotation:to.rotation*e,visible:p>start};
 }
 if(v===2){
  const t=span(p,.2,1),e=back(t),spin=(i%2?1:-1)*(.35+.1*(i%3));
  return{x:mix(from.x,to.x,e),y:mix(from.y,to.y,e),scale:Math.max(0,e),rotation:mix(spin,to.rotation,smooth(t)),visible:t>0};
 }
 const col=i%columns;
 // The stack for a row sits most of the way towards that row, straight above or below the parent's centre. Its panels are fanned a little so the stack reads as several.
 const a=smooth(span(p,0,.45)),b=smooth(span(p,.4,1)),sx=from.x+(col-(columns-1)/2)*1.6,sy=mix(from.y,to.y,.85);
 const ax=mix(from.x,sx,a),ay=mix(from.y,sy,a);
 return{x:mix(ax,to.x,b),y:mix(ay,to.y,b),scale:mix(mix(.5,.8,a),1,b),rotation:to.rotation*b,visible:p>0};
}
