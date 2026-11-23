import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {XRHandModelFactory} from 'three/addons/webxr/XRHandModelFactory.js';
import {createSample} from './samples.js';

const $ = selector => document.querySelector(selector);
const media = '../assets/november-2026/';
const storeURL = 'https://www.meta.com/en-gb/experiences/tabletop-cubes/7959598814120845/';
const itchURL = 'https://mab12-star.itch.io/tabletop-cubes';
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
let sample;
const targets = [], controllers = [], pointers = [], textures = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const rotation = new THREE.Matrix4();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#060c13');
const camera = new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,50);
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
camera.position.set(3,2.8,5.1);
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
// Port of TableTopVirtualRoom.BuildRoom: same 12m shell, ceiling, wall bays,
// half-meter floor grid, and trim. Four batches rather than separate objects.
const roomBoxes={shell:[],panels:[],grid:[],lights:[]};
const addRoomBox=(kind,x,y,z,w,h,d)=>roomBoxes[kind].push({x,y,z,w,h,d});
addRoomBox('shell',0,-.05,0,12,.1,12);
addRoomBox('shell',0,4.55,0,12,.1,12);
for(const side of [-1,1]){
  const edge=side*6,inner=side*5.91;
  addRoomBox('shell',edge,2.25,0,.1,4.5,12);addRoomBox('shell',0,2.25,edge,12,4.5,.1);
  addRoomBox('lights',inner,3.45,0,.025,.024,11.8);addRoomBox('lights',0,3.45,inner,11.8,.024,.025);
  for(let slot=-4;slot<=4;slot+=2){
    addRoomBox('panels',inner,1.8,slot,.08,2.5,1.8);addRoomBox('panels',slot,1.8,inner,1.8,2.5,.08);
    addRoomBox('grid',inner*.99,.67,slot,.025,.035,1.56);addRoomBox('grid',slot,.67,inner*.99,1.56,.035,.025);
  }
}
for(let line=-11;line<=11;line++){
  addRoomBox('grid',line*.5,.003,0,.012,.006,11.8);addRoomBox('grid',0,.003,line*.5,11.8,.006,.012);
}
const roomColors={shell:[.025,.047,.075],panels:[.047,.085,.125],grid:[.09,.23,.27],lights:[.14,.55,.55]};
const unitBox=new THREE.BoxGeometry(1,1,1),instanceTransform=new THREE.Object3D();
for(const [kind,boxes] of Object.entries(roomBoxes)){
  const color=new THREE.Color().setRGB(...roomColors[kind],THREE.SRGBColorSpace);
  const batch=new THREE.InstancedMesh(unitBox,new THREE.MeshBasicMaterial({color,toneMapped:false}),boxes.length);batch.name=`Game room / ${kind}`;
  boxes.forEach((b,i)=>{instanceTransform.position.set(b.x,b.y,b.z);instanceTransform.scale.set(b.w,b.h,b.d);instanceTransform.updateMatrix();batch.setMatrixAt(i,instanceTransform.matrix);});
  batch.computeBoundingSphere();scene.add(batch);
}
function label(text,width=1024,height=160,color='#eafafa',size=64,bg=null) {
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d');
  if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${size}px Arial`;
  ctx.fillText(text,width/2,height/2,width-40);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width/400,height/400),new THREE.MeshBasicMaterial({map:texture,transparent:!bg,depthWrite:!!bg}));
}
const roomTitle=label('TABLETOP / ARCADE',1600,180,'#e2f9f8',100);roomTitle.position.set(0,3.25,-5.84);scene.add(roomTitle);
const roomSubtitle=label('THREE GAMES. ONE TABLE.',1400,100,'#62ddd4',42);roomSubtitle.position.set(0,2.88,-5.83);scene.add(roomSubtitle);
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
  const playRing=new THREE.Mesh(new THREE.CircleGeometry(.20,32),new THREE.MeshBasicMaterial({color:'#4df2e0'}));playRing.position.set(0,1.02,.71);interact(playRing,()=>openGame(id),table);
  const playText=label('PLAY',400,120,'#06131d',64);playText.scale.setScalar(.32);playText.position.set(0,1.02,.72);table.add(playText);
}
// A real imported KUBIKOS model, converted to GLB; original UVs and idle keys retained.
const pedestal=box(.95,.5,.85,materials.table,0,.25,.75);
box(.98,.025,.88,materials.glow,0,.51,.75);
const companionLabel=label('MEET YOUR COMPANION',1000,160,'#a4e8e3',43);companionLabel.scale.setScalar(.43);companionLabel.position.set(0,.23,1.19);scene.add(companionLabel);
// Fixed destinations stay in clear floor space, outside tables and the pedestal.
const teleportSpots=[
  {name:'WELCOME',x:0,z:3.65},
  {name:'CUBES',x:-2.65,z:1.8},
  {name:'SNAKE',x:0,z:1.8},
  {name:'PONGO',x:2.65,z:1.8}
];
const teleportGroup=new THREE.Group();teleportGroup.visible=false;scene.add(teleportGroup);
const headPosition=new THREE.Vector3(),headForward=new THREE.Vector3();
let lastTeleport=-Infinity;
// The application's camera is parented to the rig and receives the tracked pose
// from WebXRManager. getWorldPosition on the detached ArrayCamera overwrites its
// composed matrixWorld with a local pose, losing the rig offset after teleport.
function getHeadPosition(){return camera.getWorldPosition(headPosition);}
function teleportTo(spot){
  if(!renderer.xr.isPresenting||viewer.visible||!teleportSpots.includes(spot)||performance.now()-lastTeleport<400)return false;
  const head=getHeadPosition();
  // Subtract the tracked room offset: the user's head lands at the marker,
  // including after walking physically away from the tracking-space origin.
  rig.position.x+=spot.x-head.x;rig.position.z+=spot.z-head.z;
  rig.updateMatrixWorld(true);lastTeleport=performance.now();
  pointers.forEach(p=>p.dot.visible=false);
  return true;
}
for(const spot of teleportSpots){
  const pad=new THREE.Group();pad.position.set(spot.x,.018,spot.z);teleportGroup.add(pad);spot.pad=pad;
  const disk=new THREE.Mesh(new THREE.CircleGeometry(.46,32),new THREE.MeshBasicMaterial({color:'#3ad4d0',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));
  disk.rotation.x=-Math.PI/2;disk.userData.teleport=true;interact(disk,()=>teleportTo(spot),pad);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.36,.40,32),new THREE.MeshBasicMaterial({color:'#73efe1',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.003;pad.add(ring);
  const name=label(spot.name,800,140,'#e0fffa',100);name.rotation.x=-Math.PI/2;name.scale.setScalar(.38);name.position.y=.006;pad.add(name);
}
const teleportHelp=label('MOVE: POINT AT A FLOOR RING / PINCH OR TRIGGER',1800,100,'#a6d6db',44);
teleportHelp.position.set(0,2.58,-5.82);teleportGroup.add(teleportHelp);
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
box(2.8,2.7,.06,materials.dark,0,2.4,0,viewer);
box(2.72,.025,.025,materials.glow,0,3.72,.04,viewer);
let viewerTitle=label('GAMEPLAY',1100,160,'#4df2e0',64);viewerTitle.position.set(0,3.5,.045);viewer.add(viewerTitle);
const videoScreen=new THREE.Mesh(new THREE.PlaneGeometry(2.56,1.44),new THREE.MeshBasicMaterial({color:'white'}));videoScreen.position.set(0,2.55,.05);viewer.add(videoScreen);
const viewerHint=label('TRY THE SAMPLE / FULL GAME ON META QUEST',1300,100,'#ffcb73',34);viewerHint.scale.setScalar(.75);viewerHint.position.set(0,1.72,.06);viewer.add(viewerHint);
button('VIDEO',-1.02,1.40,.07,()=>toggleVideo(),viewer,.6);
button('SOUND',-.34,1.40,.07,()=>{video.muted=!video.muted;},viewer,.6);
button('CLOSE',.34,1.40,.07,closeGame,viewer,.6);
button('GET GAME',1.02,1.40,.07,async()=>{await renderer.xr.getSession()?.end();location.href=storeURL;},viewer,.6);
textureVideo=new THREE.VideoTexture(video);textureVideo.colorSpace=THREE.SRGBColorSpace;
const purchase=new THREE.Group();purchase.position.z=1.55;purchase.visible=false;viewer.add(purchase);
box(2.5,2.0,.06,materials.dark,0,1.75,0,purchase);
const purchaseHeading=label('KEEP PLAYING THE FULL GAME',1200,150,'#4df2e0',54);purchaseHeading.scale.setScalar(.75);purchaseHeading.position.set(0,2.48,.05);purchase.add(purchaseHeading);
let purchaseScore;
button('META STORE',-.59,1.91,.07,()=>visitStore(storeURL),purchase,1.05);
button('ITCH.IO',.59,1.91,.07,()=>visitStore(itchURL),purchase,1.05);
button('PLAY AGAIN',-.59,1.40,.07,()=>sample?.reset(),purchase,1.05);
button('BACK TO ROOM',.59,1.40,.07,closeGame,purchase,1.05);
async function visitStore(url){video.pause();const session=renderer.xr.getSession();if(session)await session.end();location.href=url;}
function endSample(result){
  sample.root.visible=false;purchase.visible=true;
  if(purchaseScore){purchase.remove(purchaseScore);purchaseScore.geometry.dispose();purchaseScore.material.map.dispose();purchaseScore.material.dispose();}
  const text=`${result.won?'YOU WIN':'SAMPLE OVER'} / ${result.score} POINTS`;
  purchaseScore=label(text,1100,120,'#ffc25b',50);purchaseScore.scale.setScalar(.75);purchaseScore.position.set(0,2.22,.05);purchase.add(purchaseScore);
  $('#sample-result-title').textContent=text;$('#sample-result').hidden=false;
  if(!renderer.xr.isPresenting)$('#buy-meta').focus();
}
function resumeSample(){purchase.visible=false;$('#sample-result').hidden=true;if(sample)sample.root.visible=true;}
$('#buy-meta').addEventListener('click',()=>visitStore(storeURL));
$('#buy-itch').addEventListener('click',()=>visitStore(itchURL));
$('#sample-again').addEventListener('click',()=>sample?.reset());
$('#sample-back').addEventListener('click',closeGame);
async function openGame(id) {
  const game=games[id];if(!game)return;
  sample?.dispose();sample=null;
  purchase.visible=false;$('#sample-result').hidden=true;
  tables.forEach((t,i)=>t.visible=['cubes','snake','pongo'][i]!==id);
  video.pause();selected=id;
  video.removeAttribute('src');video.load();video.poster=media+game.image;
  $('#detail-title').textContent=game.name;$('#detail-description').textContent=game.description;$('#detail-help').textContent=game.help;
  $('#watch-video').textContent='Watch gameplay';
  viewer.remove(viewerTitle);viewerTitle.geometry.dispose();viewerTitle.material.map.dispose();viewerTitle.material.dispose();
  viewerTitle=label('TABLETOP / '+game.name.toUpperCase(),1100,160,'#4df2e0',60);viewerTitle.position.set(0,3.5,.045);viewer.add(viewerTitle);
  viewer.visible=true;
  sample=createSample(id,viewer,{box,label,button,targets,onEnd:endSample,onRestart:resumeSample});
  if(renderer.xr.isPresenting){
    const head=getHeadPosition();camera.getWorldDirection(headForward);headForward.y=0;
    if(headForward.lengthSq()<.01)headForward.set(0,0,-1);else headForward.normalize();
    // Fit the whole exhibit to the tracked eye height, seated or standing,
    // without changing the headset camera or its physical tracking origin.
    const fit=THREE.MathUtils.clamp(head.y/1.65,.45,1.2);
    viewer.scale.setScalar(fit);
    viewer.position.set(head.x+headForward.x*3.3*fit,head.y-1.65*fit,head.z+headForward.z*3.3*fit);
    viewer.rotation.y=Math.atan2(-headForward.x,-headForward.z);
  }else{
    viewer.scale.setScalar(1);viewer.position.set(0,0,-1.7);viewer.rotation.y=0;
  }
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
function closeGame() {video.pause();video.removeAttribute('src');video.load();sample?.dispose();sample=null;purchase.visible=false;$('#sample-result').hidden=true;tables.forEach(t=>t.visible=true);viewer.visible=false;selected=null;document.body.classList.remove('sample-active');if(dialog.open)dialog.close();}
$('#play-sample').addEventListener('click',()=>{dialog.close();document.body.classList.add('sample-active');camera.position.set(0,2.7,3.0);controls.target.set(0,1.5,.1);controls.update();});
$('#watch-video').addEventListener('click',toggleVideo);
$('#close-details').addEventListener('click',closeGame);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeGame();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeGame();}});
document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
function resetView(){if(renderer.xr.isPresenting)return;camera.position.set(3,2.8,5.1);controls.target.set(0,1,-.7);controls.update();}
$('#reset-view').addEventListener('click',resetView);
function motionUI() {$('#motion').textContent=paused?'Resume animation':'Pause animation';$('#motion').setAttribute('aria-pressed',String(paused));}
motionUI();$('#motion').addEventListener('click',()=>{paused=!paused;motionUI();});
let downX=0,downY=0;
canvas.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
canvas.addEventListener('pointermove',e=>{if(dialog.open)return;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const h=hits()[0];h?.object.userData.aim?.(h.point);});
const activeTargets=[], hitResults=[];
function hits() {
  activeTargets.length=0;hitResults.length=0;
  for(const t of targets){let p=t,visible=true,inViewer=false,inPurchase=false;while(p){if(p===viewer)inViewer=true;if(p===purchase)inPurchase=true;if(!p.visible){visible=false;break;}p=p.parent;}if(visible&&(!viewer.visible||inViewer)&&(!purchase.visible||inPurchase))activeTargets.push(t);}
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
  teleportGroup.visible=true;lastTeleport=-Infinity;
  document.body.classList.add('xr-active');if(dialog.open)dialog.close();closeGame();
  enterVR.textContent='Exit VR';
});
renderer.xr.addEventListener('sessionend',()=>{
  rig.position.set(0,0,0);if(desktopPose){camera.position.copy(desktopPose.position);camera.quaternion.copy(desktopPose.quaternion);}
  controls.enabled=true;controls.update();document.body.classList.remove('xr-active');closeGame();
  teleportGroup.visible=false;
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
    if(!document.hidden&&!dialog.open)sample?.update(delta);
    if(!renderer.xr.isPresenting){
      controls.update();
      camera.position.x=THREE.MathUtils.clamp(camera.position.x,-5.65,5.65);
      camera.position.z=THREE.MathUtils.clamp(camera.position.z,-5.65,5.65);
      camera.position.y=THREE.MathUtils.clamp(camera.position.y,.3,4.3);
    }
    else {
      const head=getHeadPosition();
      for(const spot of teleportSpots)spot.pad.visible=!viewer.visible&&Math.hypot(head.x-spot.x,head.z-spot.z)>.6;
      for(let i=0;i<controllers.length;i++) {
        castController(controllers[i]);const hit=hits()[0],p=pointers[i];
        p.dot.visible=!!hit&&controllers[i].visible;
        p.line.scale.z=hit?hit.distance:4;
        if(hit)p.dot.position.copy(hit.point);
        hit?.object.userData.aim?.(hit.point);
      }
    }
    renderer.render(scene,camera);
  }
});
// Development/device checks can inspect cost without logging every frame.
window.tabletopShowroom={renderer,scene,games,openGame,closeGame,teleportTo,teleportSpots,get sample(){return sample;},get selected(){return selected;}};
