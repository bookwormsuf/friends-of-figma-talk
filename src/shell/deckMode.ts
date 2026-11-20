import type {SlideData} from '../data/types';
export type DeckMode='full'|'checkpoint';
export function deckMode(search:string):DeckMode{
 const params=new URLSearchParams(search);
 return params.get('view')==='checkpoint'||params.get('deck')==='checkpoint'?'checkpoint':'full';
}
export function selectDeck(mode:DeckMode,full:SlideData[],checkpoint:SlideData[]):SlideData[]{return mode==='checkpoint'?checkpoint:full;}
