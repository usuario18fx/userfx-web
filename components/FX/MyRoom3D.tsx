"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
export type RoomScene = "bedroom" | "gallery" | "stage";
type Props={lightsOn:boolean; mode?:RoomScene};
export default function MyRoom3D({lightsOn,mode="bedroom"}:Props){
 const mount=useRef<HTMLDivElement>(null);
 const lights=useRef<{ambient:THREE.AmbientLight; key:THREE.PointLight;tv:THREE.Mesh;lamp:THREE.Mesh}|null>(null);
 const [selected,setSelected]=useState("Explore the room: drag to rotate · scroll to zoom · click an object");
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#080c18");
  const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(5.4,3.7,7.5);camera.lookAt(0,1,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  const ambient=new THREE.AmbientLight("#a8c8ff",1.6);scene.add(ambient);
  const key=new THREE.PointLight("#64a8ff",52,16);key.position.set(-1.8,3.6,1.0);key.castShadow=true;scene.add(key);
  const moon=new THREE.DirectionalLight("#93baff",2.5);moon.position.set(3,5,-3);scene.add(moon);
  const objects:THREE.Object3D[]=[];
  const mat=(color:string,roughness=.65)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.15});
  const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;scene.add(mesh);objects.push(mesh);return mesh;
  };
  box("Floor",10,.17,9,0,-.1,0,mat("#151b2b"));
  box("Back wall",10,5,.15,0,2.4,-4.4,mat("#11192c"));
  box("Left wall",.15,5,9,-5,2.4,0,mat("#182239"));
  box("Ceiling",10,.15,9,0,5,-.0,mat("#0b101b"));
  const decorative:THREE.Mesh[]=[];
  const lamp=box("Accent light",.4,.5,.4,-3.25,1.02,.05,new THREE.MeshStandardMaterial({color:"#bce3ff",emissive:"#3c80c8",emissiveIntensity:2}));
  const tv=box("Display",2.7,1.53,.12,2.95,1.6,.5,new THREE.MeshStandardMaterial({color:"#0c1b36",emissive:"#17448b",emissiveIntensity:1.5,metalness:.4}));
  if(mode==="bedroom"){
    box("Bed frame",3.5,.32,2.25,-1.1,.48,.9,mat("#171c2c"));
    box("Mattress",3.35,.36,2.1,-1.1,.75,.88,mat("#47536c"));
    box("Blanket",3.25,.18,1.2,-1.1,1.02,1.32,mat("#101b30"));
    box("Pillow",1.25,.16,.55,-2.0,1.03,.10,mat("#b6bdc9"));
    box("Pillow",1.25,.16,.55,-.42,1.03,.10,mat("#929bae"));
    box("Bed headboard",3.7,1.55,.18,-1.1,1.05,-.38,mat("#1a2437"));
    box("Rug",4,.025,3,-.4,.015,1.18,mat("#233249"));
    box("Nightstand",.7,.65,.72,-3.27,.39,.1,mat("#303f52"));
    box("TV cabinet",2.55,.54,.52,2.95,.4,.78,mat("#1b2539"));
    box("Window frame",3,2.45,.1,2.25,2.85,-4.28,mat("#050812"));
    box("Night window",2.67,2.12,.11,2.25,2.85,-4.19,mat("#23496c"));
    box("Window mullion",.09,2.3,.16,2.25,2.85,-4.10,mat("#070b13"));
    box("Shelf",1.6,.14,.48,-3.95,2.6,-3.45,mat("#40506b"));
  }else if(mode==="gallery"){
    lamp.visible=false;tv.visible=false;
    scene.background=new THREE.Color("#101016");
    const loader=new THREE.TextureLoader();
    ["01","02","03"].forEach((n,i)=>{
      const x=(i-1)*2.9;
      box("Photo frame "+n,2.25,3.1,.13,x,2.6,-4.18,mat("#e8e6e2"));
      const photo=new THREE.Mesh(new THREE.PlaneGeometry(2.02,2.85),new THREE.MeshBasicMaterial({color:"#ffffff",side:THREE.DoubleSide}));
      photo.name="Photo "+n;photo.position.set(x,2.6,-4.09);scene.add(photo);objects.push(photo);decorative.push(photo);
      loader.load("/assets/album/PRVW/PRVW-"+n+".jpg",texture=>{texture.colorSpace=THREE.SRGBColorSpace;(photo.material as THREE.MeshBasicMaterial).map=texture;(photo.material as THREE.MeshBasicMaterial).needsUpdate=true},undefined,()=>{});
      const spotlight=new THREE.SpotLight("#fff3dd",22,9,.5,.7);spotlight.position.set(x,4.5,-1.5);spotlight.target.position.set(x,2.4,-4);scene.add(spotlight,spotlight.target);
    });
  }else{
    lamp.visible=false;tv.visible=false;
    scene.background=new THREE.Color("#05091c");
    box("Stage platform",6,.34,3,0,.24,-1.2,mat("#182a46"));
    box("LED backdrop",7,3,.12,0,2.4,-4.18,new THREE.MeshStandardMaterial({color:"#1547a5",emissive:"#1554aa",emissiveIntensity:1.5}));
    [-2.5,0,2.5].forEach((x,i)=>{const beam=new THREE.PointLight(i===1?"#65c9ff":"#bb79ff",30,10);beam.position.set(x,3.5,-2);scene.add(beam)});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.085,12,80),new THREE.MeshStandardMaterial({color:"#8bc8ff",emissive:"#2a80ed",emissiveIntensity:3}));
    ring.name="Stage light ring";ring.position.set(0,4,-1.2);ring.rotation.x=Math.PI/2;scene.add(ring);objects.push(ring);
  }
  lights.current={ambient,key,tv,lamp};
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let dragging=false,lastX=0,lastY=0,yaw=.48,pitch=.26,radius=8.9,raf=0;
  function orient(){camera.position.set(Math.sin(yaw)*Math.cos(pitch)*radius,1.4+Math.sin(pitch)*radius,Math.cos(yaw)*Math.cos(pitch)*radius);camera.lookAt(0,1.35,0)}
  orient();
  const down=(e:PointerEvent)=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)};
  const move=(e:PointerEvent)=>{if(!dragging)return; yaw-=(e.clientX-lastX)*.006;pitch=Math.max(-.16,Math.min(.8,pitch+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY;orient()};
  const up=(e:PointerEvent)=>{dragging=false;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId)};
  const wheel=(e:WheelEvent)=>{e.preventDefault();radius=Math.max(4.2,Math.min(12,radius+e.deltaY*.009));orient()};
  const click=(e:MouseEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(objects)[0];if(hit)setSelected("Selected: "+hit.object.name)};
  renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("wheel",wheel,{passive:false});renderer.domElement.addEventListener("click",click);
  const observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)});observer.observe(host);
  function animate(){raf=requestAnimationFrame(animate);renderer.render(scene,camera)}animate();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("wheel",wheel);renderer.domElement.removeEventListener("click",click);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose())}});renderer.dispose();host.removeChild(renderer.domElement);lights.current=null};
 },[mode]);
 useEffect(()=>{if(!lights.current)return;const {ambient,key,tv,lamp}=lights.current;ambient.intensity=lightsOn?1.6:.18;key.intensity=lightsOn?52:2.5;(tv.material as THREE.MeshStandardMaterial).emissiveIntensity=lightsOn?1.5:.5;(lamp.material as THREE.MeshStandardMaterial).emissiveIntensity=lightsOn?2:.12},[lightsOn]);
 return <div className="fx-room3d-wrap"><div ref={mount} className="fx-room3d-canvas" aria-label="Interactive 3D bedroom rendered with Three.js"/><div className="fx-room3d-hint" aria-live="polite">{selected}</div></div>;
}
