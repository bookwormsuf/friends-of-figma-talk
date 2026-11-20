import React,{Suspense,lazy} from 'react';
import {createRoot} from 'react-dom/client';
// Colour variables first, so every stylesheet that follows can use them.
import './theme/tokens.css';
import App from './App';
import {editorEnabled} from './editor/tuning';
import './shell.css';
// dialkit and motion live in a separate chunk that loads only with ?editor.
const EditorRoot=editorEnabled()?lazy(()=>import('./editor/EditorRoot')):null;
createRoot(document.getElementById('root')!).render(<React.StrictMode>{EditorRoot?<Suspense fallback={null}><EditorRoot><App /></EditorRoot></Suspense>:<App />}</React.StrictMode>);
