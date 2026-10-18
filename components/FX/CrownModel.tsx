"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = { progress:number };
const clamp = (n:number) => Math.max(0,Math.min(1,n));

export default function CrownModel({progress}:Props) {
const host = useRef<HTMLDivElement>(null);
const latest = useRef(progress);
const [ready,setReady] = useState(false);
useEffect(()=>{latest.current=progress;},[progress]);
useEffect(()=>{
const el=host.current;
if(!el)return;
let dead=false;
let anim=0;
let renderer:THREE.WebGLRenderer | undefined;
let model:THREE.Group | undefined;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.05,100);
camera.position.set(0,0,7.4);
const light=new THREE.DirectionalLight("#c5ddff",4.2);
light.position.set(-2,5,5);scene.add(light);
const rim=new THREE.DirectionalLight("#317bff",6);
rim.position.set(3,2,-3);scene.add(rim);
scene.add(new THREE.AmbientLight("#a1bbff",1.7));
const loader=new GLTFLoader();
const file="/assets/crown/CORONA-DARK-optimizada.glb";
const controller=new AbortController();
const initialize=()=>{
if(dead)return;
try{
renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.8;
el.appendChild(renderer.domElement);
}catch{return;}
const resize=()=>{
if(!renderer)return;
const w=el.clientWidth,h=el.clientHeight;
if(!w||!h)return;
renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
};
const observer=new ResizeObserver(resize);observer.observe(el);resize();
loader.load(file,(gltf)=>{
if(dead)return;
const source=gltf.scene;
const meshes:THREE.Mesh[]=[];
source.traverse((object)=>{
if(object instanceof THREE.Mesh)meshes.push(object);
});
// Keep only the high-resolution crown. The GLB also includes a flat blue
// background mesh that must never be rendered or included in normalization.
meshes.sort((a,b)=>(b.geometry.getAttribute("position")?.count??0)-(a.geometry.getAttribute("position")?.count??0));
const crown=meshes[0];
if(!crown)return;
for(const mesh of meshes.slice(1)){
mesh.parent?.remove(mesh);
}
source.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(crown);
const size=new THREE.Vector3();
const center=new THREE.Vector3();
bounds.getSize(size);
bounds.getCenter(center);
if(Math.max(size.x,size.y,size.z)<.0001)return;
// Center in original asset coordinates before reorienting from Z-up.
source.position.sub(center);
const upright=new THREE.Group();
upright.rotation.x=-Math.PI/2;
upright.add(source);
const pivot=new THREE.Group();
pivot.add(upright);
pivot.scale.setScalar(3.0/Math.max(size.x,size.y,size.z));
scene.add(pivot);
model=pivot;
setReady(true);
},undefined,()=>{});
const animate=()=>{
anim=requestAnimationFrame(animate);
const t=clamp(latest.current);
if(model){const spin=Math.max(0,Math.min(1,t/.4));model.rotation.y=spin*Math.PI*1.6;model.rotation.z=Math.sin(t*Math.PI*2)*.04;model.position.y=t*.65+Math.sin(performance.now()*.0014)*.04;}
renderer?.render(scene,camera);
};
animate();
const cleanup=()=>{
observer.disconnect();
cancelAnimationFrame(anim);
if(renderer){renderer.dispose();renderer.domElement.remove();}
};
cleanups.push(cleanup);
};
const cleanups:Array<()=>void>=[];
fetch(file,{method:"HEAD",signal:controller.signal}).then(r=>{if(r.ok)initialize();}).catch(()=>{});
return ()=>{
dead=true;controller.abort();for(const cleanup of cleanups)cleanup();
scene.traverse(object=>{
if(object instanceof THREE.Mesh){
object.geometry.dispose();
const materials=Array.isArray(object.material)?object.material:[object.material];
for(const material of materials)material.dispose();
}
});
};
},[]);
return (
<div className="fx-crown-model-host">
<div className="fx-crown-webgl" ref={host} style={{opacity:ready?1:0}} />
{!ready && (
<video autoPlay muted loop playsInline preload="metadata" aria-label="Animated blue USER FX crown">
<source src="/assets/crown/CORONA-DARK.mp4" type="video/mp4" />
</video>
)}
</div>
);
}
