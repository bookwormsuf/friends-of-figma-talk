import {createContext,useContext} from 'react';
/** Number, a slider tuple [value,min,max] or [value,min,max,step], boolean, string, or a nested group of these. */
export type TuningValue=number|boolean|string|[number,number,number]|[number,number,number,number]|TuningConfig;
export type TuningConfig={[key:string]:TuningValue};
export type Resolved<T>={[K in keyof T]:T[K] extends [number,...number[]]?number:T[K] extends object?Resolved<T[K]>:T[K]};
export type TuningOptions={id?:string;persist?:boolean};
/** Editor mode supplies dialkit's useDialKit. Null in normal builds, so dialkit never loads. */
export type TuningHost={useDialKit:(name:string,config:TuningConfig,options?:TuningOptions)=>unknown};
export const TuningContext=createContext<TuningHost|null>(null);
// R3F scene components render in a separate React root where this context may not reach.
// The editor module also registers its host here at load time so both paths see the same value.
let installed:TuningHost|null=null;
export const installTuning=(host:TuningHost)=>{installed=host};
export function resolveDefaults<T extends TuningConfig>(config:T):Resolved<T>{
 const out:Record<string,unknown>={};
 for(const [k,v] of Object.entries(config))out[k]=Array.isArray(v)?v[0]:v&&typeof v==='object'?resolveDefaults(v):v;
 return out as Resolved<T>;
}
/** Live panel values in editor mode, static defaults otherwise.
 * The host is fixed for the whole page lifetime (set by ?editor at load), so the conditional hook call below is stable between renders. */
export function useTuning<T extends TuningConfig>(name:string,config:T,options:TuningOptions={persist:true}):Resolved<T>{
 const host=useContext(TuningContext)??installed;
 if(host)return host.useDialKit(name,config,{id:name.toLowerCase().replace(/\W+/g,'-'),persist:true,...options}) as Resolved<T>;
 return resolveDefaults(config);
}
export const editorEnabled=()=>new URLSearchParams(location.search).has('editor');
/** Read each frame by SilverSlab and MetalLine. Written by GlobalTuning, so there is one panel per setting. */
export const motionTuning={settleRate:1.4,beadSpeed:.035,floatAmount:1,floatSpeed:1,slabTilt:1};
/** Read each frame by Glow. strength is opacity, size scales the glow, breathe scales the slow pulse (0 turns it off). */
export const glowTuning={strength:1,size:1,breathe:1};
