export interface SlideText { id: string; text: string; x?: number; y?: number }
export interface SourceAsset {
  id: string; name: string; type: string; hash?: string;
  x?: number; y?: number; width?: number; height?: number;
  absoluteTransform?: number[][]; slideRelativeTransform?: number[][]; scaleMode?: string; imageTransform?: number[][];
  clipAncestors?: { id: string; type: string; x: number; y: number; width: number; height: number }[];
  rotation?: number; filters?: Record<string, number>;
}
export interface PresentationCrop { x:number; y:number; width:number; height:number; sourceWidth:number; sourceHeight:number }
export interface SlideAsset extends SourceAsset {
  presentationCrop?: PresentationCrop;
  src: string; alt: string; status: 'ready' | 'pending';
  exportNodeId?: string; exportKind?: string; exportedWidth?: number; exportedHeight?: number;
}
export interface SlideData {
  id: string; order: number; name: string; skipped: boolean;
  notes: string; text: SlideText[]; assets: SlideAsset[];
  row?: string; width?: number; height?: number;
}
