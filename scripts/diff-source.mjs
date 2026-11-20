import fs from 'node:fs';
import {diffSnapshots} from './source-lib.mjs';
const [before='source/current.json',after]=process.argv.slice(2);
if(!after)throw Error('Usage: node scripts/diff-source.mjs source/current.json /path/to/proposed.json');
console.log(JSON.stringify(diffSnapshots(JSON.parse(fs.readFileSync(before,'utf8')),JSON.parse(fs.readFileSync(after,'utf8'))),null,2));
