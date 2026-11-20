import type {SlideData,PresentationCrop} from '../data/types';
export type SlideProps={slide:SlideData;active:boolean;paused:boolean;step?:number;pinned?:SlideData[];onImageOpen?:(src:string,alt:string,crop?:PresentationCrop)=>void};
export const sourceText=(slide:SlideData,id:string)=>{const node=slide.text.find(t=>t.id===id);if(!node)throw new Error(`Slide ${slide.id} is missing source text ${id}. Review the Figma import and update this slide composition before publishing.`);return node.text};
