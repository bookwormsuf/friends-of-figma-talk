import {glowTuning,motionTuning,useTuning} from './tuning';
/** Mount once. Publishes the shared slab, float and metal line motion settings to motionTuning. */
export function GlobalTuning(){
 const slab=useTuning('Slab motion',{settleRate:[1.4,.2,4,.05]}),line=useTuning('Metal line',{beadSpeed:[.035,0,.2,.005]}),float=useTuning('Float',{floatAmount:[1,0,3,.05],floatSpeed:[1,.2,3,.05],slabTilt:[1,0,3,.05]});
 motionTuning.settleRate=slab.settleRate;motionTuning.beadSpeed=line.beadSpeed;
 motionTuning.floatAmount=float.floatAmount;motionTuning.floatSpeed=float.floatSpeed;motionTuning.slabTilt=float.slabTilt;
 const glow=useTuning('Glow',{strength:[1,0,1,.02],size:[1,.6,1.2,.01],breathe:[1,0,3,.05]});
 Object.assign(glowTuning,glow);
 return null;
}
