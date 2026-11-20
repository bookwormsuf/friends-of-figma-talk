/** Small helpers for colours that come from the palette. The palette stores colours as '#rrggbb' strings. */

/** A palette colour as the 0xRRGGBB number some Three.js code asks for. */
export const hexNumber = (hex: string): number => parseInt(hex.slice(1), 16);

/** A '#rrggbb' palette colour with an alpha, as a CSS rgba() string. Needs a 6-digit hex. */
export const rgba = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${alpha})`;
};
