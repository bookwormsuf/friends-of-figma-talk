/** Pure layout for the lecture hall. World units: the stage is 10 tall and worldWidth wide, centred on 0. No Three.js here so it is easy to test. */
export type HallParams={rows:number;rowSpacing:number;rowCurve:number;seatSize:number;floorY:number;ceilingRadius:number};
export type Seat={x:number;y:number;z:number;size:number;tilt:number;row:number};
/** Seats stay behind the slab: slabs are about .4 deep and tilt up to .22rad, so the nearest row sits at z -2.7. */
export const HALL_NEAR_Z=-2.7;
export const floorWorldY=(floorY:number)=>(.5-floorY/100)*10;
export function hallSeats(h:HallParams,worldWidth:number):Seat[]{
 const rows=Math.max(1,Math.round(h.rows)),out:Seat[]=[];let y=floorWorldY(h.floorY)-.75;
 for(let r=0;r<rows;r++){
  const t=rows>1?r/(rows-1):1,size=h.seatSize*(.75+.5*t),half=Math.min(worldWidth/2-size,6.2+t*2.6),pitch=size*2,n=Math.max(1,Math.floor(2*half/pitch)+1);
  if(r>0)y-=h.rowSpacing*(.85+.4*t);
  for(let i=0;i<n;i++){const u=n>1?i/(n-1)*2-1:0;out.push({x:u*half,y:y+h.rowCurve*u*u*(.6+.6*t),z:HALL_NEAR_Z-(rows-1-r)*.12,size,tilt:-u*.18,row:r})}
 }
 return out;
}
/** Stage floor as a trapezoid: top edge at floorY, flaring toward the viewer. */
export function hallFloor(floorY:number,worldWidth:number){const top=floorWorldY(floorY);return{top,bottom:-5.3,topHalf:Math.min(worldWidth/2,7.4),bottomHalf:worldWidth/2+1.2}}
/** Points along a faint ceiling arc. scale 1 is the inner arc. */
export function ceilingArc(radius:number,scale=1,count=48):[number,number][]{
 const rx=radius*1.9*scale,ry=radius*.75*scale,a0=Math.PI*.12,a1=Math.PI*.88;
 return Array.from({length:count+1},(_,i)=>{const a=a0+(a1-a0)*i/count;return[Math.cos(a)*rx,-1+Math.sin(a)*ry]});
}
