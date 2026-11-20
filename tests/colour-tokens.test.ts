import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {palette} from '../src/theme/palette.ts';
import {renderTokensCss, tokensCssPath} from '../scripts/generate-tokens.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');

/** Files that may hold raw colours. Everything else in src must use a palette token.
 * Left out on purpose: src/data/deck.json (not CSS or code), public/favicon.svg and index.html (outside src). */
const ALLOWED = new Set(['src/theme/palette.ts', 'src/theme/tokens.css', 'src/theme/colour.ts']);

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (/\.(css|ts|tsx)$/.test(entry.name)) found.push(path);
  }
  return found.sort();
}

// Hex of length 3, 4, 6 or 8, 0xRRGGBB numbers, rgb()/rgba()/hsl()/hsla() written with numbers (or a template), and the keywords white and black.
// A call like rgba(palette.x.y, a) is the helper in src/theme/colour.ts and is fine.
const COLOUR = /0x[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?)\(\s*(?:[\d.]|\$\{)|(?<![\w.#-])(?:white|black)(?![\w-])/gi;

export function findRawColours(file: string, text: string): {line: number; text: string}[] {
  const css = file.endsWith('.css');
  const found: {line: number; text: string}[] = [];
  for (const match of text.matchAll(COLOUR)) {
    const hit = match[0], at = match.index ?? 0, before = text.slice(Math.max(0, at - 80), at);
    if (hit[0] === '#') {
      if (![3, 4, 6, 8].includes(hit.length - 1)) continue;
      // An id or URL fragment, not a colour: url(#id), a CSS id selector, a hash in a link.
      if (/url\([^)]*$/.test(before)) continue;
      if (css && !/:[^;{}]*$/.test(text.slice(Math.max(0, at - 200), at))) continue;
      if (!css && /\b(href|navigate|location\.hash|querySelector\w*|getElementById)\b[^;]{0,20}$/.test(before) && !/color|fill|stroke/i.test(before.slice(-30))) continue;
    }
    if (/^(white|black)$/i.test(hit)) {
      // The words also turn up in comments and copy. Count them only where a value goes.
      const value = css ? /:[^;{}]*$/.test(text.slice(Math.max(0, at - 200), at)) : /(color|fill|stroke|background|Color|=|:)\s*[{`'"]?\s*[`'"]?$|['"`]$/.test(text.slice(Math.max(0, at - 40), at));
      if (!value) continue;
    }
    found.push({line: text.slice(0, at).split('\n').length, text: hit});
  }
  return found;
}

test('no raw colours in src outside the palette', () => {
  const offences: string[] = [];
  for (const file of sourceFiles(src)) {
    const name = relative(root, file);
    if (ALLOWED.has(name)) continue;
    for (const hit of findRawColours(name, readFileSync(file, 'utf8'))) offences.push(`${name}:${hit.line} ${hit.text}`);
  }
  assert.deepEqual(offences, [], `Raw colours found. Add the colour to src/theme/palette.ts and use the token:\n${offences.join('\n')}`);
});

test('tokens.css matches the palette', () => {
  const onDisk = readFileSync(tokensCssPath, 'utf8');
  assert.equal(onDisk, renderTokensCss(palette), 'src/theme/tokens.css is out of date. Run: npm run tokens');
});

test('every colour variable used in CSS exists', () => {
  const tokens = readFileSync(tokensCssPath, 'utf8');
  const all = sourceFiles(src).filter(f => !f.endsWith('tokens.css')).map(f => readFileSync(f, 'utf8')).join('\n');
  const missing = new Set<string>();
  for (const match of all.matchAll(/var\((--[\w-]+)/g)) {
    const name = match[1];
    if (!tokens.includes(`${name}:`) && !new RegExp(`${name}\\s*[:']|['"]${name}['"]`).test(all)) missing.add(name);
  }
  assert.deepEqual([...missing], [], 'CSS uses variables that are defined nowhere');
});

test('palette values are real colours', () => {
  for (const [group, tokens] of Object.entries(palette)) {
    for (const [name, value] of Object.entries(tokens)) {
      assert.match(value, /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s]+\))$/i, `${group}.${name} is not a colour: ${value}`);
    }
  }
});
