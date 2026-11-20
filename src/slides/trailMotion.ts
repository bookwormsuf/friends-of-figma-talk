/** Motion for the layout kind 'trail': a screenshot becomes the "Raw data → ? → Final synthesis" diagram, and the diagram then opens into a string of nodes.
 * Pure: same inputs, same pose. t runs 0 (screenshot only) to 1 (the diagram, as on slide 13) to 2 (the string of nodes). Going back is the same function with t running down.
 * Positions and disc widths are stage percent. Node and link radii are world units (the stage is 10 tall). */
export type TrailVariation=1|2|3;
export type TrailDisc={x:number;y:number;width:number};
export type TrailNode={x:number;y:number;r:number};
/** ends: where "Raw data" and "Final synthesis" finish. nodes: the string between them, in order.
 * A link is as thick as `share` of the node it touches (endR stands in for the two discs) and thins to `neck` halfway. flare: higher keeps the thick part closer to the node. arrow: keep the arrowhead into the last disc. */
export type TrailChain={ends:[TrailDisc,TrailDisc];nodes:TrailNode[];endR:number;share:number;neck:number;flare:number;arrow:boolean};
export type TrailSpec={slab:{x:number;y:number;width:number};diagram:{left:TrailDisc;right:TrailDisc;capsule:{x:number;y:number;width:number;height:number};line:number};chain:TrailChain};
export type TrailPose={
 /** scale is relative to the slab's own full size. 0 means not drawn. */
 slab:{x:number;y:number;scale:number;rotation:number};
 capsule:{x:number;y:number;scale:number};
 ends:[TrailDisc,TrailDisc];
 nodes:TrailNode[];
 /** One per gap in the path [left disc, ...nodes, right disc]: radius at each end and halfway. */
 links:{ra:number;rb:number;neck:number}[];
 flare:number;
 /** Share of the whole path that is drawn, from the left. */
 grow:number;
 arrow:number;
 /** Opacity of the two disc labels and of the question mark. */
 labels:{ends:number;question:number};
};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(p:number)=>p*p*p*(p*(p*6-15)+10);
const mix=(a:number,b:number,k:number)=>a+(b-a)*k;
const span=(p:number,a:number,b:number)=>clamp01((p-a)/(b-a));
/** Overshoots a little before settling. */
const back=(t:number)=>t>=1?1:t<=0?0:1+2.2*(t-1)**3+1.2*(t-1)**2;
/** 1 unfold: the screenshot shrinks into the "?" pill, the two discs slide out from behind it, then the line between them unfolds into a zigzag of small nodes, all at once.
 * 2 beads: the screenshot spins shut, the discs pop in and the line draws left to right, then drops of different sizes swell along it one after another.
 * 3 bud: the discs pull out of the pill on thick bridges that thin into the line, then the pill divides into a few large blobs that stretch apart. */
export function trailPose(v:TrailVariation,t:number,S:TrailSpec):TrailPose{
 const u=clamp01(t),w=clamp01(t-1),D=S.diagram,C=S.chain,cap=D.capsule,n=C.nodes.length;
 // The slab shrinks until it has the pill's footprint, then the pill takes over in front of it.
 const a=v===2?.3:v===3?.5:.45,shrink=smooth(span(u,0,a)),k=cap.width/S.slab.width;
 const slab={x:mix(S.slab.x,cap.x,shrink),y:mix(S.slab.y,cap.y,shrink),scale:mix(1,k,shrink)*(1-smooth(span(u,a-.04,a+.12))),rotation:v===2&&shrink>0?-.35*shrink:0};
 const capIn=back(span(u,a-.06,a+.24)),capOut=1-smooth(span(w,0,v===3?.4:.3)),capsule={x:cap.x,y:cap.y,scale:Math.max(0,capIn*capOut)};
 // Step one: where each disc is on the way to its diagram spot.
 const discs=[D.left,D.right].map((d,i)=>{
  if(v===2){const e=back(span(u,i?.5:.35,i?.85:.7));return{x:d.x,y:d.y,width:d.width*Math.max(0,e)}}
  const from=v===3?.5:.42,e=smooth(span(u,from,v===3?.96:.92)),born=smooth(span(u,from-.08,from));
  return{x:mix(cap.x,d.x,e),y:mix(cap.y,d.y,e),width:d.width*mix(v===3?.3:.35,1,e)*born};
 });
 // Step two: each disc moves on to the end of the string.
 const ends=discs.map((d,i)=>{
  const g=v===1?smooth(span(w,0,.85)):v===2?smooth(i?span(w,.35,1):span(w,0,.55)):smooth(span(w,.2,1)),to=C.ends[i];
  return{x:mix(d.x,to.x,g),y:mix(d.y,to.y,g),width:mix(d.width,to.width,g)};
 }) as [TrailDisc,TrailDisc];
 // Until step two a node has no size and sits on the straight line between the discs, so the links between nodes draw that line. Variation 3 keeps them all in the middle, under the pill.
 const nodes=C.nodes.map((to,j)=>{
  const f=v===3?.5:(j+1)/(n+1),bx=mix(ends[0].x,ends[1].x,f),by=mix(ends[0].y,ends[1].y,f),s=.06+j*.5/Math.max(1,n);
  const g=v===1?smooth(span(w,0,.85)):v===2?back(span(w,s,s+.42)):smooth(span(w,.25,1));
  const size=v===1?smooth(span(w,.05,.55)):v===2?back(span(w,s,s+.3)):smooth(span(w,0,.35));
  return{x:mix(bx,to.x,g),y:mix(by,to.y,g),r:to.r*Math.max(0,size)};
 });
 const q=v===1?smooth(span(w,0,.6)):v===2?smooth(span(w,.15,.9)):smooth(span(w,.2,.8));
 // In variation 3 the discs leave the pill on a thick bridge that thins into the line.
 const line=v===3?mix(.55,D.line,smooth(span(u,.5,1))):D.line,radius=(i:number)=>i===0||i===n+1?C.endR:C.nodes[i-1].r;
 const links=Array.from({length:n+1},(_,i)=>({ra:mix(line,Math.max(C.neck,C.share*radius(i)),q),rb:mix(line,Math.max(C.neck,C.share*radius(i+1)),q),neck:mix(line,C.neck,q)}));
 const arrowIn=v===2?back(span(u,.88,1)):smooth(span(u,v===3?.85:.8,1)),arrow=Math.max(0,arrowIn*(C.arrow?1:1-smooth(span(w,0,.25))));
 return{slab,capsule,ends,nodes,links,flare:C.flare,grow:v===2?smooth(span(u,.45,.95)):1,arrow,labels:{ends:smooth(span(u,.8,1)),question:clamp01((capsule.scale-.5)*2)}};
}
