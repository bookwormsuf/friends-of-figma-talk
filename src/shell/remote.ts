import {validMessage,type PresentationMessage} from './channel.ts';
import {remoteConfig} from './remoteConfig.ts';
/** Phone remote (spec, "Phone remote, pinned 18 November 2026"). The same messages the presenter window uses, sent over the internet through Supabase Realtime.
 * Each one travels in an envelope: device says which phone sent it, owner says which phone the laptop obeys. */
/** from: the slide and step the phone was showing when a press was made. */
export type Envelope={m:PresentationMessage;device?:string;owner?:string|null;from?:{slideId:string;step:number}};
/** Phone asks every HEARTBEAT_MS; with no answer for STALE_MS it counts as not connected. */
export const HEARTBEAT_MS=2000,STALE_MS=7000;
const idLike=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=80;
export function validEnvelope(value:unknown):value is Envelope{
 if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;
 const f=v.from as Record<string,unknown>|undefined;
 return validMessage(v.m)&&(v.device===undefined||idLike(v.device))&&(v.owner===undefined||v.owner===null||idLike(v.owner))&&(f===undefined||!!f&&typeof f==='object'&&idLike(f.slideId)&&typeof f.step==='number'&&Number.isFinite(f.step));
}
/** First phone wins: the first device to say hello becomes the owner and stays the owner. */
export const claimOwner=(owner:string|null,device:string|undefined)=>owner??device??null;
/** Only the owner's presses count. */
export const mayControl=(owner:string|null,device:string|undefined)=>!!device&&owner===device;
/** A press counts only if it was made from where the deck is now, and the deck is not still carrying out the press before it. A late press, a repeated one, or a second tap made before the phone caught up is refused, so one tap can never move two steps. awaitingSince is when the last press was accepted (0 once the deck has moved); it expires in case that press moved nothing. */
export const PRESS_SETTLE_MS=1500;
export function acceptPress(from:Envelope['from'],at:PresentationMessage,awaitingSince:number,now:number){
 return !!from&&at.type==='state'&&from.slideId===at.slideId&&from.step===(at.step??0)&&!(awaitingSince>0&&now-awaitingSince<PRESS_SETTLE_MS);
}
export const remoteReady=()=>!!(remoteConfig.url&&remoteConfig.key);
const stored=(key:string,make:()=>string)=>{let v=sessionStorage.getItem(key);if(!v){v=make();sessionStorage.setItem(key,v)}return v};
/** The pairing code in the QR link. It is the only password. Kept for the tab, so a reload does not unpair the phone. */
export const remoteCode=()=>stored('fof-remote-code',()=>crypto.randomUUID());
/** A fresh code. Every link made from the old one stops working, and no phone is the owner. */
export const newRemoteCode=()=>{sessionStorage.removeItem('fof-remote-code');sessionStorage.removeItem('fof-remote-owner');return remoteCode()};
/** The owner is kept for the tab, so a laptop reload cannot hand control to another phone. Only a new code clears it. */
export const loadOwner=()=>sessionStorage.getItem('fof-remote-owner');
export const saveOwner=(owner:string)=>sessionStorage.setItem('fof-remote-owner',owner);
/** Whether the remote was on in this tab, so a reload turns it back on. */
export const remoteWasOn=()=>sessionStorage.getItem('fof-remote-on')==='1';
export const rememberRemoteOn=(on:boolean)=>{if(on)sessionStorage.setItem('fof-remote-on','1');else sessionStorage.removeItem('fof-remote-on')};
/** One id per phone browser, kept in localStorage: scanning the QR code again opens a new tab, and it must still be the same device or the owner would lock itself out. */
export const deviceId=()=>{try{let v=localStorage.getItem('fof-remote-device');if(!v){v=crypto.randomUUID();localStorage.setItem('fof-remote-device',v)}return v}catch{return stored('fof-remote-device',()=>crypto.randomUUID())}};
export const remoteLink=(code:string,checkpoint:boolean)=>`${location.origin}/?view=remote${checkpoint?'&deck=checkpoint':''}&code=${encodeURIComponent(code)}`;
export type RemoteLink={send:(e:Envelope)=>void;close:()=>void};
type Client=import('@supabase/supabase-js').SupabaseClient;
let client:Promise<Client>|null=null;
/** Joins and leaves run one at a time, in the order asked. A link closed before its turn never joins, so opening, closing and reopening quickly (a reload, a new code, React's double start in development) cannot leave a stale channel that swallows the next one. */
let queue:Promise<void>=Promise.resolve();
/** Join the relay channel for a code. onLive reports whether the channel is joined; it flips to false the moment the connection closes and back when it rejoins. Messages sent while not joined are dropped. */
export function openRemote(code:string,onMessage:(e:Envelope)=>void,onLive:(live:boolean)=>void):RemoteLink{
 let channel:import('@supabase/supabase-js').RealtimeChannel|null=null,mine:Client|null=null,closed=false,joined=false;
 queue=queue.then(async()=>{if(closed)return;
  // The library checks its line every 25 seconds by default. 5 notices a dead one (a phone that slept) far sooner.
  client??=import('@supabase/supabase-js').then(({createClient})=>createClient(remoteConfig.url,remoteConfig.key,{auth:{persistSession:false,autoRefreshToken:false},realtime:{heartbeatIntervalMs:5000}}));
  const c=await client;if(closed)return;mine=c;
  channel=c.channel(`fof-remote-${code}`,{config:{broadcast:{self:false}}});
  channel.on('broadcast',{event:'m'},({payload})=>{if(!closed&&validEnvelope(payload))onMessage(payload)}).subscribe(status=>{joined=status==='SUBSCRIBED';if(!closed)onLive(joined)});
 }).catch(()=>{if(!closed)onLive(false)});
 return{send:e=>{if(joined&&channel)void channel.send({type:'broadcast',event:'m',payload:e})},
  close:()=>{if(closed)return;closed=true;joined=false;queue=queue.then(async()=>{if(channel&&mine)await mine.removeChannel(channel)}).catch(()=>{})}};
}
/** Throw the connection away so the next openRemote starts a fresh one. For a phone that woke up and found its line dead: waiting for the library to notice can take most of a minute. */
export function resetRemote(){queue=queue.then(async()=>{const c=client;client=null;if(c)await (await c).realtime.disconnect()}).catch(()=>{})}
