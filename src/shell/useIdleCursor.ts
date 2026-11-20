import {useEffect} from 'react';
/** Hides the pointer after `ms` without mouse movement and brings it back on the next move. Keyboard use leaves it hidden, so arrow-key presenting never shows a stray cursor. */
export function useIdleCursor(ms=1000){
 useEffect(()=>{
  const root=document.documentElement;let timer=0;
  const hide=()=>{root.dataset.cursor='hidden'};
  const wake=()=>{delete root.dataset.cursor;clearTimeout(timer);timer=window.setTimeout(hide,ms)};
  wake();
  addEventListener('mousemove',wake,{passive:true});addEventListener('mousedown',wake,{passive:true});
  return()=>{clearTimeout(timer);delete root.dataset.cursor;removeEventListener('mousemove',wake);removeEventListener('mousedown',wake)};
 },[ms]);
}
