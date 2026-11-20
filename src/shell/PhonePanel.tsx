import {useEffect,useState} from 'react';
/** The laptop's pairing panel, a plain side panel that does not take over the keyboard: a QR code for the phone, who is connected, and the two ways to shut a phone out. */
export function PhonePanel({link,connected,live,onNewCode,onOff,onClose}:{link:string;connected:boolean;live:boolean;onNewCode:()=>void;onOff:()=>void;onClose:()=>void}){
 const [qr,setQr]=useState('');
 useEffect(()=>{let gone=false;setQr('');import('qrcode').then(q=>q.toDataURL(link,{margin:2,width:480})).then(src=>{if(!gone)setQr(src)}).catch(()=>{});return()=>{gone=true}},[link]);
 return <aside id="phone-panel" className="phone-panel" aria-label="Phone remote">
  <div className="phone-panel-heading"><h2>Phone remote</h2><button onClick={onClose} aria-label="Close phone remote panel">Close ×</button></div>
  <p className="phone-panel-warning">Pair before you plug into the projector. Anyone who scans this can move your slides.</p>
  <div className="phone-panel-qr">{qr?<img src={qr} alt="QR code that opens the remote on your phone" width={240} height={240}/>:<span>Making the code…</span>}</div>
  <p className="phone-panel-status" role="status">{!live?'Connecting…':connected?'1 phone connected':'No phone connected'}</p>
  <div className="phone-panel-actions"><button onClick={onNewCode} title="Make a fresh code. Old links stop working.">New code</button><button onClick={onOff}>Turn remote off <kbd>⇧R</kbd></button></div>
 </aside>;
}
