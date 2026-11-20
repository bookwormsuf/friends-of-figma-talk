import {test} from 'node:test';import assert from 'node:assert/strict';import {atEdge,navigationTarget,slideHash,isNavigationKey,stepNavigation,buildSections,logicalSlide,locateSlide,advancePosition,overviewCards,pressProgress} from '../src/shell/navigation.ts';import {hallSeats,HALL_NEAR_Z} from '../src/slides/lectureHall.ts';import{validMessage}from'../src/shell/channel.ts';
const s=[{top:0,height:900},{top:900,height:1800},{top:2700,height:900}];
test('long slides scroll internally before advancing',()=>{assert.deepEqual(navigationTarget(s,1,null,1,900,900),{index:1,top:1602});assert.deepEqual(navigationTarget(s,1,null,1,1800,900),{index:2,top:2700})});
test('rapid opposite input is based on pending target',()=>{assert.deepEqual(navigationTarget(s,0,2,-1,200,900),{index:1,top:1800})});
test('stable links survive reorder; keys are restricted',()=>{assert.equal(slideHash('3:47'),'#slide-3-47');assert.equal(isNavigationKey('Enter'),0);assert.equal(isNavigationKey('ArrowRight'),1)});
test('presenter protocol rejects malformed navigation and state',()=>{assert.equal(validMessage({type:'hello'}),true);assert.equal(validMessage({type:'state',slideId:'3:2',paused:false}),true);assert.equal(validMessage({type:'navigate',direction:99}),false);assert.equal(validMessage({type:'state',slideId:'3:2'}),false)});

test('presenter protocol supports clean audience disconnect',()=>{assert.equal(validMessage({type:'closed'}),true)});

test('in-slide steps are consumed before the slide changes',()=>{
 assert.deepEqual(stepNavigation(0,3,1),{step:1,move:false});assert.deepEqual(stepNavigation(2,3,1),{step:3,move:false});assert.deepEqual(stepNavigation(3,3,1),{step:3,move:true});
 assert.deepEqual(stepNavigation(3,3,-1),{step:2,move:false});assert.deepEqual(stepNavigation(1,3,-1),{step:0,move:false});assert.deepEqual(stepNavigation(0,3,-1),{step:0,move:true});
 assert.deepEqual(stepNavigation(0,0,1),{step:0,move:true});assert.deepEqual(stepNavigation(0,0,-1),{step:0,move:true});
});
test('presenter state message accepts a missing or finite step only',()=>{
 assert.equal(validMessage({type:'state',slideId:'3:19',paused:false,step:2}),true);assert.equal(validMessage({type:'state',slideId:'3:19',paused:false}),true);
 assert.equal(validMessage({type:'state',slideId:'3:19',paused:false,step:NaN}),false);assert.equal(validMessage({type:'state',slideId:'3:19',paused:false,step:'1'}),false);
});

const deck=['a','b','c','d','e','f'].map(id=>({id,assets:id==='c'?[1,2,3]:[]}));
const layouts={b:{kind:'pinned',anchor:'a'},c:{kind:'gallery'},e:{kind:'pinned',anchor:'d'},f:{kind:'pinned',anchor:'d'}};
test('reveal groups give a collage one step per group after the first',()=>{
 const sections=buildSections([{id:'a',assets:[1,2,3]}],{a:{kind:'collage',reveal:[[1],[2],[3]]}});
 assert.equal(sections[0].steps,2);assert.equal(logicalSlide(sections,0,2),0);
});
test('pinned slides share their anchor section; gallery steps count assets',()=>{
 const sections=buildSections(deck,layouts);
 assert.deepEqual(sections,[{anchorIndex:0,slideIndices:[0,1],steps:1},{anchorIndex:2,slideIndices:[2],steps:3},{anchorIndex:3,slideIndices:[3,4,5],steps:2}]);
 assert.throws(()=>buildSections(deck,{a:{kind:'pinned',anchor:'z'}}),/pinned/);
});
test('a hollow book slide has exactly two steps',()=>{
 const sections=buildSections([{id:'a',assets:[]}],{a:{kind:'book'}});
 assert.equal(sections[0].steps,2);assert.equal(logicalSlide(sections,0,2),0);
});
test('a drill and rocket slide has exactly two steps',()=>{
 const sections=buildSections([{id:'a',assets:[]}],{a:{kind:'drill',steps:2}});
 assert.equal(sections[0].steps,2);assert.equal(logicalSlide(sections,0,2),0);
 assert.deepEqual(advancePosition(sections,0,2,1),null);assert.deepEqual(advancePosition(sections,0,1,-1),{section:0,step:0});
});
test('logicalSlide maps steps to pinned slides and keeps gallery steps on the anchor',()=>{
 const sections=buildSections(deck,layouts);
 assert.equal(logicalSlide(sections,0,0),0);assert.equal(logicalSlide(sections,0,1),1);assert.equal(logicalSlide(sections,0,9),1);
 assert.equal(logicalSlide(sections,1,2),2);assert.equal(logicalSlide(sections,2,2),5);
 assert.deepEqual(locateSlide(sections,1),{section:0,step:1});assert.deepEqual(locateSlide(sections,5),{section:2,step:2});assert.deepEqual(locateSlide(sections,2),{section:1,step:0});
});
test('pinned step mapping: forward consumes steps, back lands on the last step',()=>{
 const sections=buildSections(deck,layouts);
 assert.deepEqual(advancePosition(sections,0,0,1),{section:0,step:1});
 assert.deepEqual(advancePosition(sections,0,1,1),{section:1,step:0});
 assert.deepEqual(advancePosition(sections,0,1,-1),{section:0,step:0});
 assert.deepEqual(advancePosition(sections,1,0,-1),{section:0,step:1});
 assert.deepEqual(advancePosition(sections,2,0,-1),{section:1,step:3});
 assert.equal(advancePosition(sections,0,0,-1),null);assert.equal(advancePosition(sections,2,2,1),null);
});
test('lecture hall seats stay behind the slab and inside the stage',()=>{
 const seats=hallSeats({rows:5,rowSpacing:.45,rowCurve:.35,seatSize:.4,floorY:72,ceilingRadius:6.5},10*1280/720);
 assert.ok(seats.length>20);assert.equal(new Set(seats.map(s=>s.row)).size,5);
 for(const s of seats){assert.ok(s.z<=HALL_NEAR_Z);assert.ok(Math.abs(s.x)<=10*1280/720/2)}
});
test('a morph anchor with two pinned slides has two steps, each landing on a follower',()=>{
 const slides=['x','m','p1','p2','y'].map(id=>({id,assets:[1]}));
 const sections=buildSections(slides,{m:{kind:'morph'},p1:{kind:'pinned',anchor:'m'},p2:{kind:'pinned',anchor:'m'}});
 assert.deepEqual(sections,[{anchorIndex:0,slideIndices:[0],steps:0},{anchorIndex:1,slideIndices:[1,2,3],steps:2},{anchorIndex:4,slideIndices:[4],steps:0}]);
 assert.deepEqual([0,1,2].map(k=>logicalSlide(sections,1,k)),[1,2,3]);
 assert.deepEqual(locateSlide(sections,3),{section:1,step:2});assert.deepEqual(locateSlide(sections,4),{section:2,step:0});
 assert.deepEqual(advancePosition(sections,0,0,1),{section:1,step:0});
 assert.deepEqual(advancePosition(sections,1,0,1),{section:1,step:1});
 assert.deepEqual(advancePosition(sections,1,1,1),{section:1,step:2});
 assert.deepEqual(advancePosition(sections,1,2,1),{section:2,step:0});
 assert.deepEqual(advancePosition(sections,2,0,-1),{section:1,step:2});
 assert.deepEqual(advancePosition(sections,1,0,-1),{section:0,step:0});
});
test('an explicit step count gives a composition its in-slide steps, in the checkpoint deck too',()=>{
 const layout={a:{kind:'screenshots',steps:1}};
 assert.equal(buildSections([{id:'a',assets:[1,2]}],layout)[0].steps,1);
 assert.equal(buildSections([{id:'b',assets:[]},{id:'a',assets:[1,2]}],layout)[1].steps,1);
});
test('the deck registers the new gallery, screenshot and morph steps',async()=>{
 const {slideLayouts}=await import('../src/slides/layouts.ts');const {readFileSync}=await import('node:fs');
 const deck=JSON.parse(readFileSync(new URL('../src/data/deck.json',import.meta.url),'utf8')).filter((x:{skipped:boolean})=>!x.skipped);
 const sections=buildSections(deck,slideLayouts);const by=(id:string)=>sections.find(sec=>deck[sec.anchorIndex].id===id)!;
 assert.equal(by('4:92').steps,3);assert.equal(by('4:121').steps,2);assert.equal(by('4:118').steps,2);assert.equal(by('4:61').steps,2);
 assert.deepEqual(by('4:61').slideIndices.map((i:number)=>deck[i].id),['4:61','4:64','4:67']);
 assert.equal(sections.length,deck.length-3);
});

test('overview cards cover every slide, with pinned slides pointing at their anchor step',()=>{
 const slides=[{id:'a',assets:[],text:[{text:' Hello\n world '}]},{id:'b',assets:[],text:[]},{id:'c',assets:[],text:[{text:'Pinned'}]}];
 const sections=buildSections(slides,{b:{kind:'content',steps:2},c:{kind:'pinned',anchor:'b'}});
 const cards=overviewCards(slides,sections);
 assert.equal(cards.length,3);assert.equal(cards[0].caption,'Hello world');assert.equal(cards[1].caption,'');
 assert.deepEqual([cards[1].steps,cards[1].pinned,cards[1].section,cards[1].step],[1,false,1,0]);
 assert.deepEqual([cards[2].steps,cards[2].pinned,cards[2].section,cards[2].step],[0,true,1,1]);
});

test('Next stays live on the last slide until its in-slide steps are used up',()=>{
 const sections=[{anchorIndex:0,slideIndices:[0],steps:0},{anchorIndex:1,slideIndices:[1],steps:1},{anchorIndex:2,slideIndices:[2],steps:2}];
 assert.equal(atEdge(sections,2,0,1),false);assert.equal(atEdge(sections,2,1,1),false);assert.equal(atEdge(sections,2,2,1),true);
 assert.equal(atEdge(sections,1,1,1),false,'not the last slide');
 assert.equal(atEdge(sections,0,0,-1),true);assert.equal(atEdge(sections,1,0,-1),false);
 // A first slide with steps: Previous works until step 0.
 const stepped=[{anchorIndex:0,slideIndices:[0],steps:2}];
 assert.equal(atEdge(stepped,0,1,-1),false);assert.equal(atEdge(stepped,0,0,-1),true);assert.equal(atEdge(stepped,0,1,1),false);
});

test('progress bar: every press of Next fills it a little, slide changes and in-slide steps alike',()=>{
 const sections=[{anchorIndex:0,slideIndices:[0],steps:0},{anchorIndex:1,slideIndices:[1],steps:2},{anchorIndex:2,slideIndices:[2],steps:0}];
 const seen=[[0,0],[1,0],[1,1],[1,2],[2,0]].map(([a,b])=>pressProgress(sections,a,b));
 assert.deepEqual(seen,[.2,.4,.6,.8,1]);
 assert.equal(pressProgress(sections,1,9),.8,'a step past the end is held');assert.equal(pressProgress([],0,0),0);
});

import {acceptPress,PRESS_SETTLE_MS,claimOwner,mayControl,validEnvelope} from '../src/shell/remote.ts';
test('phone remote: the first phone wins and only its presses count',()=>{
 let owner:string|null=null;owner=claimOwner(owner,'phone-a');owner=claimOwner(owner,'phone-b');
 assert.equal(owner,'phone-a','a later phone cannot take over');
 assert.ok(mayControl(owner,'phone-a'));assert.ok(!mayControl(owner,'phone-b'));assert.ok(!mayControl(owner,undefined),'a press with no sender is refused');assert.ok(!mayControl(null,'phone-a'),'nobody controls before pairing');
 assert.equal(claimOwner(null,undefined),null);
});
test('phone remote: only well-formed envelopes are accepted',()=>{
 assert.ok(validEnvelope({m:{type:'navigate',direction:1},device:'a'}));assert.ok(validEnvelope({m:{type:'state',slideId:'3:2',paused:false,step:1},owner:null}));
 for(const bad of [null,{},{m:{type:'navigate',direction:5},device:'a'},{m:{type:'hello'},device:7},{m:{type:'hello'},device:''},{m:{type:'hello'},owner:{}}])assert.ok(!validEnvelope(bad),JSON.stringify(bad));
});

test('phone remote: one tap moves one step, however late or often it arrives',()=>{
 const at={type:'state' as const,slideId:'4:140',paused:false,step:1},here={slideId:'4:140',step:1};
 assert.ok(acceptPress(here,at,0,1000),'a press made from where the deck is counts');
 assert.ok(!acceptPress({slideId:'4:140',step:0},at,0,1000),'a press made a step ago is stale');
 assert.ok(!acceptPress({slideId:'4:143',step:0},at,0,1000),'a press made a slide ago is stale');
 assert.ok(!acceptPress(undefined,at,0,1000),'a press that does not say where it was made is refused');
 assert.ok(!acceptPress(here,at,900,1000),'a second tap while the first is still being carried out is refused');
 assert.ok(acceptPress(here,at,900,900+PRESS_SETTLE_MS),'unless the first one moved nothing and its time is up');
 assert.ok(!acceptPress(here,{type:'hello'},0,1000));
 assert.ok(validEnvelope({m:{type:'navigate',direction:1},device:'a',from:here}));assert.ok(!validEnvelope({m:{type:'navigate',direction:1},device:'a',from:{slideId:'x'}}));
});
