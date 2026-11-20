import type {ReactNode} from 'react';
import {DialRoot,useDialKit} from 'dialkit';
import 'dialkit/styles.css';
import {TuningContext,installTuning,type TuningHost} from './tuning';
const host:TuningHost={useDialKit:useDialKit as unknown as TuningHost['useDialKit']};
installTuning(host);
/** Lazy-loaded only when the URL has ?editor. Wraps the app with dialkit's panel and tuning host. */
export default function EditorRoot({children}:{children:ReactNode}){return <TuningContext.Provider value={host}>{children}<DialRoot/></TuningContext.Provider>}
