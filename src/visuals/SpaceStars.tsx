import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {starfield} from './starfield';
import {worldPosition,type StageMetrics} from './Stage';
import {palette} from '../theme/palette';
/** Stars share the 3D depth buffer, so every slab and chrome object covers them. */
export function SpaceStars({seed,metrics}:{seed:string;metrics:StageMetrics}){
 const stars=useMemo(()=>starfield(seed),[seed]);
 const geometry=useMemo(()=>{const shape=new THREE.Shape();const pts=[[0,1],[.2,.2],[1,0],[.2,-.2],[0,-1],[-.2,-.2],[-1,0],[-.2,.2]];pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return new THREE.ShapeGeometry(shape)},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group>{stars.map((s,i)=><mesh key={i} geometry={geometry} position={worldPosition(s.x,s.y,metrics,-12)} scale={s.size/144}><meshBasicMaterial color={palette.core.star} transparent opacity={s.opacity} depthWrite={false} toneMapped={false}/></mesh>)}</group>;
}
