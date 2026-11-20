import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeDeck,diffSnapshots,validateSnapshot} from './source-lib.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'));
if(!input)throw Error('Usage: node scripts/import-source.mjs proposed.json [--apply --reviewed]');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const proposed=read(path.resolve(input)),current=read(path.join(root,'source/current.json')),bindings=read(path.join(root,'source/asset-bindings.json')),layoutIds=Object.keys(read(path.join(root,'source/layout-map.json')));
const contentContracts=read(path.join(root,'source/content-contracts.json'));
const report={diff:diffSnapshots(current,proposed),errors:validateSnapshot(proposed,bindings,{assetExists:src=>src.startsWith('/assets/')&&fs.existsSync(path.join(root,'public',src)),layoutIds,contentContracts,previous:current})};
console.log(JSON.stringify(report,null,2));
if(report.errors.length)process.exitCode=1;
else if(args.includes('--apply')){
 if(!args.includes('--reviewed'))throw Error('Review the diff first; --reviewed is required to promote. Current source is unchanged.');
 const write=(p,data)=>fs.writeFileSync(path.join(root,p),JSON.stringify(data,null,2)+'\n');
 const stamp=new Date().toISOString().replaceAll(':','-');write(`source/snapshots/${stamp}-before.json`,current);write(`source/snapshots/${stamp}-approved.json`,proposed);
 // Stage both complete files before promotion. Composition files and layout-map are never rewritten.
 write('source/current.json.next',proposed);write('src/data/deck.json.next',normalizeDeck(proposed,bindings));
 fs.renameSync(path.join(root,'source/current.json.next'),path.join(root,'source/current.json'));fs.renameSync(path.join(root,'src/data/deck.json.next'),path.join(root,'src/data/deck.json'));
 console.log('Promoted reviewed snapshot. Local compositions were untouched.');
}else console.log('Preview only. No files changed. Review the report before --apply --reviewed.');
