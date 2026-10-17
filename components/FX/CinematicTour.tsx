"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
 {t:.57,p:P(-1.85,3.55,1.35),l:P(1.0,.80,-2.4)},
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
  // Noir corridor: burgundy patterned walls, black trim and glossy veined marble.
  // Existing room boundaries, camera keyframes and scroll controls are preserved.
  const bronze=mat("#8b6038",.32,.68);
  const lacquer=mat("#100c12",.27,.34);
  const wallPattern=canvas(ctx=>{
   ctx.fillStyle="#431b24";ctx.fillRect(0,0,512,512);
   for(let y=15;y<512;y+=76)for(let x=16;x<512;x+=76){
    ctx.strokeStyle="rgba(203,121,92,.30)";ctx.lineWidth=2.2;
    ctx.beginPath();ctx.ellipse(x,y+20,17,26,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y-10);ctx.bezierCurveTo(x-25,y+13,x-24,y+40,x,y+55);
    ctx.bezierCurveTo(x+24,y+40,x+25,y+13,x,y-10);ctx.stroke();
    ctx.beginPath();ctx.ellipse(x,y+20,5,18,0,0,Math.PI*2);ctx.stroke();
   }
  });
  wallPattern.wrapS=THREE.RepeatWrapping;wallPattern.wrapT=THREE.RepeatWrapping;
  wallPattern.repeat.set(10,2.8);
  const wallpaper=new THREE.MeshStandardMaterial({map:wallPattern,roughness:.88});
  const marbleTexture=canvas(ctx=>{
   ctx.fillStyle="#09090e";ctx.fillRect(0,0,512,512);
   for(let k=0;k<90;k++){
    const x=(k*97)%512,y=(k*61)%512;
    ctx.strokeStyle=k%4===0?"rgba(225,173,103,.61)":"rgba(190,186,184,.2)";
    ctx.lineWidth=k%7===0?1.6:.6;ctx.beginPath();ctx.moveTo(x-75,y+42);
    ctx.bezierCurveTo(x-10,y-25,x+25,y+40,x+135,y-32);ctx.stroke();
   }
  });
  marbleTexture.wrapS=THREE.RepeatWrapping;marbleTexture.wrapT=THREE.RepeatWrapping;marbleTexture.repeat.set(2,7);
  const marble=new THREE.MeshStandardMaterial({map:marbleTexture,roughness:.13,metalness:.14});
  box(3.7,.14,14.7,0,-.1,8.4,marble);
  box(.18,3.8,13.35,-1.91,1.83,8.75,wallpaper);
  box(.18,3.8,13.35,1.91,1.83,8.75,wallpaper);
  box(3.85,.16,13.35,0,3.77,8.75,mat("#21171a",.66));
  for(const side of [-1,1]){
   const x=side*1.78;
   box(.13,.72,13.35,x,.36,8.75,lacquer);
   box(.14,.11,13.35,x,.77,8.75,bronze);
   box(.15,.13,13.35,x,3.56,8.75,lacquer);
   box(.17,.06,13.35,x,3.4,8.75,bronze);
   for(const z of [12.45,9.55,6.65]){
    pic(side*1.81,2.06,z,side===-1?Math.PI/2:-Math.PI/2,print(z===12.45?"FX":"USER","ROOM"),1.13,1.65);
    // Decorative wall-picture lights with warm falloff.
    const sconce=new THREE.PointLight("#ffd09a",2.6,3.7);
    sconce.position.set(side*1.48,2.97,z);scene.add(sconce);
    box(.15,.065,.38,side*1.66,2.97,z,bronze);
   }
  }
  // Black and brass framing visually links the corridor to the room.
  for(const z of [3.95,7.55,11.15,14.65]){
   for(const x of [-1.79,1.79])box(.1,3.54,.1,x,1.8,z,lacquer);
   box(3.63,.12,.12,0,3.49,z,lacquer);
   box(3.63,.035,.12,0,3.36,z,bronze);
  }
  const door=new THREE.Group();scene.add(door);door.position.set(1.8,0,14.6);
  box(.08,3.45,1.65,0,1.7,0,lacquer,door).rotation.y=Math.PI/2;
  box(.1,.13,.2,-.12,1.65,-.7,bronze,door);
  for(const z of [12.7,8.5,4.7]){
   const light=new THREE.PointLight("#ffca8f",7,6);light.position.set(0,3.32,z);scene.add(light);
   box(.3,.05,.3,0,3.69,z,new THREE.MeshStandardMaterial({color:"#fff0d2",emissive:"#ffba71",emissiveIntensity:1.4}));
  }
  // Bedroom: white walls, dark carpet, window onto stylized Toronto skyline.
  box(10,.13,9.8,0,-.11,-2.1,carpet);
  box(.2,4.6,9.8,-5,2.25,-2.1,white);box(.2,4.6,9.8,5,2.25,-2.1,white);
  box(10,.2,9.8,0,4.6,-2.1,white);
  box(10,4.6,.15,0,2.2,-6.95,white);
  // Opening in the front wall is intentional: no occluder between hall and room.
  box(2.4,.1,2.0,-2.9,.03,-2.7,carpet);
  // Window removed. Keep the existing solid rear wall and hang zebra artwork.
  // A local photo at /assets/my-room/zebra-art.jpg automatically replaces the fallback.
  const zebraCanvas=canvas(ctx=>{
   ctx.fillStyle="#100e11";ctx.fillRect(0,0,512,512);
   ctx.fillStyle="#b99a66";ctx.beginPath();ctx.ellipse(230,270,150,195,-.36,0,Math.PI*2);ctx.fill();
   ctx.fillStyle="#1a1416";
   for(let i=0;i<12;i++){
    ctx.save();ctx.translate(115+i*21,110+i*20);ctx.rotate(-.38+i*.055);
    ctx.beginPath();ctx.ellipse(0,0,12,113,0,0,Math.PI*2);ctx.fill();ctx.restore();
   }
   ctx.fillStyle="#171217";ctx.beginPath();ctx.arc(338,208,12,0,Math.PI*2);ctx.fill();
  });
  const zebraMaterial=new THREE.MeshBasicMaterial({map:zebraCanvas,side:THREE.DoubleSide});
  pic(1.55,2.62,-6.83,0,zebraMaterial,2.4,2.5);
  // Rectangular window on the left of the zebra, flush to the same back wall.
  const sunset=canvas(ctx=>{
   const grad=ctx.createLinearGradient(0,0,0,512);
   grad.addColorStop(0,"#253f87");grad.addColorStop(.44,"#d367a0");
   grad.addColorStop(.74,"#f2a66e");grad.addColorStop(1,"#241d47");
   ctx.fillStyle=grad;ctx.fillRect(0,0,512,512);
   ctx.fillStyle="#29223d";
   for(let i=0;i<30;i++){
    const x=i*18,top=330-(i*47%103);
    ctx.fillRect(x,top,16,512-top);
    ctx.fillStyle="#f4b47f";
    for(let yy=top+12;yy<490;yy+=22)ctx.fillRect(x+5,yy,3,4);
    ctx.fillStyle="#29223d";
   }
  });
  const sunsetPane=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.25),new THREE.MeshBasicMaterial({map:sunset}));
  sunsetPane.position.set(-2.30,2.68,-6.824);scene.add(sunsetPane);
  for(const x of [-3.55,-2.30,-1.05])box(.075,2.45,.09,x,2.68,-6.74,dark);
  for(const y of [1.48,3.89])box(2.57,.075,.09,-2.3,y,-6.74,dark);
  const windowGlow=new THREE.PointLight("#c97ca5",3.8,5.5);
  windowGlow.position.set(-2.35,2.6,-5.9);scene.add(windowGlow);
  const zebraPhoto=new THREE.TextureLoader();
  zebraPhoto.load("/assets/my-room/zebra-art.jpg",texture=>{
   if(abort.signal.aborted){texture.dispose();return;}
   texture.colorSpace=THREE.SRGBColorSpace;
   zebraMaterial.map=texture;zebraMaterial.needsUpdate=true;
  },undefined,()=>{ /* Keep the built-in zebra art until the user's image is copied locally. */ });
  const pink=new THREE.PointLight("#ef2d99",16,9);pink.position.set(-3.1,3.1,-3.1);scene.add(pink);
  const amber=new THREE.PointLight("#ffbb82",20,11);amber.position.set(3.1,2.6,-1);scene.add(amber);
  scene.add(new THREE.AmbientLight("#f8ebeb",1.4));
  // MY ROOM v2: detailed furniture and tactile surfaces. Hallway and camera untouched.
  const fabricTexture=(base:string,accent:string,frequency=140)=>{
   const tex=canvas(ctx=>{
    ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    for(let i=0;i<frequency*20;i++){
     const x=(i*97.83)%512,y=(i*71.31)%512;
     ctx.fillStyle=i%3===0?accent:"rgba(255,255,255,.032)";
     ctx.fillRect(x,y,.8+(i%3),1+(i%4));
    }
   });
   tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);
   return new THREE.MeshStandardMaterial({map:tex,roughness:1});
  };
  // Poly Haven CC0 micro-surface normals. Existing colors remain unchanged.
  // These optional 1K maps enhance the duvet, padded headboard and floor;
  // if network access fails, their existing materials still render correctly.
  const abort=new AbortController();
  const textureLoader=new THREE.TextureLoader();
  const polyHavenNormal=(material:THREE.MeshStandardMaterial,asset:string,repeatX:number,repeatY:number,strength:number)=>{
   const file=`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${asset}/${asset}_nor_gl_1k.jpg`;
   textureLoader.load(file,texture=>{
    if(abort.signal.aborted){texture.dispose();return;}
    texture.wrapS=THREE.RepeatWrapping;
    texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(repeatX,repeatY);
    texture.colorSpace=THREE.NoColorSpace;
    material.normalMap=texture;
    material.normalScale.set(strength,strength);
    material.needsUpdate=true;
   },undefined,()=>{ /* Preserve the original material when offline. */ });
  };
  const upholstery=fabricTexture("#15131b","rgba(52,46,60,.25)");
  const duvet=fabricTexture("#a10821","rgba(255,125,145,.095)");
  const sofaFabric=fabricTexture("#282630","rgba(125,112,144,.16)");
  const rugFabric=fabricTexture("#131116","rgba(94,82,96,.1)",260);
  // Fine grain on the red coverlet, deep upholstered texture and carpet pile.
  polyHavenNormal(duvet,"velour_velvet",3,3,.17);
  polyHavenNormal(upholstery,"fabric_leather_01",2,2,.27);
  polyHavenNormal(rugFabric,"dirty_carpet",7,7,.25);
  const roundBox=(w:number,h:number,d:number,r:number,x:number,y:number,z:number,m:THREE.Material)=>{
   const sh=new THREE.Shape();sh.moveTo(-w/2+r,-h/2);sh.lineTo(w/2-r,-h/2);sh.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
   sh.lineTo(w/2,h/2-r);sh.quadraticCurveTo(w/2,h/2,w/2-r,h/2);sh.lineTo(-w/2+r,h/2);
   sh.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);sh.lineTo(-w/2,-h/2+r);sh.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
   const geom=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelSize:Math.min(r*.3,.06),bevelThickness:.03,bevelSegments:3,steps:1,curveSegments:5});
   geom.translate(0,0,-d/2);
   const mesh=new THREE.Mesh(geom,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  };
  // Full-wall black carpet and dark, tactile lounge rug.
  box(9.7,.022,9.5,0,.017,-2.08,rugFabric);
  box(3.75,.045,2.55,-.55,.045,-3.23,sofaFabric);
  const sofaObjectsStart=scene.children.length;
  // Sofa beneath the window: rounded seat cushions, back cushions and armrests.
  box(4.06,.30,1.25,-.55,.36,-5.2,dark);
  roundBox(4.05,1.02,.24,.2,-.55,.92,-5.77,sofaFabric);
  for(const sx of [-2.50,1.39])roundBox(.31,.88,1.28,.14,sx,.72,-5.2,sofaFabric);
  for(const sx of [-1.84,-.57,.70]){
   roundBox(1.16,.19,.9,.09,sx,.65,-5.08,sofaFabric);
   roundBox(1.10,.76,.19,.13,sx,1.09,-5.56,sofaFabric);
  }
  for(const sx of [-1.58,.85]){
   const cushion=roundBox(.62,.55,.16,.13,sx,1,-5.42,fabricTexture("#49404a","rgba(190,154,162,.12)"));
   cushion.rotation.z=sx<0?-.18:.19;
  }
  // Move the sofa beside the bed, both pointing to the left.
  const sofaGroup=new THREE.Group();
  sofaGroup.position.set(4.30,0,-4.80);
  sofaGroup.rotation.y=-Math.PI/2;
  scene.add(sofaGroup);
  const sofaItems=scene.children.slice(sofaObjectsStart).filter(item=>item!==sofaGroup);
  for(const item of sofaItems){
   scene.remove(item);sofaGroup.add(item);
   item.position.x+=.55;item.position.z+=5.2;
  }
  // Low black marble table with veins and small display objects.
  const marbleMap=canvas(ctx=>{
   ctx.fillStyle="#111017";ctx.fillRect(0,0,512,512);
   for(let k=0;k<35;k++){
    ctx.strokeStyle=k%4===0?"rgba(224,226,240,.5)":"rgba(168,167,188,.16)";
    ctx.lineWidth=k%5===0?1.7:.65;ctx.beginPath();
    const x=(k*119)%512,y=(k*61)%512;ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+32,y-24,x+80,y+32,x+135,y-25);ctx.stroke();
   }
  });
  marbleMap.wrapS=THREE.RepeatWrapping;marbleMap.wrapT=THREE.RepeatWrapping;
  box(2.2,.095,1.12,-.4,.47,-3.55,new THREE.MeshStandardMaterial({map:marbleMap,roughness:.19,metalness:.16}));
  for(const x of [-1.33,.50])for(const z of [-3.97,-3.12])box(.042,.4,.042,x,.23,z,mat("#111018",.3,.5));
  // MY ROOM: layered, softly deformed bed geometry in its original footprint.
  // The camera path and hall are deliberately unchanged.
  const softSurface=(w:number,d:number,x:number,y:number,z:number,material:THREE.Material,amplitude:number)=>{
   const geometry=new THREE.PlaneGeometry(w,d,42,52);
   const positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    const px=positions.getX(i),pz=-positions.getY(i);
    const edge=Math.pow(Math.max(0,1-Math.abs(px)/(w*.5)),.35)*Math.pow(Math.max(0,1-Math.abs(pz)/(d*.5)),.3);
    const ripples=Math.sin(pz*5.7+px*1.25)*.48+Math.sin(px*9.3-pz*2.4)*.24+Math.sin(pz*15.1+px*2)*.1;
    positions.setZ(i,amplitude*ripples*edge);
   }
   geometry.computeVertexNormals();
   geometry.rotateX(-Math.PI/2);
   const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
   mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh;
  };
  const paddedShape=(width:number,height:number,depth:number,x:number,y:number,z:number,material:THREE.Material)=>{
   const geometry=new THREE.SphereGeometry(1,24,18);
   geometry.scale(width*.5,height*.5,depth*.5);
   const mesh=new THREE.Mesh(geometry,material);
   mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  };
  const bedObjectsStart=scene.children.length;
  // Black base and upholstered lower rails, with no visible white slab.
  box(3.36,.31,3.78,2.85,.31,-1.03,black);
  box(3.32,.31,3.70,2.85,.53,-1.03,upholstery);
  // Contiguous tufted upholstery: soft indentations in one continuous padded panel.
  roundBox(3.58,2.04,.32,.24,2.85,1.54,-2.97,upholstery);
  const tuftGeometry=new THREE.PlaneGeometry(3.22,1.68,72,42);
  const tuftPositions=tuftGeometry.attributes.position;
  for(let i=0;i<tuftPositions.count;i++){
   const x=tuftPositions.getX(i),y=tuftPositions.getY(i);
   let inset=0;
   for(let row=0;row<4;row++){
    const cy=-.62+row*.41;
    for(let column=0;column<7;column++){
     const cx=-1.36+column*.455+(row%2?.225:0);
     const dx=(x-cx)/.19,dy=(y-cy)/.19;
     inset+=.052*Math.exp(-1.45*(dx*dx+dy*dy));
    }
   }
   const broadPuff=.014*Math.cos(x*13.8)*Math.cos(y*15.2);
   tuftPositions.setZ(i,.035+broadPuff-inset);
  }
  tuftGeometry.computeVertexNormals();
  const tuftedPanel=new THREE.Mesh(tuftGeometry,upholstery);
  tuftedPanel.position.set(2.85,1.54,-2.783);
  tuftedPanel.castShadow=true;tuftedPanel.receiveShadow=true;scene.add(tuftedPanel);
  const buttonMaterial=mat("#0b0a0e",.85);
  for(let row=0;row<4;row++){
   for(let column=0;column<7;column++){
    const x=-1.36+column*.455+(row%2?.225:0);
    if(Math.abs(x)>1.55)continue;
    const stud=new THREE.Mesh(new THREE.SphereGeometry(.009,10,8),buttonMaterial);
    stud.position.set(2.85+x,1.54-.62+row*.41,-2.815);scene.add(stud);
   }
  }
  // Seamless red duvet. Use a single rounded body and top surface;
  // remove separate hanging planes, which caused visible rectangular tears.
  roundBox(3.24,.22,3.60,.10,2.85,.73,-.99,mat("#21141b",1));
  roundBox(3.23,.31,3.05,.16,2.85,.79,-.51,duvet);
  softSurface(3.12,2.95,2.85,.952,-.51,duvet,.014);
  // Keep the duvet as one closed body. Avoid an intersecting hem at the corner.
  // Pillow loft uses flattened ellipsoids instead of extruded boxes.
  for(const px of [2.13,3.57]){
   const pillow=paddedShape(1.27,.29,.78,px,1.08,-2.18,upholstery);
   pillow.rotation.y=px<3?-.07:.07;
   const seam=new THREE.Mesh(new THREE.TorusGeometry(.38,.012,6,48),mat("#25212a",1));
   seam.scale.set(1.48,.55,1);seam.position.set(px,1.085,-2.18);seam.rotation.x=Math.PI/2;scene.add(seam);
  }
  // Rotated leftward around its physical center; duvet, pillows and headboard stay together.
  const bedGroup=new THREE.Group();
  bedGroup.position.set(2.55,0,-1.0);
  bedGroup.rotation.y=-Math.PI/2;
  scene.add(bedGroup);
  const bedItems=scene.children.slice(bedObjectsStart).filter(item=>item!==bedGroup);
  for(const item of bedItems){
   scene.remove(item);bedGroup.add(item);
   item.position.x-=2.85;item.position.z+=1.0;
  }
  // The former leaning black mirror/door is replaced by a low media unit and large TV.
  // Keep furniture against the left wall, opposite the bed and sofa.
  const consoleWood=mat("#1b171e",.45,.08);
  box(.68,.48,3.1,-4.42,.30,-2.00,consoleWood);
  box(.74,.055,3.2,-4.42,.57,-2.00,mat("#25202b",.23,.12));
  for(const z of [-2.96,-2.03,-1.10]){
   box(.018,.32,.82,-4.072,.31,z,mat("#26212d",.55));
  }
  // Portrait of the display is aligned parallel to the left wall.
  box(.10,1.76,2.82,-4.66,1.72,-2.0,black);
  const tvImage=canvas(ctx=>{
   const g=ctx.createLinearGradient(0,0,512,512);
   g.addColorStop(0,"#283374");g.addColorStop(.48,"#ef7697");g.addColorStop(.72,"#ffb16a");g.addColorStop(1,"#1b1835");
   ctx.fillStyle=g;ctx.fillRect(0,0,512,512);
   ctx.fillStyle="#211b3c";for(let i=0;i<24;i++)ctx.fillRect(i*23,330-(i*27%125),21,250);
  });
  const tvFace=new THREE.Mesh(new THREE.PlaneGeometry(2.71,1.64),new THREE.MeshBasicMaterial({map:tvImage,side:THREE.DoubleSide}));
  tvFace.position.set(-4.58,1.72,-2.0);tvFace.rotation.y=Math.PI/2;scene.add(tvFace);
  const tvFill=new THREE.PointLight("#d45f97",2.8,4);
  tvFill.position.set(-3.9,1.9,-2);scene.add(tvFill);
  // Neon FX ROOM on the right, with actual emissive strokes and wall spill.
  pic(4.87,2.65,-3.22,-Math.PI/2,print("FX","ROOM","#ff38a7"),1.6,1.6);
  const neonPink=new THREE.PointLight("#ff3d9f",7,3.9);neonPink.position.set(4.14,2.85,-3.2);scene.add(neonPink);
  const neonBlue=new THREE.PointLight("#3578ff",5,3.9);neonBlue.position.set(4.23,2.24,-3.4);scene.add(neonBlue);
  // Nightstands and soft amber globe lamps.
  for(const [x,z] of [[1.12,-2.48],[4.51,-2.45]]){
   box(.48,.58,.54,x,.33,z,mat("#1f1921",.45));
   const globe=new THREE.Mesh(new THREE.SphereGeometry(.18,20,14),new THREE.MeshStandardMaterial({color:"#fff1da",emissive:"#ffc18c",emissiveIntensity:2.2}));
   globe.position.set(x,.76,z);scene.add(globe);
   const light=new THREE.PointLight("#ffba89",6,3.5);light.position.copy(globe.position);scene.add(light);
  }
  // Balance colored light without overwhelming the pale walls.
  const redAccent=new THREE.PointLight("#f12b56",7,5);redAccent.position.set(3.85,1.68,-2.6);scene.add(redAccent);
  const coolAccent=new THREE.PointLight("#356bdb",5,5);coolAccent.position.set(-2.9,2.2,-4.15);scene.add(coolAccent);
  // Gentle fill specifically for the sofa, with no changes to hallway lighting.
  const sofaFill=new THREE.PointLight("#f3dae7",12,5.2);sofaFill.position.set(-1.0,2.5,-4.65);scene.add(sofaFill);
  // Optional high-detail GLB furniture. Files are loaded only when they exist.
  // Each slot replaces just its procedural counterpart, preserving all camera keyframes.
  const modelLoader=new GLTFLoader();
  const modelSlots=[
   {name:"bed",file:"/assets/my-room/bed.glb",pos:[2.85,0,-1.05],size:[3.3,2.55,3.9]},
   {name:"sofa",file:"/assets/my-room/sofa.glb",pos:[-.55,0,-5.12],size:[4.15,1.65,1.65]},
   {name:"mirror",file:"/assets/my-room/mirror.glb",pos:[-4.53,0,-3.35],size:[1.3,3,0.4]}
  ] as const;
  // Optional GLB imports are additive for now; detailed layout is retained as fallback.
  // When a vetted model is supplied, it can be enabled by a simple manifest update.
  const loadHighDetailModel=(file:string,position:readonly number[],bounds:readonly number[])=>{
   fetch(file,{method:"HEAD",signal:abort.signal}).then(response=>{
    if(!response.ok||abort.signal.aborted)return;
    modelLoader.load(file,gltf=>{
     if(abort.signal.aborted)return;
     const object=gltf.scene;
     object.updateMatrixWorld(true);
     const cube=new THREE.Box3().setFromObject(object);
     const current=new THREE.Vector3();cube.getSize(current);
     if(current.x<=0||current.y<=0||current.z<=0)return;
     const factor=Math.min(bounds[0]/current.x,bounds[1]/current.y,bounds[2]/current.z);
     object.scale.multiplyScalar(factor);
     object.updateMatrixWorld(true);
     const aligned=new THREE.Box3().setFromObject(object);
     const center=new THREE.Vector3();aligned.getCenter(center);
     object.position.set(position[0]-center.x,position[1]-aligned.min.y,position[2]-center.z);
     object.traverse(node=>{
      if(node instanceof THREE.Mesh){node.castShadow=true;node.receiveShadow=true;}
     });
     scene.add(object);
    },undefined,()=>{ /* Keep procedural room when a GLB cannot be decoded. */ });
   }).catch(()=>{ /* Absent local GLB is optional. */ });
  };
  // GLB slots are disabled until model dimensions and orientation have been approved.
  // To preview a model without altering any procedural objects, enable one slot here.
  const enabledModelSlots:readonly string[]=[];
  for(const slot of modelSlots){
   if(enabledModelSlots.includes(slot.name))loadHighDetailModel(slot.file,slot.pos,slot.size);
  }
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
  return()=>{abort.abort();cancelAnimationFrame(id);ro.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m instanceof THREE.MeshBasicMaterial&&m.map)m.map.dispose();m.dispose()}}});renderer.dispose();el.removeChild(renderer.domElement)};
 },[]);
 return (
 <div className="fx-cinematic-canvas" ref={host} aria-label="Recorrido 3D cinematográfico desde la puerta, por el pasillo, hasta Gallery, Videocalls y Stage" />
 );
}
