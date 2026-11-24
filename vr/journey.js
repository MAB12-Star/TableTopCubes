import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const JOURNEY_BEAT=60/127;
export const JOURNEY_TIMES={arrival:8*JOURNEY_BEAT+.052,boarding:16*JOURNEY_BEAT+.052,inside:60*JOURNEY_BEAT+.052,finalHit:80*JOURNEY_BEAT+.052,end:40};
const names=['Penguin','Crocodile','WhiteFox','Tiger','Unicorn','Hedgehog','Elephant','Giraffe','Racoon','Gorilla','WhiteBear','Rhino'];
const stations=[-4.6,0,4.6];
const clamp=THREE.MathUtils.clamp;
export function journeyPath(t,mode){
  if(t<JOURNEY_TIMES.inside){const u=clamp((t-JOURNEY_TIMES.boarding)/(JOURNEY_TIMES.inside-JOURNEY_TIMES.boarding),0,1);const smooth=u*u*(3-2*u);return{x:0,y:mode==='follow'?.76*clamp((smooth-.72)/.24,0,1):0,z:mode==='follow'?5.5-17*smooth:5.5};}
  const u=clamp((t-JOURNEY_TIMES.inside)/8,0,1);return{x:0,y:0,z:mode==='follow'?10-2*u:10};
}
// Indexed, softly beveled cube: 108 triangles shared by all scenery instances.
export function journeyCube(){
  const p=[],normals=[],indices=[],n=3;
  for(const axis of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)]){
    const u=Math.abs(axis.y)>.5?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),v=new THREE.Vector3().crossVectors(axis,u),start=p.length/3;
    for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const q=axis.clone().multiplyScalar(.5).addScaledVector(u,x/n-.5).addScaledVector(v,y/n-.5);const inner=q.clone().clampScalar(-.43,.43),normal=q.clone().sub(inner).normalize();p.push(...inner.addScaledVector(normal,.07).toArray());normals.push(...normal.toArray());}
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=start+y*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);g.computeBoundingSphere();return g;
}

export function createAnimalJourney({scene,camera,rig,renderer,label,button,targets,audio,roomObjects,onFinish=()=>{},track=()=>{},assetBase='assets/journey/',fetchSet=globalThis.fetch,loadModel,loadAtlas}={}){
  const world=new THREE.Group();world.name='Animal journey / 3D world';world.visible=false;scene.add(world);
  const forest=new THREE.Group(),ship=new THREE.Group(),arcade=new THREE.Group();forest.name='Journey forest';ship.name='Journey ship';arcade.name='Journey arcade';
  forest.rotation.y=arcade.rotation.y=Math.PI;world.add(forest,arcade);forest.add(ship);ship.position.z=13;
  const groups={forest,ship,arcade},geometry=journeyCube(),actors=[],resources=[];
  let state='idle',mode='still',elapsed=0,loadPromise,token=0,snapshot,placement=true,inside=false,fadeTime=0;
  const trackingOffset=new THREE.Vector3();
  const hud=new THREE.Group();hud.name='Journey controls';hud.position.set(0,-.22,-1.8);hud.scale.setScalar(.72);hud.visible=false;camera.add(hud);
  let heading=label('PREPARING YOUR ADVENTURE',1100,140,'#80eee0',54,'#071b27');heading.scale.setScalar(.72);heading.position.y=.72;hud.add(heading);
  const hint=label('LOOK AROUND / CHOOSE YOUR VIEW',1100,100,'#d6e7ee',35,'#071b27');hint.scale.setScalar(.72);hint.position.y=.42;hud.add(hint);
  const choiceFollow=button('FOLLOW THE ANIMALS',0,.09,.01,()=>choose('follow'),hud,1.65);
  const choiceStill=button('STAY IN PLACE',0,-.31,.01,()=>choose('still'),hud,1.65);
  const skip=button('SKIP TO ARCADE',0,-.72,.01,()=>finish('skip'),hud,1.65);
  const music=button('MUSIC ON / OFF',0,-1.12,.01,()=>audio.toggleMusic(),hud,1.65);
  for(const b of [choiceFollow,choiceStill,skip,music])b.userData.journeyAction=true;
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:0,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  veil.position.z=-.16;veil.renderOrder=10000;veil.frustumCulled=false;camera.add(veil);
  function title(text){const face=label(text,1100,140,'#80eee0',54,'#071b27');heading.material.map.dispose();heading.material.map=face.material.map;heading.material.needsUpdate=true;face.geometry.dispose();face.material.dispose();}
  function mesh(size,position,material,parent=arcade){const m=new THREE.Mesh(geometry,material);m.scale.set(...size);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const gameMats=['#279fb7','#e9ac45','#8a50d6','#5cb963'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.1}));
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),gameMats[1]);arcade.add(ball);
  const paddles=[mesh([.84,.13,.62],[-5.25,1.29,-.35],gameMats[0]),mesh([.84,.13,.62],[-3.95,1.29,-.35],gameMats[2])];
  const pieces=new THREE.Group();pieces.position.set(.5,3,-.2);arcade.add(pieces);for(const p of [[0,0,0],[0,.43,0],[0,.86,0],[.43,0,0]])mesh([.4,.4,.4],p,gameMats[0],pieces);
  for(let i=0;i<17;i++)mesh([.4,.4,.4],[-1.1+(i%6)*.43,1.3+Math.floor(i/6)*.43,.6],gameMats[i%3]);
  const snake=Array.from({length:10},(_,i)=>mesh([.3,.3,.3],[4.6,1.45,0],gameMats[i?3:1]));
  const targetCubes=Array.from({length:3},(_,i)=>mesh([.4,.4,.4],[-4.6+(i-1)*.87,2.8+(i%2)*.5,.25],gameMats[2]));
  mesh([.27,.27,.27],[5.4,1.65,-.4],gameMats[2]);
  const moonMat=new THREE.MeshBasicMaterial({color:'#fff0be'});mesh([3.3,3.3,3.3],[10,17,36],moonMat,forest);
  const lamp=new THREE.PointLight('#ffb25e',4,10,2);lamp.position.set(0,2.4,-11.2);world.add(lamp);
  const castFill=new THREE.PointLight('#b9dce3',2,18,2);world.add(castFill);
  const stars=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#9ddeed'}),90);const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  for(let i=0;i<90;i++){const a=i*2.39996;matrix.compose(new THREE.Vector3(Math.cos(a)*40,12+(i%14),Math.sin(a)*40),q,new THREE.Vector3(.035,.035,.035));stars.setMatrixAt(i,matrix);}forest.add(stars);
  for(let i=0;i<3;i++){const text=label(['PONGO','TABLETOP CUBES','CUBE SNAKE'][i],1100,140,['#ffc76b','#b794ff','#7bdfa0'][i],64);text.scale.setScalar(.95);text.position.set(stations[i],3.7,4.98);text.rotation.y=Math.PI;arcade.add(text);}
  const modelLoader=loadModel??(url=>new GLTFLoader().loadAsync(url));
  const textureLoader=loadAtlas??(()=>new THREE.TextureLoader().loadAsync('assets/animal-atlas.webp'));
  function resetRig(a){for(const s of a.rest){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);}}
  function pose(a,kind,clock){
    resetRig(a);if(a.current!==kind){a.mixer.stopAllAction();a.actions[kind].reset().play();a.current=kind;}
    const clip=a.clips[kind];a.mixer.setTime(THREE.MathUtils.euclideanModulo(clock,clip.duration));a.model.updateMatrixWorld(true);
  }
  function point(a,p,look){a.root.position.copy(p);const d=look.clone().sub(p);d.y=0;if(d.lengthSq()>.00001)a.root.rotation.y=Math.atan2(d.x,d.z);a.root.updateMatrixWorld(true);}
  function press(a,i,b){
    if(a.body)a.body.rotation.z+=Math.sin(b*Math.PI)*.025;
    for(let k=0;k<a.paws.length;k++){const pulse=Math.max(0,1-THREE.MathUtils.euclideanModulo(b-((Math.floor(i/3)+k)%2),2)/.38)**2;const p=a.paws[k];p.rotation.x-=pulse*.22;p.position.y+=pulse*2.5;}
    a.root.updateMatrixWorld(true);
  }
  async function load(){
    const response=await fetchSet(assetBase+'world.json');if(!response.ok)throw Error('Journey scenery unavailable');const data=await response.json();
    const mats=data.materials.map(m=>{const c=new THREE.Color().setRGB(...m.color,THREE.SRGBColorSpace),e=new THREE.Color().setRGB(...m.emission);return new THREE.MeshStandardMaterial({color:c,emissive:e,metalness:Math.min(.55,m.metalness),roughness:Math.max(.4,m.roughness)});});resources.push(...mats);
    for(const batch of data.batches){const count=batch.matrices.length/16;const group=groups[batch.group];if(!group)continue;const node=new THREE.InstancedMesh(geometry,mats[batch.material],count);node.name='Journey batch / '+batch.group;for(let i=0;i<count;i++)node.setMatrixAt(i,new THREE.Matrix4().fromArray(batch.matrices,i*16));node.castShadow=true;node.receiveShadow=true;node.computeBoundingSphere();group.add(node);}
    const atlas=await textureLoader();atlas.colorSpace=THREE.SRGBColorSpace;atlas.flipY=true;resources.push(atlas);
    const gltfs=await Promise.all(names.map(n=>modelLoader(assetBase+'animals/'+n.toLowerCase()+'.glb')));
    for(let i=0;i<gltfs.length;i++){
      const gltf=gltfs[i],root=new THREE.Group(),model=gltf.scene;root.name='Journey animal / '+names[i];root.add(model);arcade.add(root);
      model.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({map:atlas,roughness:.72});o.castShadow=true;o.frustumCulled=false;}});
      const mixer=new THREE.AnimationMixer(model),clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c])),actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
      if(!clips.Idle||!clips.Walk)throw Error('Missing original animal animation');actions.Idle.play();mixer.setTime(0);root.updateMatrixWorld(true);
      const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o);});const eyes=bones.filter(o=>o.name.startsWith('Eye_')),body=bones.find(o=>o.name==='Body');
      world.updateMatrixWorld(true);
      if(eyes.length&&body){const eye=root.worldToLocal(eyes.reduce((v,o)=>v.add(o.getWorldPosition(new THREE.Vector3())),new THREE.Vector3()).multiplyScalar(1/eyes.length)).sub(root.worldToLocal(body.getWorldPosition(new THREE.Vector3())));if(Math.hypot(eye.x,eye.z)>.001)model.rotateY(-Math.atan2(eye.x,eye.z));}
      root.updateMatrixWorld(true);let bounds=new THREE.Box3().setFromObject(model,true).applyMatrix4(root.matrixWorld.clone().invert());const scale=data.actors[i].height/bounds.getSize(new THREE.Vector3()).y;model.scale.multiplyScalar(scale);root.updateMatrixWorld(true);bounds.setFromObject(model,true).applyMatrix4(root.matrixWorld.clone().invert());const center=bounds.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-bounds.min.y,-center.z));
      const a={root,model,mixer,clips,actions,current:'Idle',body,paws:bones.filter(o=>o.name.startsWith('LegFront_')||o.name.startsWith('Wing_')),rest:bones.map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()})),seat:new THREE.Vector3(...data.actors[i].position)};
      actors.push(a);
    }
    // Verify browser-imported heads too; FBX and glTF coordinate conventions can differ.
    for(let i=0;i<actors.length;i++){
      const a=actors[i],st=new THREE.Vector3(stations[i%3],0,0),sign=i<6?-1:1;
      for(let pass=0;pass<5;pass++){
        let gap=100;for(const time of [0,.22,.5,.8,1.1]){pose(a,'Idle',time);point(a,st.clone().add(a.seat),st);const bounds=new THREE.Box3().setFromObject(a.model,true).applyMatrix4(arcade.matrixWorld.clone().invert());gap=Math.min(gap,sign<0?-1.675-bounds.max.z:bounds.min.z-1.675);}
        if(gap>=.16)break;a.seat.z+=sign*(.18-gap);if(pass===4)throw Error('Animal clearance could not be prepared');
      }
    }
    updateWorld(0);
    if(renderer.compileAsync){
      // Compile outside the visible scene so loading cannot flash the set into the arcade.
      const warmScene=new THREE.Scene();warmScene.environment=scene.environment;warmScene.environmentIntensity=.25;warmScene.fog=new THREE.FogExp2('#193f4c',.009);
      for(const node of scene.children)if(node.isLight)warmScene.add(node.clone());
      scene.remove(world);world.visible=true;
      try{await renderer.compileAsync(world,camera,warmScene);}finally{world.visible=false;scene.add(world);}
    }
    return data;
  }
  function prepareView(){
    if(!placement)return;const head=camera.getWorldPosition(new THREE.Vector3());if(head.y<.3)return;
    rig.position.x-=head.x;rig.position.z+=5.5-head.z;rig.position.y+=Math.max(0,1.6-head.y);rig.updateMatrixWorld(true);trackingOffset.copy(rig.position).sub(new THREE.Vector3(0,0,5.5));placement=false;
  }
  function hideRoom(){snapshot={nodes:roomObjects.map(o=>[o,o.visible]),background:scene.background,fog:scene.fog,far:camera.far,rig:rig.position.clone(),environment:scene.environmentIntensity};for(const[o]of snapshot.nodes)o.visible=false;scene.background=new THREE.Color('#071f32');scene.fog=new THREE.FogExp2('#193f4c',.009);scene.environmentIntensity=.25;camera.far=160;camera.updateProjectionMatrix();}
  async function start(){
    if(!renderer.xr.isPresenting)return false;if(state!=='idle')return false;const current=++token;state='loading';hud.visible=true;choiceFollow.visible=choiceStill.visible=false;title('PREPARING YOUR ADVENTURE');track('vr-journey-open');
    try{loadPromise??=load();await loadPromise;if(current!==token||!renderer.xr.isPresenting)return false;hideRoom();state='prompt';world.visible=true;arcade.visible=false;forest.visible=true;placement=true;elapsed=0;updateWorld(0);title('STEP INTO THE CUBE FOREST');choiceFollow.visible=choiceStill.visible=true;veil.material.opacity=1;return true;}
    catch(e){console.warn('Animal journey could not load',e);if(current===token){title('JOURNEY UNAVAILABLE / SKIP TO ARCADE');track('vr-journey-load-error');}return false;}
  }
  function choose(value){if(state!=='prompt')return;prepareView();mode=value;state='running';elapsed=0;inside=false;choiceFollow.visible=choiceStill.visible=false;title(mode==='follow'?'FOLLOWING THE ANIMALS':'LOOK AROUND THE FOREST');audio.setMusicSource?.(assetBase+'journey-finale.mp3',()=>elapsed);audio.unlock();track('vr-journey-'+mode);}
  function restore(){world.visible=false;hud.visible=false;if(snapshot){for(const[o,visible]of snapshot.nodes)o.visible=visible;scene.background=snapshot.background;scene.fog=snapshot.fog;scene.environmentIntensity=snapshot.environment;camera.far=snapshot.far;camera.updateProjectionMatrix();rig.position.copy(snapshot.rig);rig.updateMatrixWorld(true);snapshot=undefined;}audio.setMusicSource?.('assets/audio/arcade-music.mp3');}
  function finish(reason='complete'){if(state==='idle')return;++token;restore();state='outro';fadeTime=0;veil.material.opacity=1;track('vr-journey-'+reason);onFinish(reason);}
  function stop(){++token;restore();state='idle';veil.material.opacity=0;}
  function pathPoint(points,p){const lengths=points.slice(1).map((v,i)=>v.distanceTo(points[i])),total=lengths.reduce((a,b)=>a+b,0);let distance=clamp(p,0,1)*total;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1)return points[i].clone().lerp(points[i+1],clamp(distance/lengths[i],0,1));distance-=lengths[i];}return points.at(-1).clone();}
  function updateWorld(t){
    if(!actors.length)return;const b=(t-.052)/JOURNEY_BEAT,arcadePhase=t>=JOURNEY_TIMES.inside;forest.visible=!arcadePhase;arcade.visible=arcadePhase;
    const land=clamp((t-JOURNEY_TIMES.arrival)/(JOURNEY_TIMES.boarding-JOURNEY_TIMES.arrival),0,1);ship.position.y=t<JOURNEY_TIMES.arrival?18:18*(1-land)**2;
    lamp.position.y=arcadePhase?2.4:2.4+ship.position.y;
    for(let i=0;i<actors.length;i++){
      const a=actors[i];let p,look,kind='Idle';const st=new THREE.Vector3(stations[i%3],0,0);
      if(arcadePhase){arcade.add(a.root);p=st.clone().add(a.seat);look=st;pose(a,kind,THREE.MathUtils.euclideanModulo(b/4+i*.125,1)*a.clips.Idle.duration);point(a,p,look);press(a,i,b);}
      else{
        forest.add(a.root);const start=new THREE.Vector3((i%4-1.5)*1.6,0,-1.6+Math.floor(i/4)*2-JOURNEY_TIMES.arrival*.2);
        if(t<JOURNEY_TIMES.arrival){p=start.clone().add(new THREE.Vector3(0,0,(JOURNEY_TIMES.arrival-t)*.2));look=p.clone().add(new THREE.Vector3(0,0,-1));kind='Walk';}
        else if(t<JOURNEY_TIMES.boarding){p=start.clone();look=new THREE.Vector3(0,0,13);}
        else{const progress=clamp((t-JOURNEY_TIMES.boarding-(2-Math.floor(i/4))*2*JOURNEY_BEAT)/(28*JOURNEY_BEAT),0,1),lane=(i%4-1.5)*.93;const points=[start,new THREE.Vector3(lane,0,5.9),new THREE.Vector3(lane,.76,10.1),new THREE.Vector3(lane,.76,12.5+Math.floor(i/4)*1.05)];p=pathPoint(points,progress);look=pathPoint(points,Math.min(1,progress+.02));kind=progress>0&&progress<1?'Walk':'Idle';}
        const clock=kind==='Walk'?THREE.MathUtils.euclideanModulo(b/2+(i%2)*.5,1)*a.clips.Walk.duration:t*.7;pose(a,kind,clock);point(a,p,look);
      }
    }
    const f=THREE.MathUtils.euclideanModulo(b,1),beat=Math.floor(b);for(let i=0;i<2;i++)paddles[i].rotation.x=-Math.max(0,1-THREE.MathUtils.euclideanModulo(b-i,2)/.38)*.12;
    ball.position.set(-4.6+THREE.MathUtils.lerp(beat%2? .65:-.65,beat%2?-.65:.65,f),1.45+Math.sin(Math.PI*f)*1.5,-.35+Math.sin(Math.PI*f)*.6);
    targetCubes.forEach((o,i)=>{o.rotation.y=b*.2+i;o.visible=!(i===((beat%3)+3)%3&&f>.5);});pieces.position.y=3.25-THREE.MathUtils.euclideanModulo(b,4)/4*1.4;pieces.rotation.y=Math.floor(b/2)*Math.PI/2;
    snake.forEach((o,i)=>{const angle=(b-i*.46)*Math.PI/4;o.position.set(4.6+Math.sin(angle)*1.02,1.45+.24*(.5+.5*Math.sin(angle*1.5)),Math.cos(angle)*1.02);});
  }
  function tick(delta){
    if(state==='idle')return;if(state==='outro'){fadeTime+=delta;veil.material.opacity=Math.max(0,1-fadeTime/.45);if(fadeTime>=.45)state='idle';return;}
    if(state==='loading')return;prepareView();
    if(state==='prompt'){veil.material.opacity=Math.max(0,veil.material.opacity-delta*2);return;}
    elapsed+=delta;if(!audio.music?.paused&&audio.music?.currentTime>0)elapsed=Math.max(elapsed,audio.music.currentTime);
    if(elapsed>=JOURNEY_TIMES.end){finish();return;}
    const crossing=Math.abs(elapsed-JOURNEY_TIMES.inside);veil.material.opacity=Math.max(Math.max(0,1-elapsed/.55),clamp(1-crossing/.5,0,1),clamp((elapsed-(JOURNEY_TIMES.end-.4))/.4,0,1));
    const path=journeyPath(elapsed,mode),head=camera.getWorldPosition(new THREE.Vector3());
    if(elapsed>=JOURNEY_TIMES.inside&&!inside){inside=true;title('WELCOME TO GAME NIGHT');}
    if(!placement){rig.position.copy(trackingOffset).add(new THREE.Vector3(path.x,path.y,path.z));rig.updateMatrixWorld(true);}
    castFill.position.copy(camera.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(-1,2,-2));updateWorld(elapsed);
  }
  return{start,choose,finish,stop,tick,get active(){return state!=='idle';},get state(){return state;},get mode(){return mode;},get elapsed(){return elapsed;},get world(){return world;},get actors(){return actors;},get hud(){return hud;},get controls(){return{follow:choiceFollow,still:choiceStill,skip,music};}};
}
