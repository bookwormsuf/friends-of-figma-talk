import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {checkpointSlides,presentationSlides} from './data/deck';
import type {SlideData,PresentationCrop} from './data/types';
import {deckMode,selectDeck} from './shell/deckMode';
import {SlideVisual} from './visuals/SlideVisual';
import {CroppedImage} from './visuals/CroppedImage';
import {VisualProvider} from './visuals/VisualProvider';
import {IllustrationGallery} from './visuals/IllustrationGallery';
import {usePresentation} from './shell/usePresentation';
import {useIdleCursor} from './shell/useIdleCursor';
import {useThreeFingerHold} from './shell/threeFingerHold';
import {INTERACTIVE,advancePosition,atEdge,buildSections,logicalSlide,locateSlide,overviewCards,pressProgress,slideHash,type OverviewCard,type Section} from './shell/navigation';
import {openChannel,sessionId,validMessage} from './shell/channel';
import type {PresentationMessage} from './shell/channel';
import {slideLayouts} from './slides/layouts';
import {Overview} from './shell/Overview';
import {GlobalTuning} from './editor/GlobalTuning';
import {PhonePanel} from './shell/PhonePanel';
import {HEARTBEAT_MS,STALE_MS,acceptPress,claimOwner,deviceId,loadOwner,mayControl,newRemoteCode,openRemote,rememberRemoteOn,remoteCode,remoteLink,remoteReady,remoteWasOn,resetRemote,saveOwner,type Envelope,type RemoteLink} from './shell/remote';
/** Sections: a pinned slide shares its anchor's section and is shown as an in-slide step. A gallery has one step per image. */
const useSections=(slides:SlideData[])=>useMemo(()=>buildSections(slides,slideLayouts),[slides]);
const anchorOf=(slides:SlideData[],sections:Section[],section:number)=>slides[sections[section].anchorIndex];
const pinnedOf=(slides:SlideData[],sections:Section[],section:number)=>sections[section].slideIndices.slice(1).map(i=>slides[i]);

/** The presenter layout: current slide, its speaker notes with Previous and Next, and the slide that comes next. The presenter window and the Notes view both draw this, so they cannot drift apart. It holds no position of its own. children is the left of the header. */
function PresenterLayout({slides,sections,section,step,checkpoint,navigate,children}:{slides:SlideData[];sections:Section[];section:number;step:number;checkpoint:boolean;navigate:(direction:-1|1)=>void;children:ReactNode}){
 const index=logicalSlide(sections,section,step),slide=slides[index],next=slides[index+1],nextAt=advancePosition(sections,section,step,1),steps=sections[section].steps;
 return <><header className="presenter-header">{children}<span>{index+1} / {slides.length}{steps>0&&` · step ${step} of ${steps}`}</span></header><div className="presenter-grid"><section className="presenter-current"><p className="small-label">Current · Figma slide {slide.order}</p><SlideVisual slide={anchorOf(slides,sections,section)} pinned={pinnedOf(slides,sections,section)} active paused step={step}/></section><aside className="presenter-notes"><h1>Speaker notes</h1><p className="notes-copy">{slide.notes}</p><div className="presenter-buttons"><button onClick={()=>navigate(-1)} disabled={atEdge(sections,section,step,-1)}>← Previous</button><button onClick={()=>navigate(1)} disabled={atEdge(sections,section,step,1)}>Next →</button></div></aside><section className="presenter-next"><p className="small-label">{next?`Next · Figma slide ${next.order}`:checkpoint?'End of checkpoint':'End of presentation'}</p>{next&&nextAt&&<SlideVisual slide={anchorOf(slides,sections,nextAt.section)} pinned={pinnedOf(slides,sections,nextAt.section)} active paused step={nextAt.step}/>}</section></div></>;
}
function Presenter({slides,checkpoint}:{slides:SlideData[];checkpoint:boolean}){
 const params=new URLSearchParams(location.search),session=params.get('session')??'',initial=slides.findIndex(s=>slideHash(s.id)===location.hash);
 const sections=useSections(slides),start=locateSlide(sections,Math.max(0,initial));const [section,setSection]=useState(start.section),[step,setStep]=useState(start.step),[connected,setConnected]=useState(false);const channel=useRef<BroadcastChannel|null>(null);
 useEffect(()=>{const c=openChannel(session);channel.current=c;if(!c)return;let lastSeen=0;const onMessage=(e:MessageEvent)=>{if(!validMessage(e.data))return;if(e.data.type==='closed'){lastSeen=0;setConnected(false);return;}if(e.data.type!=='state')return;const i=slides.findIndex(s=>s.id===e.data.slideId);if(i>=0){lastSeen=Date.now();const loc=locateSlide(sections,i);setSection(loc.section);setStep(e.data.step??loc.step);setConnected(true);history.replaceState(null,'',location.pathname+location.search+slideHash(slides[i].id))}};c.addEventListener('message',onMessage);c.postMessage({type:'hello'});const interval=setInterval(()=>{c.postMessage({type:'hello'});if(!lastSeen||Date.now()-lastSeen>7000)setConnected(false)},2000);return()=>{clearInterval(interval);c.removeEventListener('message',onMessage);c.close();channel.current=null}},[session,slides,sections]);
 const navigate=(direction:-1|1)=>{channel.current?.postMessage({type:'navigate',direction});if(!connected){const to=advancePosition(sections,section,step,direction);if(to){setSection(to.section);setStep(to.step)}}};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target instanceof Element&&e.target.closest(INTERACTIVE))return;const direction=['ArrowRight','ArrowDown','PageDown'].includes(e.key)?1:['ArrowLeft','ArrowUp','PageUp'].includes(e.key)?-1:0;if(direction){e.preventDefault();navigate(direction as -1|1)}};addEventListener('keydown',onKey);return()=>removeEventListener('keydown',onKey)});
 return <VisualProvider paused><GlobalTuning/><main className="presenter"><PresenterLayout slides={slides} sections={sections} section={section} step={step} checkpoint={checkpoint} navigate={navigate}><a href={checkpoint?'/?view=checkpoint':'/'}>Audience view ↗</a><span>{connected?'Following audience window':'Open from the audience window to synchronize'}</span></PresenterLayout></main></VisualProvider>;
}
/** The phone remote: the current slide, its step and the notes, with a large Next under the thumb. It never moves on its own; it asks the laptop to move and shows where the laptop is. */
function Remote({slides}:{slides:SlideData[]}){
 const code=new URLSearchParams(location.search).get('code')??'',ready=remoteReady()&&!!code;
 const sections=useSections(slides);const [section,setSection]=useState(0),[step,setStep]=useState(0),[live,setLive]=useState(false),[seen,setSeen]=useState(false),[owner,setOwner]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const device=useRef(deviceId()),link=useRef<RemoteLink|null>(null);
 useEffect(()=>{if(!ready)return;let lastSeen=0,gone=false;const hello=()=>link.current?.send({m:{type:'hello'},device:device.current});
  const onMessage=(e:Envelope)=>{if(e.m.type==='closed'){lastSeen=0;setSeen(false);return}if(e.m.type!=='state')return;const m=e.m,i=slides.findIndex(s=>s.id===m.slideId);if(i<0)return;lastSeen=Date.now();const loc=locateSlide(sections,i);setSection(loc.section);setStep(m.step??loc.step);setOwner(e.owner??null);setSeen(true)};
  const l=openRemote(code,onMessage,on=>{setLive(on);if(on)hello();else{lastSeen=0;setSeen(false)}});link.current=l;
  const interval=setInterval(()=>{hello();if(!lastSeen||Date.now()-lastSeen>STALE_MS)setSeen(false)},HEARTBEAT_MS);
  // Back from a locked screen or another app: ask at once, and if the laptop has not answered in 2 seconds the line is dead, so start a fresh one.
  const onVisible=()=>{if(document.visibilityState!=='visible')return;const since=Date.now();hello();setTimeout(()=>{if(!gone&&lastSeen<since){resetRemote();setRetry(r=>r+1)}},2000)};document.addEventListener('visibilitychange',onVisible);
  return()=>{gone=true;clearInterval(interval);document.removeEventListener('visibilitychange',onVisible);l.close();if(link.current===l)link.current=null}},[ready,code,slides,sections,retry]);
 // Keep the screen awake: a locked phone drops the connection. The lock is released whenever the page is hidden, so ask again on return.
 useEffect(()=>{let lock:WakeLockSentinel|null=null;const ask=()=>{if(document.visibilityState==='visible')navigator.wakeLock?.request('screen').then(l=>{lock=l}).catch(()=>{})};ask();document.addEventListener('visibilitychange',ask);return()=>{document.removeEventListener('visibilitychange',ask);void lock?.release()}},[]);
 const connected=live&&seen,inControl=mayControl(owner,device.current),can=connected&&inControl;
 const index=logicalSlide(sections,section,step),slide=slides[index],steps=sections[section].steps;
 const press=(direction:-1|1)=>{if(can)link.current?.send({m:{type:'navigate',direction},device:device.current,from:{slideId:slide.id,step}})};
 if(!ready)return <main className="remote"><p className="remote-banner" role="status">This remote link is not valid. Scan the code on the laptop again.</p></main>;
 return <VisualProvider paused><main className="remote">
  {!can&&<p className="remote-banner" role="status">{connected?'Another device is in control':'Not connected'}</p>}
  <p className="small-label">Slide {index+1} / {slides.length}{steps>0&&` · step ${step} of ${steps}`}</p>
  <SlideVisual slide={anchorOf(slides,sections,section)} pinned={pinnedOf(slides,sections,section)} active paused step={step}/>
  <p className="notes-copy">{slide.notes}</p>
  <div className="remote-pad"><button className="remote-previous" onClick={()=>press(-1)} disabled={!can||atEdge(sections,section,step,-1)}>← Previous</button><button className="remote-next" onClick={()=>press(1)} disabled={!can||atEdge(sections,section,step,1)}>Next →</button></div>
 </main></VisualProvider>;
}
function Audience({slides,checkpoint}:{slides:SlideData[];checkpoint:boolean}){
 const [notes,setNotes]=useState(false),[chrome,setChrome]=useState(true),[paused,setPaused]=useState(false),[image,setImage]=useState<{src:string;alt:string;crop?:PresentationCrop}|null>(null),[presenterBlocked,setPresenterBlocked]=useState(false),[overview,setOverview]=useState(false),[hint,setHint]=useState(false);
 // Phone remote. On only after "Phone ↗" is pressed; the flag brings it back after a reload.
 const [remoteOn,setRemoteOn]=useState(()=>remoteReady()&&remoteWasOn()),[code,setCode]=useState(()=>remoteReady()?remoteCode():''),[phonePanel,setPhonePanel]=useState(false),[phone,setPhone]=useState(false),[remoteLive,setRemoteLive]=useState(false);
 const remote=useRef<RemoteLink|null>(null),owner=useRef<string|null>(null),awaiting=useRef(0),remoteOnRef=useRef(remoteOn);remoteOnRef.current=remoteOn;
 const setRemote=useCallback((on:boolean)=>{rememberRemoteOn(on);setRemoteOn(on);if(!on)setPhonePanel(false)},[]);
 const dialog=useRef<HTMLDialogElement>(null),notesView=useRef<HTMLElement>(null),channel=useRef<BroadcastChannel|null>(null),session=useRef(`${sessionId()}-${checkpoint?'checkpoint':'full'}`);
 const sections=useSections(slides);const {index,section,step,reduced,navigate,goTo,cancel}=usePresentation(slides,!!image||overview,sections,notes);const slide=slides[index],anchorId=anchorOf(slides,sections,section).id;const notesRef=useRef(notes);notesRef.current=notes;
 const focusSlide=useCallback(()=>document.querySelector<HTMLElement>(`[data-slide-id="${anchorId}"]`)?.focus({preventScroll:true}),[anchorId]);
 const closeNotes=useCallback(()=>{setNotes(false);focusSlide()},[focusSlide]);
 const overviewRef=useRef(overview);overviewRef.current=overview;const phonePanelRef=useRef(phonePanel);phonePanelRef.current=phonePanel;const cards=useMemo(()=>overviewCards(slides,sections),[slides,sections]);
 const closeOverview=useCallback(()=>{setOverview(false);requestAnimationFrame(()=>{const b=document.getElementById('overview-toggle');if(b)b.focus({preventScroll:true});else focusSlide()})},[focusSlide]);
 const jumpTo=useCallback((c:OverviewCard)=>{setOverview(false);goTo(c.slideId);const a=slides[sections[c.section].anchorIndex].id;requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-slide-id="${a}"]`)?.focus({preventScroll:true}))},[goTo,slides,sections]);
 // Hiding on a touch-first device shows a short hint, because there is no H key to bring the UI back (DESIGN.md, Touch controls).
 const chromeRef=useRef(chrome);chromeRef.current=chrome;
 const showChrome=useCallback((show:boolean)=>{setChrome(show);setHint(!show&&matchMedia('(pointer:coarse)').matches)},[]);
 useEffect(()=>{if(!hint)return;const t=setTimeout(()=>setHint(false),2000);return()=>clearTimeout(t)},[hint]);
 const hideChrome=()=>{showChrome(false);focusSlide()};
 useThreeFingerHold(()=>showChrome(!chromeRef.current),!notes&&!image&&!overview);
 const state=useRef<PresentationMessage>({type:'state',slideId:slide.id,paused,step});state.current={type:'state',slideId:slide.id,paused:paused||reduced,step};const navigateRef=useRef(navigate);navigateRef.current=navigate;
 // A press from the presenter window or the phone: close the overview or an enlarged image, leave the Notes view open (spec, Notes view item 7), then move.
 const followRemote=useCallback((direction:-1|1)=>{setOverview(false);setImage(null);navigateRef.current(direction,true)},[]);
 useEffect(()=>{const c=openChannel(session.current);channel.current=c;if(!c)return;const onMessage=(e:MessageEvent)=>{if(!validMessage(e.data))return;if(e.data.type==='hello')c.postMessage(state.current);if(e.data.type==='navigate')followRemote(e.data.direction)};const onClose=()=>c.postMessage({type:'closed'});c.addEventListener('message',onMessage);addEventListener('pagehide',onClose);return()=>{removeEventListener('pagehide',onClose);c.removeEventListener('message',onMessage);c.close();channel.current=null}},[]);
 useEffect(()=>{awaiting.current=0;channel.current?.postMessage(state.current);remote.current?.send({m:state.current,owner:owner.current})},[index,step,paused,reduced]);
 // The laptop answers every hello with where it is and who is in control. Only the owner's presses move the deck. The owner is kept for the tab so a reload cannot hand control to someone else.
 useEffect(()=>{if(!remoteOn||!code)return;let ownerSeen=0;owner.current=loadOwner();
  const onMessage=(e:Envelope)=>{if(e.m.type==='hello'){const o=claimOwner(owner.current,e.device);if(o&&o!==owner.current){owner.current=o;saveOwner(o)}if(mayControl(owner.current,e.device)){ownerSeen=Date.now();setPhone(true)}remote.current?.send({m:state.current,owner:owner.current})}
   if(e.m.type==='navigate'&&mayControl(owner.current,e.device)){if(acceptPress(e.from,state.current,awaiting.current,Date.now())){awaiting.current=Date.now();followRemote(e.m.direction)}else remote.current?.send({m:state.current,owner:owner.current})}};
  const l=openRemote(code,onMessage,setRemoteLive);remote.current=l;
  const interval=setInterval(()=>{if(Date.now()-ownerSeen>STALE_MS)setPhone(false)},HEARTBEAT_MS);
  return()=>{clearInterval(interval);l.send({m:{type:'closed'}});l.close();if(remote.current===l)remote.current=null;setPhone(false);setRemoteLive(false)}},[remoteOn,code]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(overviewRef.current)closeOverview();else if(phonePanelRef.current)setPhonePanel(false);else if(notesRef.current)closeNotes();else if(!chromeRef.current&&!image)showChrome(true);return;}if(e.key==='R'&&e.shiftKey&&!e.altKey&&!e.ctrlKey&&!e.metaKey){if(remoteOnRef.current){e.preventDefault();setRemote(false)}return}if(e.altKey||e.ctrlKey||e.metaKey||e.target instanceof Element&&e.target.closest(INTERACTIVE))return;if(notesRef.current&&['o','h'].includes(e.key.toLowerCase()))return;if(e.key.toLowerCase()==='o'&&!image){e.preventDefault();if(overviewRef.current)closeOverview();else setOverview(true);return}if(overviewRef.current)return;if(e.key.toLowerCase()==='n'&&!image){e.preventDefault();setNotes(n=>!n)}if(e.key.toLowerCase()==='h'&&!image){e.preventDefault();setHint(false);setChrome(c=>!c)}};addEventListener('keydown',onKey);return()=>removeEventListener('keydown',onKey)},[image,closeNotes,closeOverview,showChrome,setRemote]);
 // The Notes view slides the deck aside (shell.css) so the one shared canvas draws only the Notes view's pictures. Focus goes to the view, not its Close button, so a clicker that sends Space cannot close it.
 useEffect(()=>{if(!notes)return;cancel();document.documentElement.dataset.notes='';notesView.current?.focus({preventScroll:true});return()=>{delete document.documentElement.dataset.notes}},[notes,cancel]);
 useIdleCursor(1000);
 useEffect(()=>{if(image&&!dialog.current?.open)dialog.current?.showModal();if(!image&&dialog.current?.open)dialog.current.close()},[image]);
 const presenterUrl=`/?view=presenter${checkpoint?'&deck=checkpoint':''}&session=${encodeURIComponent(session.current)}${slideHash(slide.id)}`;
 const openPresenter=()=>{const p=window.open(presenterUrl,'fof-presenter','popup,width=1440,height=900');setPresenterBlocked(!p)};
 return <VisualProvider paused={paused||reduced||!!image||overview}><GlobalTuning/>{chrome&&!notes&&<header className="presentation-toolbar"><a className="wordmark" href={slideHash(slides[0].id)}>What if <span>→</span> Try this</a><div className="toolbar-actions"><a href="?view=illustrations" className="gallery-link">Illustrations</a><button id="motion-toggle" aria-pressed={paused||reduced} disabled={reduced} onClick={()=>setPaused(p=>!p)}>{reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button><button id="overview-toggle" aria-pressed={overview} aria-haspopup="dialog" onClick={()=>overview?closeOverview():setOverview(true)}>Overview <kbd>O</kbd></button><button id="notes-toggle" aria-expanded={notes} aria-controls="speaker-notes" onClick={()=>setNotes(n=>!n)}>Notes <kbd>N</kbd></button><button id="presenter-toggle" onClick={openPresenter}>Presenter ↗</button>{remoteReady()&&<button id="phone-toggle" aria-pressed={remoteOn} aria-expanded={phonePanel} aria-controls="phone-panel" onClick={()=>{setRemote(true);setPhonePanel(p=>!p)}}>Phone ↗</button>}<button id="chrome-toggle" title="Hide the toolbar and slide controls. Press H to show them again." onClick={hideChrome}>Hide UI <kbd>H</kbd></button></div></header>}
 <main className="story" aria-label="Friends of Figma presentation">{sections.map((sec,i)=>{const s=slides[sec.anchorIndex];return <section key={s.id} id={slideHash(s.id).slice(1)} data-slide-id={s.id} data-source-order={s.order} className="story-section" tabIndex={-1} aria-label={`Figma slide ${s.order}`}><SlideVisual slide={s} pinned={pinnedOf(slides,sections,i)} active={Math.abs(i-section)<=1} paused={paused||reduced||!!image||overview} step={i===section?step:0} onImageOpen={(src,alt,crop)=>setImage({src,alt,crop})}/></section>})}</main>
 {chrome&&!notes&&<nav className="presentation-progress" aria-label="Slide navigation"><button id="previous" aria-label="Previous slide" disabled={atEdge(sections,section,step,-1)} onClick={()=>navigate(-1)}>←</button><div className="progress-center"><select id="slide-picker" title="Jump to slide" aria-label="Jump to slide" value={slide.id} onChange={e=>goTo(e.target.value)}>{slides.map(s=><option key={s.id} value={s.id}>Slide {s.order}</option>)}</select><span id="progress-count">{index+1} <span>/ {slides.length}</span></span><span className="jump-indicator" aria-hidden="true">⌄</span><div className="progress-track"><span style={{width:`${pressProgress(sections,section,step)*100}%`}}/></div></div><button id="next" aria-label="Next slide" disabled={atEdge(sections,section,step,1)} onClick={()=>navigate(1)}>→</button></nav>}
 {!chrome&&!notes&&<div className="corner-taps"><button className="corner-tap corner-tap-previous" aria-label="Previous slide" disabled={atEdge(sections,section,step,-1)} onClick={()=>navigate(-1)}/><button className="corner-tap corner-tap-next" aria-label="Next slide" disabled={atEdge(sections,section,step,1)} onClick={()=>navigate(1)}/></div>}
 {hint&&<div className="touch-hint" role="status">UI hidden. Hold three fingers to show it.</div>}
 {notes&&<aside ref={notesView} id="speaker-notes" className="presenter notes-view" aria-label="Speaker notes" tabIndex={-1}><PresenterLayout slides={slides} sections={sections} section={section} step={step} checkpoint={checkpoint} navigate={navigate}><button onClick={closeNotes} aria-label="Close speaker notes">Close notes ×</button></PresenterLayout></aside>}
 {phonePanel&&remoteOn&&<PhonePanel link={remoteLink(code,checkpoint)} connected={phone} live={remoteLive} onNewCode={()=>{owner.current=null;setPhone(false);setCode(newRemoteCode())}} onOff={()=>setRemote(false)} onClose={()=>setPhonePanel(false)}/>}
 {overview&&<Overview slides={slides} sections={sections} cards={cards} current={index} onJump={jumpTo} onClose={closeOverview}/>}
 {presenterBlocked&&<div className="popup-notice" role="status">Your browser blocked the presenter window. <a href={presenterUrl} target="_blank" rel="noopener">Open presenter view</a><button aria-label="Dismiss message" onClick={()=>setPresenterBlocked(false)}>×</button></div>}
 <dialog ref={dialog} className="image-dialog" onClose={()=>setImage(null)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setImage(null)}}}><button className="image-close" onClick={()=>setImage(null)} aria-label="Close enlarged image">Close ×</button>{image&&<CroppedImage src={image.src} alt={image.alt} crop={image.crop} enlarged/>}</dialog></VisualProvider>;
}
export default function App(){const params=new URLSearchParams(location.search),view=params.get('view'),mode=deckMode(location.search),slides=selectDeck(mode,presentationSlides,checkpointSlides);if(view==='presenter')return <Presenter slides={slides} checkpoint={mode==='checkpoint'}/>;if(view==='remote')return <Remote slides={slides}/>;if(view==='illustrations')return <VisualProvider paused={false}><header className="gallery-header"><a href="/">← Back to presentation</a><span>Illustration studies</span></header><IllustrationGallery/></VisualProvider>;return <Audience slides={slides} checkpoint={mode==='checkpoint'}/>;}
