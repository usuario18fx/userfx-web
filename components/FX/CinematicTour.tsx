"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./CinematicTour.css";

type Props = { progress: number };
const P = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const smooth = (t:number) => t*t*(3-2*t);
const clamp = (v:number) => Math.max(0,Math.min(1,v));
const frames = [
 {t:0, p:P(.06,1.73,13.9), l:P(0,1.7,7)},
 {t:.13,p:P(.08,1.72,11.1),l:P(-.45,1.9,4.4)},
 {t:.28,p:P(-.15,1.68,6.4),l:P(-1.0,1.8,1.7)},
 {t:.41,p:P(.12,1.72,3.25),l:P(0,1.65,-3.1)},
 {t:.57,p:P(-1.55,1.55,1.95),l:P(.5,1.35,-3.7)},
 {t:.70,p:P(1.25,1.65,-.2),l:P(-2.4,1.2,-1.7)},
 {t:.84,p:P(.7,3.75,1.25),l:P(1.35,.6,-1.6)},
 {t:1,p:P(2.1,1.68,2.7),l:P(0,1.65,-3.9)}
];
export default function CinematicTour({progress}:Props){
 const host=useRef<HTMLDivElement>(null);
 const target=useRef(0);
 useEffect(()=>{target.current=clamp(progress)},[progress]);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#14121c");
  const camera=new THREE.PerspectiveCamera(59,1,.08,70);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const mat=(color:string,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const white=mat("#dcd5d2"), dark=mat("#151519"),trim=mat("#eee3db"),wood=mat("#493028",.48),carpet=mat("#151118",1),black=mat("#0d0c13"),red=mat("#a20e24",.95);
  const neon=(color:string)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:3.5});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=scene)=>{
   const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  };
  const canvas=(draw:(ctx:CanvasRenderingContext2D)=>void,w=512,h=512)=>{
   const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");if(!ctx)throw Error("Canvas unsupported");draw(ctx);
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  };
  const print=(title:string,subtitle:string,color="#fe2b9b")=>new THREE.MeshBasicMaterial({map:canvas(ctx=>{
   const g=ctx.createLinearGradient(0,0,512,512);g.addColorStop(0,"#18132e");g.addColorStop(1,"#410b42");ctx.fillStyle=g;ctx.fillRect(0,0,512,512);
   ctx.fillStyle=color;ctx.font="bold 166px Arial";ctx.textAlign="center";ctx.fillText(title,256,280);
   ctx.fillStyle="#f6e6ee";ctx.font="bold 58px Arial";ctx.fillText(subtitle,256,355);
   ctx.fillStyle="#d82883";for(let i=0;i<22;i++){const height=38+(i*53%110);ctx.fillRect(i*24,512-height,17,height)}
  })});
  const pic=(x:number,y:number,z:number,rotate:number,material:THREE.Material,width=1.05,height=1.55)=>{
   const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotate;scene.add(group);
   box(width+.13,height+.14,.07,0,0,0,dark,group);
   const art=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);art.position.z=.044;group.add(art);
   const beam=new THREE.PointLight("#ffd0a2",.7,3);beam.position.set(0,height*.55,.42);group.add(beam);
  };
  // Corridor: warm white concrete, black carpet, framed FX artwork.
  box(3.7,.14,14.7,0,-.1,8.4,carpet);
  box(.18,3.8,13.35,-1.91,1.83,8.75,white);
  box(.18,3.8,13.35,1.91,1.83,8.75,white);
  box(3.85,.16,13.35,0,3.77,8.75,white);
  for(const side of [-1,1]){
   box(.13,.22,13.35,side*1.81,.12,8.75,trim);
   for(const z of [12.45,9.55,6.65]){
    pic(side*1.81,2.05,z,side===-1?Math.PI/2:-Math.PI/2,print(z===12.45?"FX":"USER","ROOM"),1.13,1.65);
   }
  }
  const door=new THREE.Group();scene.add(door);door.position.set(1.8,0,14.6);
  box(.08,3.45,1.65,0,1.7,0,dark,door).rotation.y=Math.PI/2;
  box(.1,.13,.2,-.12,1.65,-.7,mat("#cba675",.3,.8),door);
  for(const z of [12.7,8.5,4.7]){const light=new THREE.PointLight("#ffdfbd",8,6);light.position.set(0,3.32,z);scene.add(light);box(.3,.05,.3,0,3.71,z,mat("#f9f0df"))}
  // Bedroom: white walls, dark carpet, window onto stylized Toronto skyline.
  box(10,.13,9.8,0,-.11,-2.1,carpet);
  box(.2,4.6,9.8,-5,2.25,-2.1,white);box(.2,4.6,9.8,5,2.25,-2.1,white);
  box(10,.2,9.8,0,4.6,-2.1,white);
  box(10,4.6,.15,0,2.2,-6.95,white);
  // Opening in the front wall is intentional: no occluder between hall and room.
  box(2.4,.1,2.0,-2.9,.03,-2.7,carpet);
  const sky=canvas(ctx=>{
   const g=ctx.createLinearGradient(0,0,0,1024);g.addColorStop(0,"#134989");g.addColorStop(.5,"#374b91");g.addColorStop(.8,"#e7676c");g.addColorStop(1,"#0b2149");ctx.fillStyle=g;ctx.fillRect(0,0,1024,1024);
   for(let i=0;i<55;i++){const x=i*19;const h=70+(i*43%270);ctx.fillStyle="#162444";ctx.fillRect(x,870-h,17,h);
    ctx.fillStyle="#ffd295";for(let yy=884-h;yy<860;yy+=13){if((yy+i*7)%3>1)ctx.fillRect(x+4,yy,3,4)}
   }
   ctx.fillStyle="#1b2857";ctx.fillRect(665,260,12,580);ctx.fillStyle="#384b91";ctx.fillRect(654,390,34,18);
   ctx.fillStyle="#d19bff";ctx.fillRect(650,377,44,12);ctx.fillStyle="#8c7fff";ctx.fillRect(669,190,3,200);
  },1024,1024);
  const skyline=new THREE.Mesh(new THREE.PlaneGeometry(6.6,3.15),new THREE.MeshBasicMaterial({map:sky}));skyline.position.set(0,2.55,-6.84);scene.add(skyline);
  for(const x of [-3.45,0,3.45])box(.09,3.35,.11,x,2.6,-6.74,dark);
  for(const y of [.93,4.2])box(6.95,.1,.11,0,y,-6.74,dark);
  const blue=new THREE.PointLight("#367efc",12,9);blue.position.set(0,3.35,-5.7);scene.add(blue);
  const pink=new THREE.PointLight("#ef2d99",16,9);pink.position.set(-3.1,3.1,-3.1);scene.add(pink);
  const amber=new THREE.PointLight("#ffbb82",20,11);amber.position.set(3.1,2.6,-1);scene.add(amber);
  scene.add(new THREE.AmbientLight("#f8ebeb",1.4));
  // Sofa under window.
  box(4.15,.6,1.15,-.5,.52,-5.12,dark);
  box(4.2,1.2,.34,-.5,.99,-5.75,dark);
  for(const x of [-2.45,1.45])box(.28,.9,1.25,x,.72,-5.1,dark);
  for(const x of [-1.8,-.5,.8])box(1.02,.22,.8,x,.89,-5.05,mat("#2f2a36"));
  box(2.2,.07,1.12,-.4,.43,-3.55,mat("#15141b",.24,.18));
  box(3.7,.055,2.25,-.4,.04,-3.65,mat("#25202a"));
  // Red duvet, tall black tufted headboard, black pillows.
  box(3.18,.34,3.55,2.85,.42,-1.1,black);
  box(3.15,.21,3.5,2.85,.73,-1.1,mat("#d6c4c3"));
  box(3.17,.13,2.85,2.85,.89,-.67,red);
  box(3.35,1.65,.25,2.85,1.26,-2.96,mat("#111015",.52));
  for(const x of [1.9,2.85,3.8])for(const y of [.9,1.45]){const stud=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),mat("#27242a",.35));stud.position.set(x,y,-2.79);scene.add(stud)}
  for(const x of [2.15,3.55])box(1.1,.15,.65,x,1.01,-2.2,black);
  // Dark sofa on left and tall framed mirror leaning near the corner.
  box(2.15,.6,1,-3.65,.55,-1.3,dark);box(2.15,.85,.2,-3.65,1,-1.78,dark);
  box(.1,2.55,1.12,-4.57,1.38,-3.45,black);
  const mirror=new THREE.Mesh(new THREE.PlaneGeometry(1,2.33),new THREE.MeshStandardMaterial({color:"#7994ab",metalness:.75,roughness:.12}));
  mirror.position.set(-4.48,1.45,-3.45);mirror.rotation.y=Math.PI/2-.15;scene.add(mirror);
  // FX ROOM framed wall sign, screen and computer alongside.
  pic(4.87,2.65,-3.22,-Math.PI/2,print("FX","ROOM","#ff38a7"),1.6,1.6);
  box(1.65,.84,.14,4.84,1.6,-.25,new THREE.MeshStandardMaterial({color:"#120d27",emissive:"#a1248d",emissiveIntensity:1.8}));
  box(.55,.48,.53,4.38,.9,.7,mat("#9b8d7e"));
  box(.48,.33,.15,4.38,1.14,.43,new THREE.MeshStandardMaterial({color:"#191c27",emissive:"#428aff",emissiveIntensity:1.3}));
  for(const [x,z] of [[-3.7,-4],[-3.5,-.8],[3.8,-4.7]]){const l=new THREE.PointLight("#ffab6b",7,3.8);l.position.set(x,1.12,z);scene.add(l);const globe=new THREE.Mesh(new THREE.SphereGeometry(.16,16,10),new THREE.MeshStandardMaterial({color:"#fff3d9",emissive:"#ffd8a2",emissiveIntensity:2}));globe.position.set(x,1.13,z);scene.add(globe)}
  const ro=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(w&&h){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}});ro.observe(el);
  const position=frames[0].p.clone(),look=frames[0].l.clone(),p=P(0,0,0),l=P(0,0,0);
  let id=0;
  function animate(){
   id=requestAnimationFrame(animate);const t=target.current;
   let i=0;while(i<frames.length-2&&t>frames[i+1].t)i++;
   const a=frames[i],b=frames[i+1],v=smooth(clamp((t-a.t)/(b.t-a.t)));
   p.copy(a.p).lerp(b.p,v);l.copy(a.l).lerp(b.l,v);
   position.lerp(p,.095);look.lerp(l,.095);camera.position.copy(position);camera.lookAt(look);
   renderer.render(scene,camera);
  }animate();
  return()=>{cancelAnimationFrame(id);ro.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m instanceof THREE.MeshBasicMaterial&&m.map)m.map.dispose();m.dispose()}}});renderer.dispose();el.removeChild(renderer.domElement)};
 },[]);
 return (
 <div className="fx-cinematic-canvas" ref={host} aria-label="Recorrido 3D cinematográfico desde la puerta, por el pasillo, hasta Gallery, Videocalls y Stage" />
 );
}
