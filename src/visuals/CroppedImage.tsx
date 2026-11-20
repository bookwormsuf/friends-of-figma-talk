import type {CSSProperties} from 'react';
import type {PresentationCrop} from '../data/types';
/** Preserve the original file while displaying only an explicitly approved crop. */
export function CroppedImage({src,alt,crop,className='',enlarged=false}:{src:string;alt:string;crop?:PresentationCrop;className?:string;enlarged?:boolean}){
 if(!crop)return <img className={className} src={src} alt={alt} loading={enlarged?'eager':'lazy'} decoding="async"/>;
 const style:CSSProperties={display:'block',position:'relative',overflow:'hidden',aspectRatio:crop.width/crop.height,...(enlarged?{width:`min(88vw, ${78*crop.width/crop.height}vh)`,borderRadius:12}:{})};
 return <span className={className} style={style}><img src={src} alt={alt} loading={enlarged?'eager':'lazy'} decoding="async" style={{position:'absolute',width:`${crop.sourceWidth/crop.width*100}%`,height:`${crop.sourceHeight/crop.height*100}%`,maxWidth:'none',maxHeight:'none',left:`${-crop.x/crop.width*100}%`,top:`${-crop.y/crop.height*100}%`,objectFit:'fill',border:0,borderRadius:0}}/></span>;
}
