import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {XRHandModelFactory} from 'three/addons/webxr/XRHandModelFactory.js';

const $ = selector => document.querySelector(selector);
const media = '../assets/november-2026/';
const storeURL = 'https://www.meta.com/en-gb/experiences/tabletop-cubes/7959598814120845/';
const games = {
  cubes: {name:'Cubes',tag:'STACK / CLEAR',color:'#b28bff',image:'cubes-solo.webp',
    description:'Find the fit. Turn colorful pieces, fill lines, and build your next personal best.',
    help:'Solo or Two Player: share a board and compete to complete lines. The full game includes hands, Touch controllers, and guided practice.',
    video:'solo-24s.mp4'},
  snake: {name:'Cube Snake',tag:'EAT / GROW',color:'#53e6ac',image:'snake-solo.webp',
    description:'One more bite. Steer through a 3D grid, chase food, and keep your growing trail out of trouble.',
    help:'Solo or Two Player: chase a shared food cube and avoid both snakes. Try the full game’s animated hand and controller guides.',
    video:'solo-and-online-40s.mp4'},
  pongo: {name:'Pongo',tag:'BOUNCE / AIM',color:'#ffc25b',image:'pongo-solo.webp',
    description:'Find your angle. Bounce the ball toward targets and keep the rally alive.',
    help:'Solo or Two Player: each player controls a paddle and competes to hit the targets. Watch both the virtual room and passthrough in action.',
    video:'multiplayer-two-worlds-30s.mp4'}
};
const canvas = $('#room');
const status = $('#status');
const enterVR = $('#enter-vr');
const dialog = $('#details');
const video = $('#game-video');
let selected = null, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let mixer, companion, textureVideo, viewPoster;
const targets = [], controllers = [], pointers = [], textures = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const rotation = new THREE.Matrix4();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#07131d');
scene.fog = new THREE.Fog('#07131d',10,24);
const camera = new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,50);
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
camera.position.set(4,3.2,7);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.xr.enabled = true;
const controls = new OrbitControls(camera,canvas);
controls.target.set(0,1,-.7); controls.enableDamping=true;
controls.minDistance=3; controls.maxDistance=11;
controls.maxPolarAngle=Math.PI*.48; controls.minPolarAngle=.35;
controls.enablePan=false;
scene.add(new THREE.HemisphereLight('#c8edff','#112c3a',2.6));
const key = new THREE.DirectionalLight('#fff5de',3); key.position.set(3,7,5);scene.add(key);
const rim = new THREE.DirectionalLight('#6ccfff',1.8);rim.position.set(-4,3,-5);scene.add(rim);
const materials = {
  floor:new THREE.MeshStandardMaterial({color:'#081822',roughness:.85}),
  wall:new THREE.MeshStandardMaterial({color:'#102431',roughness:.9}),
  table:new THREE.MeshStandardMaterial({color:'#183343',roughness:.65,metalness:.25}),
  dark:new THREE.MeshStandardMaterial({color:'#06131e',roughness:.8}),
  glow:new THREE.MeshBasicMaterial({color:'#3ad4d0'})
};
function box(w,h,d,mat,x=0,y=0,z=0,parent=scene) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
box(20,.1,20,materials.floor,0,-.05,0);
box(12,5,.15,materials.wall,0,2.5,-4.2);
for (const x of [-5.9,5.9]) box(.15,5,12,materials.wall,x,2.5,0);
const floorGrid=new THREE.GridHelper(18,36,'#2b6c7a','#153442');floorGrid.position.y=.005;scene.add(floorGrid);
box(11,.025,.025,materials.glow,0,1.05,-4.1);
box(11,.025,.025,materials.glow,0,3.8,-4.1);
function label(text,width=1024,height=160,color='#eafafa',size=64,bg=null) {
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d');
  if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${size}px Arial`;
  ctx.fillText(text,width/2,height/2,width-40);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width/400,height/400),new THREE.MeshBasicMaterial({map:texture,transparent:!bg,depthWrite:!!bg}));
}
const roomTitle=label('TABLETOP / ARCADE',1600,180,'#e2f9f8',100);roomTitle.position.set(0,3.25,-4.08);scene.add(roomTitle);
const roomSubtitle=label('THREE GAMES. ONE TABLE.',1400,100,'#62ddd4',42);roomSubtitle.position.set(0,2.88,-4.07);scene.add(roomSubtitle);
const loader=new THREE.TextureLoader();
async function loadTexture(url) {
  if(!textures.has(url))textures.set(url,loader.loadAsync(url).then(t=>{t.colorSpace=THREE.SRGBColorSpace;return t;}));
  return textures.get(url);
}
function interact(mesh,action,parent=scene) {mesh.userData.action=action;targets.push(mesh);parent.add(mesh);return mesh;}
function button(text,x,y,z,action,parent=scene,width=1.0) {
  const mesh=label(text,600,160,'#e4fcfa',50,'#153c4c');
  mesh.scale.set(width/1.5,.9,1);mesh.position.set(x,y,z);interact(mesh,action,parent);return mesh;
}
const tables=[];
for(const [i,id] of ['cubes','snake','pongo'].entries()) {
  const game=games[id], table=new THREE.Group();
  table.position.set((i-1)*2.65,0,i===1?-2.0:-1.3);
  table.rotation.y=(1-i)*.23;scene.add(table);tables.push(table);
  const accent=new THREE.MeshBasicMaterial({color:game.color});
  box(2.25,.12,1.35,materials.table,0,.83,0,table);
  box(.22,.77,.7,materials.dark,-.78,.38,0,table);box(.22,.77,.7,materials.dark,.78,.38,0,table);
  box(2.18,.018,.025,accent,0,.904,.65,table);
  const grid=new THREE.GridHelper(1.15,10,game.color,'#23505c');grid.position.y=.9;table.add(grid);
  const title=label(game.name.toUpperCase(),1000,180,game.color,86);title.position.set(0,2.57,-.3);title.scale.setScalar(.72);table.add(title);
  const caption=label(game.tag,1000,100,'#a8c8d5',42);caption.position.set(0,2.32,-.3);caption.scale.setScalar(.7);table.add(caption);
  box(2.22,1.27,.07,materials.dark,0,1.58,-.29,table);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.12,1.193),new THREE.MeshBasicMaterial({color:'#254854'}));
  screen.position.set(0,1.58,-.24);interact(screen,()=>openGame(id),table);
  loadTexture(media+game.image).then(t=>{screen.material.map=t;screen.material.color.set('white');screen.material.needsUpdate=true;}).catch(()=>status.textContent='Some artwork could not load. You can still explore the game details.');
  button('EXPLORE',0,.99,.70,()=>openGame(id),table,1.3);
}
// A real imported KUBIKOS model, converted to GLB; original UVs and idle keys retained.
const pedestal=box(.95,.5,.85,materials.table,0,.25,.75);
box(.98,.025,.88,materials.glow,0,.51,.75);
const companionLabel=label('MEET YOUR COMPANION',1000,160,'#a4e8e3',43);companionLabel.scale.setScalar(.43);companionLabel.position.set(0,.23,1.19);scene.add(companionLabel);
try {
  const [gltf,atlas]=await Promise.all([new GLTFLoader().loadAsync('assets/penguin.glb'),loadTexture('assets/animal-atlas.webp')]);
  // Export kept the source FBX UVs verbatim without a baked glTF texture.
  // Preserve TextureLoader's vertical flip, matching the original FBX material.
  atlas.flipY=true;
  companion=gltf.scene;
  companion.traverse(o=>{if(o.isMesh){o.material.map=atlas;o.material.needsUpdate=true;}});
  const bounds=new THREE.Box3().setFromObject(companion),size=bounds.getSize(new THREE.Vector3());
  companion.scale.setScalar(.73/size.y);
  const scaled=new THREE.Box3().setFromObject(companion),center=scaled.getCenter(new THREE.Vector3());
  companion.position.set(-center.x,.53-scaled.min.y,.75-center.z);
  scene.add(companion);mixer=new THREE.AnimationMixer(companion);
  if(gltf.animations[0])mixer.clipAction(gltf.animations[0]).play();
  status.textContent='Room ready. Select a game to explore.';
} catch(error) {
  console.warn('Companion could not load',error);
  status.textContent='Game displays ready. The companion could not load this time.';
}

// In-world viewer: interactive even when browser HTML is hidden in immersive VR.
const viewer=new THREE.Group();viewer.position.set(0,0,1.05);viewer.visible=false;scene.add(viewer);
box(2.8,3.1,.06,materials.dark,0,1.7,0,viewer);
let viewerTitle=label('GAMEPLAY',1100,160,'#e7ffff',64);viewerTitle.position.set(0,2.99,.045);viewer.add(viewerTitle);
const videoScreen=new THREE.Mesh(new THREE.PlaneGeometry(2.56,1.44),new THREE.MeshBasicMaterial({color:'white'}));videoScreen.position.set(0,1.99,.05);viewer.add(videoScreen);
const viewerHint=label('REAL GAMEPLAY / FULL GAME ON META QUEST',1300,100,'#90c8cd',34);viewerHint.scale.setScalar(.75);viewerHint.position.set(0,1.20,.06);viewer.add(viewerHint);
button('PLAY / PAUSE',-.68,.87,.07,()=>toggleVideo(),viewer,1.14);
button('SOUND',.68,.87,.07,()=>{video.muted=!video.muted;},viewer,1.14);
button('CLOSE',-.68,.43,.07,closeGame,viewer,1.14);
button('META STORE',.68,.43,.07,async()=>{await renderer.xr.getSession()?.end();location.href=storeURL;},viewer,1.14);
textureVideo=new THREE.VideoTexture(video);textureVideo.colorSpace=THREE.SRGBColorSpace;
async function openGame(id) {
  const game=games[id];if(!game)return;
  video.pause();selected=id;
  video.removeAttribute('src');video.load();video.poster=media+game.image;
  $('#detail-title').textContent=game.name;$('#detail-description').textContent=game.description;$('#detail-help').textContent=game.help;
  $('#watch-video').textContent='Watch gameplay';
  viewer.remove(viewerTitle);viewerTitle.geometry.dispose();viewerTitle.material.map.dispose();viewerTitle.material.dispose();
  viewerTitle=label(game.name.toUpperCase(),1100,160,game.color,70);viewerTitle.position.set(0,2.99,.045);viewer.add(viewerTitle);
  viewer.visible=renderer.xr.isPresenting;
  viewPoster=await loadTexture(media+game.image).catch(()=>null);
  if(selected!==id)return;
  videoScreen.material.map=viewPoster;videoScreen.material.needsUpdate=true;
  if(!renderer.xr.isPresenting&&!dialog.open)dialog.showModal();
}
async function toggleVideo() {
  if(!selected)return;
  if(!video.getAttribute('src')){video.src=media+games[selected].video;video.load();}
  if(video.paused){
    try {await video.play();videoScreen.material.map=textureVideo;videoScreen.material.needsUpdate=true;$('#watch-video').textContent='Pause gameplay';}
    catch(error){status.textContent='Playback was blocked. Select Play on the video to try again.';console.warn(error);}
  } else {video.pause();$('#watch-video').textContent='Continue gameplay';}
}
function closeGame() {video.pause();video.removeAttribute('src');video.load();viewer.visible=false;selected=null;if(dialog.open)dialog.close();}
$('#watch-video').addEventListener('click',toggleVideo);
$('#close-details').addEventListener('click',closeGame);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeGame();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeGame();}});
document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
function resetView(){if(renderer.xr.isPresenting)return;camera.position.set(4,3.2,7);controls.target.set(0,1,-.7);controls.update();}
$('#reset-view').addEventListener('click',resetView);
function motionUI() {$('#motion').textContent=paused?'Resume animation':'Pause animation';$('#motion').setAttribute('aria-pressed',String(paused));}
motionUI();$('#motion').addEventListener('click',()=>{paused=!paused;motionUI();});
let downX=0,downY=0;
canvas.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
const activeTargets=[], hitResults=[];
function hits() {
  activeTargets.length=0;hitResults.length=0;
  for(const t of targets){let p=t,visible=true,inViewer=false;while(p){if(p===viewer)inViewer=true;if(!p.visible){visible=false;break;}p=p.parent;}if(visible&&(!viewer.visible||inViewer))activeTargets.push(t);}
  return raycaster.intersectObjects(activeTargets,false,hitResults);
}
canvas.addEventListener('pointerup',e=>{
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>7||dialog.open)return;
  pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  hits()[0]?.object.userData.action();
});

// Both tracked input sources use the same ray selection path. WebXR hand select
// events correspond to the browser's pinch gesture when hand tracking is supported.
const handFactory=new XRHandModelFactory();
for(let i=0;i<2;i++) {
  const controller=renderer.xr.getController(i);rig.add(controller);controllers.push(controller);
  controller.addEventListener('select',()=>{castController(controller);hits()[0]?.object.userData.action();});
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:'#72fff1'}));
  line.scale.z=5;controller.add(line);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:'#f1fffa',depthTest:false}));dot.visible=false;scene.add(dot);pointers.push({line,dot});
  const hand=renderer.xr.getHand(i);hand.add(handFactory.createHandModel(hand,'spheres'));rig.add(hand);
  const grip=renderer.xr.getControllerGrip(i);rig.add(grip);
  // Lightweight controller marker avoids another model download in the room.
  box(.035,.035,.09,materials.glow,0,0,0,grip);
}
function castController(controller) {rotation.identity().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation);}
let desktopPose;
renderer.xr.addEventListener('sessionstart',()=>{
  desktopPose={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
  controls.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();rig.position.set(0,0,3.65);
  document.body.classList.add('xr-active');if(dialog.open)dialog.close();closeGame();
  enterVR.textContent='Exit VR';
});
renderer.xr.addEventListener('sessionend',()=>{
  rig.position.set(0,0,0);if(desktopPose){camera.position.copy(desktopPose.position);camera.quaternion.copy(desktopPose.quaternion);}
  controls.enabled=true;controls.update();document.body.classList.remove('xr-active');closeGame();
  pointers.forEach(p=>p.dot.visible=false);enterVR.textContent='Enter VR';
});
enterVR.addEventListener('click',async()=>{
  if(renderer.xr.isPresenting){await renderer.xr.getSession().end();return;}
  enterVR.disabled=true;
  try {
    const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','hand-tracking']});
    await renderer.xr.setSession(session);
  } catch(error){status.textContent='VR could not start. Check headset browser permissions and try again.';console.warn(error);}
  finally{enterVR.disabled=false;}
});
try {
  const supported=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');
  enterVR.disabled=!supported;enterVR.textContent=supported?'Enter VR':'Explore in 3D';
  if(!supported)status.textContent='Drag to explore here. Open this page in a supported headset browser for VR.';
} catch {enterVR.textContent='Explore in 3D';enterVR.disabled=true;}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
let previousTime=performance.now();
renderer.setAnimationLoop(time=>{
  const delta=Math.min(Math.max((time-previousTime)/1000,0),.05);previousTime=time;
  if(!document.hidden){
    if(!paused)mixer?.update(delta);
    if(!renderer.xr.isPresenting)controls.update();
    else for(let i=0;i<controllers.length;i++) {
      castController(controllers[i]);const hit=hits()[0],p=pointers[i];
      p.dot.visible=!!hit&&controllers[i].visible;
      p.line.scale.z=hit?hit.distance:4;
      if(hit)p.dot.position.copy(hit.point);
    }
    renderer.render(scene,camera);
  }
});
// Development/device checks can inspect cost without logging every frame.
window.tabletopShowroom={renderer,scene,games,openGame,closeGame,get selected(){return selected;}};
