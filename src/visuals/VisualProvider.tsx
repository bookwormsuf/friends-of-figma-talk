import {Canvas,useThree,useFrame} from '@react-three/fiber';
import {disposeEnvironment} from './Environment';
import {View} from '@react-three/drei';
import {Component,createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import './visuals.css';
type VisualState={webgl:boolean;motion:boolean};
const VisualContext=createContext<VisualState>({webgl:false,motion:false});
export const useVisualState=()=>useContext(VisualContext);
class CanvasBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(){this.props.onFailure()}render(){return this.state.failed?null:this.props.children}}
function RendererLifecycle(){
 const gl=useThree(s=>s.gl),invalidate=useThree(s=>s.invalidate);
 useFrame(()=>{gl.setScissorTest(false);gl.clear(true,true,true)},-100);
 useEffect(()=>{let frame=0;const refresh=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;invalidate(2)})};addEventListener('scroll',refresh,{passive:true,capture:true});addEventListener('resize',refresh);return()=>{cancelAnimationFrame(frame);removeEventListener('scroll',refresh,true);removeEventListener('resize',refresh);disposeEnvironment(gl)}},[gl,invalidate]);return null
}
/** staticOnly mounts no canvas and no motion, so a nested provider (the slide overview) renders the HTML/SVG fallback only. */
export function VisualProvider({children,paused=false,staticOnly=false}:{children:ReactNode;paused?:boolean;staticOnly?:boolean}){
 const host=useRef<HTMLDivElement>(null);const [webgl,setWebgl]=useState(false);const [available,setAvailable]=useState(()=>!staticOnly&&!new URLSearchParams(location.search).has('no-webgl'));const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);const [visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches),visibility=()=>setVisible(!document.hidden);query.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);return()=>{query.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility)}},[]);
 const motion=available&&!paused&&!reduced&&visible;
 const fail=()=>{setWebgl(false);setAvailable(false)};
 return <VisualContext.Provider value={{webgl,motion}}><div className="visual-provider" ref={host} data-webgl={webgl?'ready':'fallback'} data-motion={motion?'running':'paused'}>{children}{available&&<CanvasBoundary onFailure={fail}><Canvas className="shared-space-canvas" orthographic camera={{position:[0,0,20],near:.1,far:100}} dpr={[1,1.5]} frameloop={motion?'always':'demand'} eventSource={host as React.RefObject<HTMLDivElement>} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null} onCreated={({gl})=>{gl.setClearColor(0,0);setWebgl(true);gl.domElement.addEventListener('webglcontextlost',fail,{once:true})}}><RendererLifecycle/><View.Port/></Canvas></CanvasBoundary>}</div></VisualContext.Provider>
}
