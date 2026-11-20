export const checkpointIds = ['3:2','3:47','28:111','4:118'];
const cropSignature=a=>{const {absoluteTransform,...local}=a;return local};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function normalizeDeck(source,bindings){
 return source.slides.map((s,index)=>({id:s.id,order:index+1,name:s.name,skipped:s.skipped,notes:s.notes,text:s.text,row:s.row,width:s.width,height:s.height,assets:s.assets.map(a=>({...a,src:bindings[a.id]?.src??'',alt:bindings[a.id]?.alt??a.name,status:bindings[a.id]?'ready':'pending',...(bindings[a.id]?{exportNodeId:bindings[a.id].exportNodeId,exportKind:bindings[a.id].exportKind,exportedWidth:bindings[a.id].exportedWidth,exportedHeight:bindings[a.id].exportedHeight,...(bindings[a.id].presentationCrop?{presentationCrop:bindings[a.id].presentationCrop}:{})}:{})}))}));
}
export function diffSnapshots(before,after){
 const a=new Map(before.slides.map(s=>[s.id,s])),b=new Map(after.slides.map(s=>[s.id,s]));
 return {added:[...b.keys()].filter(id=>!a.has(id)),removed:[...a.keys()].filter(id=>!b.has(id)),reordered:!equal(before.slides.map(s=>s.id).filter(id=>b.has(id)),after.slides.map(s=>s.id).filter(id=>a.has(id))),changed:after.slides.filter(s=>a.has(s.id)).map(s=>({id:s.id,fields:['name','skipped','notes','text','assets','interactive'].filter(k=>!equal(a.get(s.id)[k],s[k]))})).filter(s=>s.fields.length)};
}
export function validateSnapshot(source,bindings,{assetExists=()=>true,layoutIds=[],contentContracts={},previous}={}){
 const errors=[];if(source.schemaVersion!==1)errors.push('Unknown schemaVersion');if(source.fileKey!=='8CqcgYkpohVGMg2b9ag5FW')errors.push('Wrong Figma file');if(!Array.isArray(source.slides))return [...errors,'Missing slides array'];
 const ids=new Set();for(const s of source.slides){
  if(typeof s.id!=='string'||ids.has(s.id))errors.push(`Duplicate or invalid slide ID: ${s.id}`);ids.add(s.id);
  if(typeof s.notes!=='string')errors.push(`Invalid notes: ${s.id}`);
  if(typeof s.skipped!=='boolean')errors.push(`Invalid skipped flag: ${s.id}`);
  if(!Array.isArray(s.text)||s.text.some(t=>typeof t.id!=='string'||typeof t.text!=='string'))errors.push(`Invalid text: ${s.id}`);
  if(!s.skipped&&!layoutIds.includes(s.id))errors.push(`Main slide needs composition assignment: ${s.id}`);
  if(layoutIds.includes(s.id)){
   const contract=contentContracts[s.id];
   if(!contract||!Array.isArray(contract.textNodeIds))errors.push(`Missing reviewed content contract for composition: ${s.id}`);
   else if(Array.isArray(s.text)){
    const actual=s.text.map(t=>t.id),expected=contract.textNodeIds;
    const added=actual.filter(id=>!expected.includes(id)),removed=expected.filter(id=>!actual.includes(id));
    if(new Set(actual).size!==actual.length)errors.push(`Duplicate text node ID on composed slide: ${s.id}`);
    if(added.length||removed.length)errors.push(`Content binding review required for ${s.id}: added [${added.join(', ')}], removed [${removed.join(', ')}]. Update the composition and source/content-contracts.json after review; --reviewed alone cannot bypass this.`);
   }
  }
  if(!Array.isArray(s.assets)){errors.push(`Invalid assets: ${s.id}`);continue;}
  if(s.interactive?.length)errors.push(`Unsupported interactive content: ${s.id}`);
  for(const a of s.assets){if(a.type!=='IMAGE')errors.push(`Unsupported asset ${a.type}: ${a.id}`);const binding=bindings[a.id];if(binding?.presentationCrop){const c=binding.presentationCrop;if(![c.x,c.y,c.width,c.height,c.sourceWidth,c.sourceHeight].every(Number.isFinite)||c.x<0||c.y<0||c.width<=0||c.height<=0||c.x+c.width>c.sourceWidth||c.y+c.height>c.sourceHeight||c.sourceWidth!==binding.exportedWidth||c.sourceHeight!==binding.exportedHeight)errors.push(`Invalid presentation crop: ${a.id}`);}if(binding&&!equal(cropSignature(binding.sourceAsset),cropSignature(a)))errors.push(`Re-export changed image crop or content: ${a.id}`);if(!s.skipped){if(!binding?.src||!assetExists(binding.src))errors.push(`Missing asset: ${a.id} on slide ${s.id}`);}}
 }
 const timeline=source.slides.find(s=>s.id==='3:47');if(timeline?.text?.find(t=>t.id==='4:157')?.text!=='2015')errors.push('Approved 2015 timeline correction is missing');
 for(const id of checkpointIds)if(!ids.has(id))errors.push(`Missing checkpoint slide: ${id}`);
 if(previous){const diff=diffSnapshots(previous,source);for(const id of diff.added)if(!layoutIds.includes(id))errors.push(`New slide needs composition assignment: ${id}`);}
 return errors;
}
