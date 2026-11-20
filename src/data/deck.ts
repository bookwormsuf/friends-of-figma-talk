import deck from './deck.json';
import type { SlideData } from './types';
export const allSlides = deck as SlideData[];
export const checkpointIds = ['3:2', '3:47', '28:111', '4:118'];
export const checkpointSlides = allSlides.filter(slide => !slide.skipped && checkpointIds.includes(slide.id));

export const presentationSlides = allSlides.filter(slide => !slide.skipped);
