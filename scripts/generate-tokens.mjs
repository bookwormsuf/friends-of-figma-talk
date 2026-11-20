// Writes src/theme/tokens.css from src/theme/palette.ts. Run with: npm run tokens
import {writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {palette} from '../src/theme/palette.ts';

const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();

/** The CSS custom property for a token: group "glow", name "cloudBlue" becomes --glow-cloud-blue. */
export const cssVarName = (group, name) => `--${kebab(group)}-${kebab(name)}`;

export function renderTokensCss(source = palette) {
  const seen = new Map();
  const lines = [];
  for (const [group, tokens] of Object.entries(source)) {
    for (const [name, value] of Object.entries(tokens)) {
      const variable = cssVarName(group, name);
      if (seen.has(variable)) throw new Error(`${group}.${name} and ${seen.get(variable)} both make ${variable}`);
      seen.set(variable, `${group}.${name}`);
      lines.push(`  ${variable}: ${value};`);
    }
  }
  return `/* Generated from src/theme/palette.ts by scripts/generate-tokens.mjs. Do not edit by hand. Run npm run tokens. */\n:root {\n${lines.join('\n')}\n}\n`;
}

export const tokensCssPath = fileURLToPath(new URL('../src/theme/tokens.css', import.meta.url));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(tokensCssPath, renderTokensCss());
  console.log('wrote', tokensCssPath);
}
