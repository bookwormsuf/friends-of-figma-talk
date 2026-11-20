import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {palette} from '../theme/palette';
import {hexNumber} from '../theme/colour';
const environments=new WeakMap<THREE.WebGLRenderer,THREE.WebGLRenderTarget>();
export function Studio(){const{gl,scene,invalidate}=useThree();useEffect(()=>{let environment=environments.get(gl);if(!environment){const room=new THREE.Scene();room.background=new THREE.Color(palette.room.studioBackground);for(const[x,y,z,w,h,c]of[[0,4,8,10,5,hexNumber(palette.room.cardWhite)],[-5,1,4,2,10,hexNumber(palette.room.cardWhite)],[5,-2,3,4,7,hexNumber(palette.room.cardWhite)],[0,-5,5,10,2,hexNumber(palette.room.studioFloorCard)],[4,3,-5,4,10,hexNumber(palette.room.cardWhite)],[-6,0,1,.4,8,hexNumber(palette.room.studioVioletCard)]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);room.add(m)}const generator=new THREE.PMREMGenerator(gl);environment=generator.fromScene(room,.04);environments.set(gl,environment);generator.dispose();room.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose()}})}scene.environment=environment.texture;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.3;invalidate();return()=>{scene.environment=null}},[gl,scene,invalidate]);return <><hemisphereLight args={[hexNumber(palette.room.skyLight),hexNumber(palette.room.groundLight),2]}/><directionalLight position={[-3,6,10]} intensity={3}/></>}

export function disposeEnvironment(gl:THREE.WebGLRenderer){const env=environments.get(gl);env?.dispose();environments.delete(gl);const silver=silverRooms.get(gl);silver?.dispose();silverRooms.delete(gl)}
type Card=[x:number,y:number,z:number,w:number,h:number,color:number];
const silverRooms=new WeakMap<THREE.WebGLRenderer,THREE.WebGLRenderTarget>();
/** A brighter room for mirror silver: a grey-blue surround with big soft white cards, a dark floor for contrast, and faint pink and blue cards that echo the glows.
 * The main Studio room is mostly dark, which suits the chrome shapes but turns a flat mirror face nearly black. Assign the result to a material's envMap. */
export function useSilverRoom(){
 const gl=useThree(s=>s.gl);
 return useMemo(()=>{
  let target=silverRooms.get(gl);
  if(!target){
   const room=new THREE.Scene();room.background=new THREE.Color(palette.room.silverBackground);
   const cards:Card[]=[[0,7,6,9,3.5,hexNumber(palette.room.cardWhite)],[-8,3,5,2.5,9,hexNumber(palette.room.silverCoolCard)],[8,1,4,2,8,hexNumber(palette.room.cardWhite)],[0,-7,4,18,5,hexNumber(palette.room.silverFloorCard)],[7,5,-4,4,5,hexNumber(palette.room.silverPinkCard)],[-7,-3,2,3,5,hexNumber(palette.room.silverBlueCard)],[0,0,-9,6,6,hexNumber(palette.room.silverBackCard)]];
   for(const[x,y,z,w,h,c]of cards){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);room.add(m)}
   const generator=new THREE.PMREMGenerator(gl);target=generator.fromScene(room,.14);silverRooms.set(gl,target);generator.dispose();
   room.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose()}});
  }
  return target.texture;
 },[gl]);
}
