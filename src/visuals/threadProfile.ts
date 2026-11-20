/** Shared mercury thread profile for the diagram and its animated continuation. */
export function threadRadius(u:number,length:number,time:number,speed:number,animate:boolean){
 const span=.65/Math.max(.1,length),head=animate?((time*speed*3)%(1+4*span))-2*span:.4;
 const d=(u-head)/span,d2=(u-head+span*1.7)/(span*.6);
 const swell=1+.42*(.65*Math.sin(u*length*1.05-time*.7)+.35*Math.sin(u*length*2.3+time*.45));
 return .07*swell+.11*Math.exp(-d*d)+.11*.35*Math.exp(-d2*d2);
}
export const threadSway=(u:number,length:number,time:number,animate:boolean)=>animate?.04*Math.sin(Math.PI*u)*Math.sin(u*length*1.3-time*.9):0;
/** Visible interval of one path segment after removing the parts inside endpoint discs. */
export function trimThreadSegment(offset:number,length:number,total:number,leftRadius:number,rightRadius:number,arrow:number){
 if(length<1e-6)return null;
 const start=Math.max(0,(leftRadius+.04-offset)/length),end=Math.min(1,(total-rightRadius-.04-.42*arrow-offset)/length);
 return end>start?{start,end}:null;
}
