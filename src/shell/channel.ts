export type PresentationMessage={type:'hello'}|{type:'closed'}|{type:'state';slideId:string;paused:boolean;step?:number}|{type:'navigate';direction:-1|1};
export function validMessage(value:unknown):value is PresentationMessage{
 if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;
 return v.type==='hello'||v.type==='closed'||v.type==='state'&&typeof v.slideId==='string'&&typeof v.paused==='boolean'&&(v.step===undefined||typeof v.step==='number'&&Number.isFinite(v.step))||v.type==='navigate'&&(v.direction===-1||v.direction===1);
}
export function sessionId(){let id=sessionStorage.getItem('fof-session');if(!id){id=crypto.randomUUID();sessionStorage.setItem('fof-session',id)}return id;}
export function openChannel(id:string){return typeof BroadcastChannel==='undefined'?null:new BroadcastChannel(`fof-presentation-${id}`)}
