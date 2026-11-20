import {Stage,type StageMetrics} from '../visuals/Stage';
import {ChromeObject,SilverSlab,DisplayHit,type Placement} from '../visuals/ChromePrimitives';
import {svgShape} from '../visuals/geometry';
import type {SlideAsset} from '../data/types';
import type {SlideProps} from './types';
import {slideLayouts,type ContentLayout} from './layouts';
import type {CSSProperties} from 'react';
import {palette} from '../theme/palette';
function aspect(asset:SlideAsset){if(asset.presentationCrop)return asset.presentationCrop.width/asset.presentationCrop.height;const a=asset as SlideAsset&{exportedWidth?:number;exportedHeight?:number};return a.exportedWidth&&a.exportedHeight?a.exportedWidth/a.exportedHeight:asset.width&&asset.height?asset.width/asset.height:16/9}
function placement(asset:SlideAsset,index:number,props:SlideProps,m:StageMetrics,layout:ContentLayout):Placement{
 if(layout.kind==='collage'){
  const spot=layout.scatter?.[asset.id];if(spot)return{x:spot.x,y:spot.y,width:layout.scatterWidth||10,rotation:spot.rotation};
  // Preserve the Figma collage's uneven three-row relationship instead of imposing a new grid.
  const sourceWidth=props.slide.width||1920,sourceHeight=props.slide.height||1080;
  const frameWidth=Math.min(layout.maxWidth||82,(layout.maxHeight||77)*m.height/m.width*(sourceWidth/sourceHeight));
  const frameHeight=frameWidth*m.width/m.height/(sourceWidth/sourceHeight);
  const x=asset.slideRelativeTransform?.[0]?.[2]??asset.x??0,y=asset.slideRelativeTransform?.[1]?.[2]??asset.y??0;
  return{x:50-frameWidth/2+((x+(asset.width||194)/2)/sourceWidth)*frameWidth,y:50-frameHeight/2+((y+(asset.height||194)/2)/sourceHeight)*frameHeight,width:((asset.width||194)/sourceWidth)*frameWidth};
 }
 const maxHeight=m.narrow?76:layout.maxHeight||77,width=Math.min(m.narrow?88:layout.maxWidth||82,maxHeight*m.height/m.width*aspect(asset));return{x:50,y:layout.imageY||50,width};
}
/** Index of the reveal group an asset belongs to; assets outside every group are always shown. */
const revealGroup=(layout:ContentLayout,id:string)=>layout.reveal?Math.max(0,layout.reveal.findIndex(g=>g.includes(id))):0;
const shown=(layout:ContentLayout,id:string,step:number)=>revealGroup(layout,id)<=step;
function SourceText({props}:{props:SlideProps}){return <>{props.slide.text.map(t=><span key={t.id} data-source-node={t.id}>{t.text}</span>)}</>}
export function ContentSlide(props:SlideProps){const layout=slideLayouts[props.slide.id];if(!layout)throw new Error(`No composition registered for source slide ${props.slide.id}`);const statement=layout.kind==='statement';const shapeAt=(m:StageMetrics)=>m.narrow?layout.mobileShapeAt||layout.shapeAt:layout.shapeAt;
 return <Stage {...props} className={`content-stage content-${layout.kind} content-source-${props.slide.name}`} scene={m=><>{statement&&layout.shape&&shapeAt(m)&&<ChromeObject kind={layout.shape} at={shapeAt(m)!} metrics={m}/>} {!statement&&props.slide.assets.map((asset,index)=>{if(!asset.src||asset.status!=='ready')throw new Error(`Missing ready image ${asset.id} for slide ${props.slide.id}`);return <SilverSlab key={asset.id} src={asset.src} crop={asset.presentationCrop} at={placement(asset,index,props,m,layout)} metrics={m} aspect={aspect(asset)} visible={shown(layout,asset.id,props.step??0)}/>})}</>}>{m=>{
 const at=shapeAt(m),font=Math.min(m.narrow?48:118,m.width*(m.narrow?.095:.075))*(layout.fontScale||1);
 return <>{statement?<>{layout.shape&&at&&<div className="content-shape-fallback" style={{left:`${at.x}%`,top:`${at.y}%`,width:`${at.width}%`,height:`${at.height}%`}} aria-hidden="true"><svg viewBox="-3 -3 106 106" preserveAspectRatio="none"><defs><linearGradient id={`fallback-${props.slide.id.replace(':','-')}`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor={palette.content.fallbackStart}/><stop offset=".3" stopColor={palette.content.fallbackDark}/><stop offset=".5" stopColor={palette.content.fallbackGleam}/><stop offset="1" stopColor={palette.content.fallbackEnd}/></linearGradient></defs><path d={svgShape(layout.shape)} fill={`url(#fallback-${props.slide.id.replace(':','-')})`} stroke={palette.content.fallbackOutline} strokeWidth="1.3"/></svg></div>}<h2 className={`statement-copy raised-type ${layout.align==='left'?'statement-left':''}`} style={{fontSize:font,width:`${m.narrow?layout.shape?78:86:layout.textWidth||80}%`,'--text-width':layout.textWidth} as CSSProperties}><SourceText props={props}/></h2></>:<>{props.slide.assets.map((asset,index)=><DisplayHit key={asset.id} assetId={asset.id} src={asset.src} crop={asset.presentationCrop} alt={asset.alt} at={placement(asset,index,props,m,layout)} aspect={aspect(asset)} onOpen={props.onImageOpen} style={shown(layout,asset.id,props.step??0)?undefined:{visibility:'hidden',opacity:0}}/>)}{props.slide.text.length>0&&<div className={layout.caption?layout.captionStyle==='year'?'image-caption year-caption raised-type':'image-caption':'image-heading'}><SourceText props={props}/></div>}</>}</>;
 }}</Stage>
}
