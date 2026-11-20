import type {Placement} from '../visuals/ChromePrimitives';
/** Local composition settings keyed by stable Figma IDs. Reordering never changes these. */
export type ContentLayout={kind:'image'|'statement'|'collage'|'gallery'|'screen'|'book'|'pinned'|'morph'|'screenshots'|'drill'|'split'|'trail'|'closing';anchor?:string;steps?:number;maxWidth?:number;maxHeight?:number;imageY?:number;shape?:'cloud'|'burst'|'oval';shapeAt?:Placement;mobileShapeAt?:Placement;textWidth?:number;fontScale?:number;align?:'left'|'center';caption?:boolean;captionStyle?:'year';reveal?:string[][];scatter?:Record<string,{x:number;y:number;rotation?:number}>;scatterWidth?:number};
export const slideLayouts:Record<string,ContentLayout>={
 '3:11':{kind:'image',maxWidth:82,maxHeight:76,imageY:50}, // 02 OGP photo
 '3:19':{kind:'gallery'}, // 03 University: three images, one per in-slide step. See galleryLayout.
 '3:29':{kind:'screen'}, // 07 Only visible “Design”, on the lecture screen. See lectureLayout.
 '3:31':{kind:'pinned',anchor:'3:29'}, // 08 Three source nodes: step 1 of the lecture screen above
 '3:42':{kind:'statement',shape:'cloud',shapeAt:{x:50,y:50,width:72,height:61},mobileShapeAt:{x:50,y:49,width:88,height:38},fontScale:.9,textWidth:57},
 '3:68':{kind:'statement',fontScale:1.18,textWidth:76},
 '4:11':{kind:'statement',shape:'cloud',shapeAt:{x:50,y:50,width:77,height:63},mobileShapeAt:{x:50,y:49,width:90,height:39},fontScale:.82,textWidth:61},
 '27:46':{kind:'image',maxWidth:84,maxHeight:69,imageY:46,caption:true,captionStyle:'year'}, // photo sits a little higher and smaller to leave room for the year under it, same proportions as the results page eras
 '27:55':{kind:'collage',maxWidth:82,maxHeight:77,reveal:[['27:66'],['27:63'],['27:70','27:89','27:91'],['27:75','27:77','27:79','27:81','27:83']],
  // 11 Team constellation. Reveal groups are in-slide steps: Sufyan, then the PM, then ops, then engineers.
  // scatter replaces the Figma grid with a loose arrangement: x and y are stage percent, rotation is radians. Sufyan and the PM sit top left, ops top right, engineers in a wavy band below.
  scatterWidth:10.5,scatter:{'27:66':{x:16,y:27,rotation:-.06},'27:63':{x:37,y:33,rotation:.05},'27:70':{x:60,y:25,rotation:-.04},'27:89':{x:75,y:34,rotation:.07},'27:91':{x:88,y:24,rotation:-.05},'27:75':{x:13,y:66,rotation:.05},'27:77':{x:30,y:75,rotation:-.07},'27:79':{x:48,y:64,rotation:.04},'27:81':{x:65,y:76,rotation:-.05},'27:83':{x:83,y:65,rotation:.08}}},
 '4:19':{kind:'image',maxWidth:86,maxHeight:77,imageY:49},
 '4:40':{kind:'image',maxWidth:84,maxHeight:78,imageY:50},
 '4:49':{kind:'book'}, // 15 Hollow book. See bookLayout.
 '114:2':{kind:'trail',steps:2}, // 16 A research log, then the slide 13 diagram, then a string of nodes. See trailLayout.
 '4:51':{kind:'statement',fontScale:1.15,textWidth:80},
 '4:56':{kind:'statement',shape:'cloud',shapeAt:{x:50,y:50,width:80,height:64},mobileShapeAt:{x:50,y:49,width:91,height:40},fontScale:.77,textWidth:64},
 '4:61':{kind:'morph',caption:true}, // 19 One slab that morphs through three eras. See morphLayout.
 '4:64':{kind:'pinned',anchor:'4:61',caption:true}, // 20 Step 1 of the morph above
 '4:67':{kind:'pinned',anchor:'4:61',caption:true}, // 21 Step 2 of the morph above
 '4:70':{kind:'statement',shape:'burst',shapeAt:{x:50,y:50,width:55,height:73},mobileShapeAt:{x:50,y:49,width:88,height:45},fontScale:1.8,textWidth:64},
 '4:76':{kind:'image',maxWidth:83,maxHeight:77,imageY:50},
 '4:92':{kind:'gallery'}, // 24 Three fixes: one image per in-slide step. See galleryLayout.
 '4:114':{kind:'statement',shape:'burst',shapeAt:{x:50,y:50,width:65,height:74},mobileShapeAt:{x:50,y:49,width:90,height:43},fontScale:1.7,textWidth:70},
 '27:99':{kind:'split',steps:1}, // 26 Brand exploration: one panel splits into six. See splitLayout.
 '4:121':{kind:'gallery'}, // 28 Two shipped features, one image per step; "Some of it shipped." stays at the top. See galleryLayout.
 '4:118':{kind:'screenshots',steps:2}, // 26 Spreadsheet alone, the inbox joins it, then the inbox takes focus (Screenshots.tsx). See screenshotsLayout.
 '4:135':{kind:'statement',shape:'cloud',shapeAt:{x:50,y:50,width:80,height:63},mobileShapeAt:{x:50,y:49,width:91,height:40},fontScale:.8,textWidth:65},
 '4:140':{kind:'closing',steps:2,fontScale:1.03,textWidth:82},
 '4:127':{kind:'drill',steps:2}, // 29 Drill and rocket. See drillLayout.
 '4:143':{kind:'statement',shape:'burst',shapeAt:{x:50,y:50,width:72,height:74},mobileShapeAt:{x:50,y:49,width:91,height:45},fontScale:1.4,textWidth:76},
};
/** Gallery composition for slides with kind 'gallery'. x, y and width are stage percent, rotation is radians (Three.js, positive turns anticlockwise).
 * Step 0 shows the cluster. Step k features image k at the front; the other images take the parked slots in index order.
 * maxHeight caps the featured slab's height in stage percent and slotMaxHeight caps the others, so tall screenshots stay on screen; a slab's y is also kept inside the stage. Tune live with ?editor, then copy values here. */
export type GalleryPlacement={x:number;y:number;width:number;rotation:number;z:number};
export const galleryLayout={
 maxHeight:84,
 slotMaxHeight:52, // cap for cluster and parked slabs, so a tall screenshot does not swamp its neighbours
 // Each slot sits on its own depth. Slabs are about .4 deep and a wide one tilts up to .3rad while it settles, which swings its edges about 1 unit, so overlapping slots sit 2 apart. The camera has no perspective, so depth never changes how big a slab looks.
 cluster:[{x:32,y:44,width:36,rotation:-.07,z:2},{x:68,y:40,width:32,rotation:.06,z:4},{x:50,y:70,width:34,rotation:-.03,z:0}] as GalleryPlacement[],
 featured:{x:50,y:50,width:66,rotation:0,z:6} as GalleryPlacement,
 parked:[{x:24,y:68,width:26,rotation:-.1,z:0},{x:80,y:46,width:22,rotation:.09,z:2}] as GalleryPlacement[],
 // seconds for the whole move. lift: extra depth the incoming slab holds while it passes over the others. part: stage percent the waiting slabs step away from the centre. pinch: how small every slab gets, as a share of its cluster width, while depths swap in the cluster. dim: brightness of the images behind a featured one (1 is no dimming).
 motion:{seconds:1.2,lift:1.5,part:7,pinch:.48,dim:.7},
 // Before and after. A slab whose image id is listed in `before` comes forward showing the before picture, rests for `hold` seconds, then a divider crosses it and leaves the after picture. Each before file has the same size and framing as its after.
 wipe:{hold:.7,before:{'32:90':'/assets/slide-27-32-90-before.png','32:92':'/assets/slide-27-32-92-before.png','32:93':'/assets/slide-27-32-93-before.png'} as Record<string,string>},
 headingTop:14, // a gallery slide with a text heading fits every slab below this stage percent
};

/** Lecture screen for the layout kind 'screen' (3:29), with 3:31 pinned to it as step 1.
 * slab: the screen's opening, x and y in stage percent, width in stage percent (always 16:9). It never moves between steps.
 * text: inset is percent of the slab width, fontScale multiplies the size that fits the slab, lineGap is the line-height multiplier.
 * hall: rows of seats in world units (stage is 10 tall), floorY is stage percent, reveal and drift are the step 1 fade and rise. Tune live with ?editor. */
export const lectureLayout={
 slab:{x:50,y:46,width:60},
 text:{inset:5,fontScale:1,lineGap:1.04},
 hall:{rows:5,rowSpacing:.57,rowCurve:.75,seatSize:.48,floorY:79.5,ceilingRadius:6.6,revealSeconds:.8,drift:.55},
 lines:{fadeSeconds:.35,staggerSeconds:0},
};

/** Hollow book for the layout kind 'book' (4:49), with two in-slide steps: open the cover, then fill the hole with blocks.
 * Everything is mirror silver; the blocks are pillow-shaped and chromeShare of them are gunmetal. See DESIGN.md, Hollow book metal.
 * book: x, y and width are stage percent (portrait 3:4), tilt is radians about X, rim is the page frame as a fraction of book width, thickness is the page block in world units.
 * star: size is a fraction of cover width, tilt is radians. open: angle in radians, seconds to swing. flies: count, speed and spread multipliers. fill: seconds for the whole fill, drop height in world units, tumble max rotation in radians, gap between blocks, chromeShare of blocks that are chrome. Tune live with ?editor. */
export const bookLayout={
 book:{x:50,y:54,width:37.5,tilt:-.75,rim:.16,thickness:.59},
 star:{size:.72,tilt:.12},
 open:{angle:2.93,seconds:1.3},
 flies:{count:12,speed:.5,spread:1.15},
 fill:{fillSeconds:1.4,dropHeight:2.5,tumble:.5,gap:.07,chromeShare:.34},
};

/** Eras for the layout kind 'morph' (4:61, with 4:64 and 4:67 pinned): one image per era, one on stage at a time. Each step slides the next era in from the right while the old one leaves to the left; going back reverses it. The year sits under the image in raised type and slides with it.
 * seconds is the slide time. maxWidth, maxHeight and imageY are stage percent, the same rules the 'image' kind uses, applied to each image's own aspect. Tune live with ?editor. */
export const morphLayout={seconds:1,maxWidth:83,maxHeight:69,imageY:46};

/** Drill and rocket for the layout kind 'drill' (4:127), with two in-slide steps. There is no slab: just the heading, a bead, a drill and a rocket.
 * bead: radius in world units (stage is 10 tall), x and y in stage percent. The bead floats there with a small wobble.
 * drill: seconds for the morph and bore down off the bottom (ease-in), spin in radians per second, scale multiplies the ring stack (about 28% of stage height at 3.7), shaving count, bounce is the height in world units of the first of two decaying hops it takes before it bites (0 turns it off).
 * rocket: scale multiplies the rocket, seconds of flight, spiral turns, spiral radius in world units, exit point in stage percent (off the top-left), trail bead count. Tune live with ?editor. */
export const drillLayout={
 bead:{radius:.45,x:50,y:58},
 drill:{seconds:1.9,scale:3.7,spin:14,shavings:8,bounce:.4},
 rocket:{seconds:3.4,scale:2.5,turns:2.5,radius:3.5,exitX:-14,exitY:-16,trail:16},
 /** A submarine as a candidate to replace the drill. variation 0 keeps the drill; 1 arc, 2 corkscrew, 3 sink (see subMotion.ts). Sufyan picked 3 on 16 November 2026, slowed by 30%. Compare them with ?sub=1, 2 or 3.
  * scale multiplies the submarine (about 4.4 world units long at 2.3). bubbles is how many it lets go on the way down. */
 sub:{variation:3,scale:2.3,bubbles:14},
};

/** Split for the layout kind 'split' (27:99): one large panel that becomes six small ones on its single in-slide step. See DESIGN.md, Slide 26.
 * These images are local to the deck: captured from https://form-sg-brand-exploration.vercel.app/ on 2026-11-13, not imported from Figma.
 * parent: x, y and width in stage percent. children: x and y are stage percent and rotation is radians, placed by hand so the grid reads as loose, not ruled. columns is how many sit in a row.
 * variation picks the move: 1 deal (children slide out from behind the parent one by one), 2 burst (all pop out of the centre at once), 3 divide (the parent splits into a stack per row, then each stack fans out). Compare them with ?split=1, 2 or 3. */
export const splitLayout={
 variation:2,seconds:1.2,columns:3,
 parent:{src:'/assets/brand-v5-tab.png',alt:'FormSG Brand Exploration site, V5 tab, showing five landing page drafts',x:50,y:49,width:71,aspect:1.6},
 childWidth:25,childAspect:1600/956,
 children:[
  {src:'/assets/brand-campsite.png',alt:'V1 landing page draft based on Campsite',x:19,y:30,rotation:-.05},
  {src:'/assets/brand-fruitful.png',alt:'V1 landing page draft based on Fruitful',x:50,y:27,rotation:.04},
  {src:'/assets/brand-v2-c.png',alt:'V2 landing page draft C',x:81,y:31,rotation:-.03},
  {src:'/assets/brand-v3-b.png',alt:'V3 landing page draft B, marked-up document',x:20,y:69,rotation:.04},
  {src:'/assets/brand-v5-h.png',alt:'V5 landing page draft H, the logo as building block',x:51,y:71,rotation:-.05},
  {src:'/assets/brand-v6.png',alt:'V6 landing page draft, sideways top of page',x:80,y:67,rotation:.06},
 ],
};

/** Trail for the layout kind 'trail' (114:2): a screenshot of a research log becomes the slide 13 diagram on step 1, and the diagram opens into a string of nodes on step 2. See trailMotion.ts.
 * The screenshot is local to the deck: a render of the send back study's PROCESS.md (participants already anonymised as P1 to P4), captured 2026-11-13. It is not in Figma: the Figma slide holds only the diagram.
 * diagram repeats the desktop numbers of diagramLayout in Diagram.tsx, so step 1 lands exactly on slide 13. line is the thread's radius in world units.
 * chains: one per variation. ends are the two discs at the end of step 2, nodes are the string between them in order. x, y and width are stage percent; r is world units (the stage is 10 tall).
 * variation picks the move: 1 unfold, 2 beads, 3 bud. Compare them with ?trail=1, 2 or 3. seconds: how long step 1 and step 2 take. */
export const trailLayout={
 variation:2,seconds:[1.5,1.9],
 slab:{src:'/assets/research-process-log.png',alt:'Research process log for a usability study: a status table with a row per participant, then a dated work log',x:50,y:50,width:70,aspect:1.6},
 diagram:{left:{x:22,y:55,width:22},right:{x:78,y:55,width:22},capsule:{x:50,y:55,width:16,height:18},line:.07},
 text:{left:'114:9',right:'114:10',question:'114:11'},
 chains:{
  1:{ends:[{x:9,y:64,width:12},{x:91,y:48,width:12}],endR:.3,share:0,neck:.045,flare:1,arrow:true,
   nodes:[{x:20,y:24,r:.28},{x:29,y:66,r:.28},{x:38,y:34,r:.28},{x:46,y:80,r:.28},{x:55,y:50,r:.28},{x:63,y:18,r:.28},{x:72,y:72,r:.28},{x:80,y:22,r:.28}]},
  2:{ends:[{x:10,y:34,width:13},{x:90,y:66,width:13}],endR:.5,share:.55,neck:.05,flare:3,arrow:false,
   nodes:[{x:23,y:70,r:.5},{x:34,y:30,r:.72},{x:46,y:62,r:.42},{x:57,y:24,r:.6},{x:67,y:74,r:.8},{x:79,y:36,r:.48}]},
  3:{ends:[{x:10,y:60,width:14},{x:90,y:42,width:14}],endR:.7,share:.82,neck:.2,flare:1.6,arrow:false,
   nodes:[{x:25,y:28,r:.85},{x:41,y:68,r:1},{x:58,y:30,r:.8},{x:74,y:70,r:.95}]},
 },
};
