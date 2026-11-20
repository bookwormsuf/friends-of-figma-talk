import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeDeck, diffSnapshots, validateSnapshot, checkpointIds} from '../scripts/source-lib.mjs';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const source=()=>read('source/current.json');
const bindings=()=>read('source/asset-bindings.json');
const contracts=()=>read('source/content-contracts.json');
const layoutIds=()=>Object.keys(read('source/layout-map.json'));
test('all38 source slides retained; four checkpoint slides follow source order',()=>{const deck=normalizeDeck(source(),bindings());assert.equal(deck.length,38);assert.equal(deck.filter(s=>!s.skipped).length,32);assert.deepEqual(deck.filter(s=>checkpointIds.includes(s.id)&&!s.skipped).map(s=>s.order),[1,7,13,26]);});
test('notes and text are verbatim, with approved2015 correction',()=>{const s=source(),deck=normalizeDeck(s,bindings());for(let i=0;i<deck.length;i++){assert.equal(deck[i].notes,s.slides[i].notes);assert.deepEqual(deck[i].text,s.slides[i].text);}assert.equal(deck.find(s=>s.id==='3:47').text.find(t=>t.id==='4:157').text,'2015');});
test('new,removed,reordered and changed slides are explicit',()=>{const a=source(),b=structuredClone(a);b.slides.reverse();b.slides.pop();b.slides.push({...b.slides[0],id:'new:1'});b.slides[0].notes+='changed';const d=diffSnapshots(a,b);assert.deepEqual(d.added,['new:1']);assert.deepEqual(d.removed,['3:2']);assert.ok(d.reordered);assert.ok(d.changed.some(s=>s.fields.includes('notes')));});
test('missing checkpoint asset blocks import; valid source passes',()=>{const s=source(),a=bindings();assert.deepEqual(validateSnapshot(s,a,{assetExists:()=>true,layoutIds:layoutIds(),contentContracts:contracts()}),[]);assert.ok(validateSnapshot(s,a,{assetExists:()=>false,layoutIds:layoutIds(),contentContracts:contracts()}).some(e=>e.includes('Missing asset')));});
test('duplicate IDs, stale2016, new unassigned slide and missing notes fail',()=>{const a=source(),b=structuredClone(a);b.slides.push({...b.slides[0],id:'new:2'});b.slides[0].notes=null;b.slides.find(s=>s.id==='3:47').text.find(t=>t.id==='4:157').text='2016';let e=validateSnapshot(b,bindings(),{assetExists:()=>true,layoutIds:layoutIds(),contentContracts:contracts(),previous:a});assert.ok(e.some(x=>x.includes('composition')));assert.ok(e.some(x=>x.includes('2015')));assert.ok(e.some(x=>x.includes('notes')));b.slides.push(b.slides[1]);assert.ok(validateSnapshot(b,bindings(),{assetExists:()=>true,layoutIds:layoutIds(),contentContracts:contracts()}).some(x=>x.includes('Duplicate')));});
test('image crop change invalidates old asset binding',()=>{const s=source();s.slides.find(s=>s.id==='3:11').assets[0].x-=100;assert.ok(validateSnapshot(s,bindings(),{assetExists:()=>true,layoutIds:layoutIds(),contentContracts:contracts()}).some(e=>e.includes('Re-export')));});

test('composed slide text identity changes require explicit reviewed binding update',()=>{
 const original=source();
 const contentContracts=contracts();
 for(const change of ['replace','add','remove']){
  const proposed=structuredClone(original),slide=proposed.slides.find(s=>s.id==='3:2');
  if(change==='replace')slide.text[0].id='new:title';
  if(change==='add')slide.text.push({id:'new:extra',text:'Extra'});
  if(change==='remove')slide.text.shift();
  const errors=validateSnapshot(proposed,bindings(),{layoutIds:layoutIds(),contentContracts,previous:original});
  assert.ok(errors.some(e=>e.includes('Content binding review required')&&e.includes('3:2')),`${change} must block promotion`);
 }
 const wording=structuredClone(original);wording.slides[0].text[0].text='A reviewed wording change';
 assert.deepEqual(validateSnapshot(wording,bindings(),{layoutIds:layoutIds(),contentContracts,previous:original}),[]);
 const revised=structuredClone(original);revised.slides[0].text[0].id='new:title';
 const reviewed=structuredClone(contentContracts);reviewed['3:2'].textNodeIds[0]='new:title';
 assert.deepEqual(validateSnapshot(revised,bindings(),{layoutIds:layoutIds(),contentContracts:reviewed,previous:original}),[]);
});

test('import --apply --reviewed cannot promote replaced content IDs or alter last valid files',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process'),{fileURLToPath}=await import('node:url');
 const dir=mkdtempSync(join(tmpdir(),'figma-source-contract-'));
 const sourcePath=new URL('source/current.json',root),deckPath=new URL('src/data/deck.json',root);
 const sourceBefore=fs.readFileSync(sourcePath,'utf8'),deckBefore=fs.readFileSync(deckPath,'utf8');
 try{
  const proposed=source();proposed.slides.find(s=>s.id==='3:2').text[0].id='new:title';
  const proposedPath=join(dir,'proposed.json');fs.writeFileSync(proposedPath,JSON.stringify(proposed));
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('scripts/import-source.mjs',root)),proposedPath,'--apply','--reviewed'],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stdout,/Content binding review required/);
  assert.equal(fs.readFileSync(sourcePath,'utf8'),sourceBefore);assert.equal(fs.readFileSync(deckPath,'utf8'),deckBefore);
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('full presentation has every unskipped slide, ready images, and reviewed content contracts',()=>{
 const s=source(),deck=normalizeDeck(s,bindings()),main=deck.filter(s=>!s.skipped);
 assert.equal(main.length,32);assert.deepEqual(main.map(s=>s.order),Array.from({length:32},(_,i)=>i+1));
 assert.equal(main.flatMap(s=>s.assets).length,29);
 for(const slide of main){assert.ok(layoutIds().includes(slide.id));assert.deepEqual(contracts()[slide.id].textNodeIds,slide.text.map(t=>t.id));for(const a of slide.assets){assert.equal(a.status,'ready');assert.ok(a.src.startsWith('/assets/'));assert.ok(a.exportedWidth>0&&a.exportedHeight>0);assert.ok(fs.existsSync(new URL('public'+a.src,root)));}}
 const missing=bindings();delete missing['32:8'];assert.ok(validateSnapshot(s,missing,{layoutIds:layoutIds(),contentContracts:contracts()}).some(e=>e.includes('Missing asset: 32:8')));
});
test('parent viewport crops are represented in exports and invalidate on changes',()=>{
 const b=bindings();assert.equal(b['32:90'].exportNodeId,'32:89');assert.equal(b['32:97'].exportNodeId,'32:96');assert.equal(b['32:90'].exportedHeight,420);
 const s=source();s.slides.find(s=>s.id==='4:92').assets.find(a=>a.id==='32:90').clipAncestors[0].width-=20;
 assert.ok(validateSnapshot(s,b,{layoutIds:layoutIds(),contentContracts:contracts()}).some(e=>e.includes('Re-export')));
});


test('presentation crop removes only approved slide17 sidebars and preserves original source',()=>{
 const b=bindings(),original=source().slides.find(s=>s.id==='4:40').assets[0];
 assert.deepEqual(b['28:114'].sourceAsset,original);
 assert.deepEqual(b['28:114'].presentationCrop,{x:249,y:0,width:1421,height:1080,sourceWidth:1920,sourceHeight:1080});
 const deck=normalizeDeck(source(),b);assert.deepEqual(deck.find(s=>s.id==='4:40').assets[0].presentationCrop,b['28:114'].presentationCrop);
 assert.equal(b['28:114'].src,'/assets/slide-17-28-114.png');
 b['28:114'].presentationCrop.width=1920;
 assert.ok(validateSnapshot(source(),b,{layoutIds:layoutIds(),contentContracts:contracts()}).some(e=>e.includes('Invalid presentation crop')));
});

test('approved padding trims preserve source files and are bounded for every asset',()=>{
 const b=bindings(),s=source(),deck=normalizeDeck(s,b);
 assert.deepEqual(Object.keys(b).filter(id=>b[id].presentationCrop).sort(),['28:114','32:95','4:68'].sort());
 for(const slide of deck)for(const asset of slide.assets){if(!asset.presentationCrop)continue;
  assert.equal(asset.src,b[asset.id].src);assert.deepEqual(b[asset.id].sourceAsset,s.slides.find(x=>x.id===slide.id).assets.find(x=>x.id===asset.id));
  const c=asset.presentationCrop;assert.ok(c.x+c.width<=asset.exportedWidth);assert.ok(c.y+c.height<=asset.exportedHeight);
 }
});
