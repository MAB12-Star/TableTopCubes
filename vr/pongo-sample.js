import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Browser implementation of the solo game's core rules: constant-speed 3D
// flight, horizontal tiltable paddle, reflective side/ceiling bounds, open
// bottom, three 1.35/1/.65 targets worth 5/10/15, trail and landing marker.
export function createPongoSample(root,{box,label,mats,ctl,button,say,targets,restart,onScore}){
  let running=false,score=0,lives=3,accumulator=0,armed=false,px=0,pz=1.04,tiltX=0,tiltZ=0,time=0;
  const position=new THREE.Vector3(0,2.35,1.04),velocity=new THREE.Vector3(0,-1.3,0),normal=new THREE.Vector3(0,1,0);
  const radius=.065,speed=1.3,paddlePosition=new THREE.Vector3(0,.87,1.04);
  const paddle=box(.50,.08,.36,mats[3],0,.87,1.04,root);paddle.name='3D Pongo paddle';paddle.geometry.dispose();paddle.geometry=new RoundedBoxGeometry(.50,.08,.36,2,.025);paddle.castShadow=true;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(radius,16,10),mats[3]);ball.castShadow=true;ball.name='3D Pongo ball';root.add(ball);
  const targetActors=[1.35,1,.65].map((scale,i)=>{const width=.25*scale,mesh=box(width,width,width,mats[1],(i-1)*.50,1.75+i*.24,.70+(i%2)*.48,root);mesh.geometry.dispose();mesh.geometry=new RoundedBoxGeometry(width,width,width,1,.015);mesh.castShadow=true;return{mesh,width,points:[5,10,15][i],cooldown:0};});
  const marker=new THREE.Mesh(new THREE.RingGeometry(.09,.105,32),new THREE.MeshBasicMaterial({color:'#69dacc',transparent:true,opacity:.6,side:THREE.DoubleSide,toneMapped:false}));marker.rotation.x=-Math.PI/2;root.add(marker);
  marker.name='Pongo predicted landing circle';
  const trailData=new Float32Array(24*3),trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailData,3));trailGeometry.setDrawRange(0,0);
  const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#67bdff',transparent:true,opacity:.5,toneMapped:false}));trail.name='Pongo ball trail';trail.frustumCulled=false;root.add(trail);let trailCount=0;
  const shards=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.035,.035),mats[1],12);shards.count=0;shards.frustumCulled=false;root.add(shards);let burstTime=0;const burstOrigin=new THREE.Vector3(),transform=new THREE.Object3D();
  let pointText,pointLife=0;
  const aim=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));aim.rotation.x=-Math.PI/2;aim.position.set(0,.87,1.04);root.add(aim);targets.push(aim);
  const q=new THREE.Quaternion(),inverse=new THREE.Quaternion(),up=new THREE.Vector3();
  aim.userData.action=()=>{if(!running)restart();};
  aim.userData.aim=(point,source)=>{const p=root.worldToLocal(point.clone());px=THREE.MathUtils.clamp(p.x,-.58,.58);pz=THREE.MathUtils.clamp(p.z,.46,1.62);if(source){source.getWorldQuaternion(q);root.getWorldQuaternion(inverse).invert();up.set(0,1,0).applyQuaternion(q).applyQuaternion(inverse);tiltX=THREE.MathUtils.clamp(up.x/Math.max(.35,Math.abs(up.y)),-.3,.3);tiltZ=THREE.MathUtils.clamp(up.z/Math.max(.35,Math.abs(up.y)),-.3,.3);}};
  ctl('LEFT',-.65,2.23,()=>px=Math.max(-.58,px-.16));ctl('FORWARD',0,2.23,()=>pz=Math.max(.46,pz-.16));ctl('RIGHT',.65,2.23,()=>px=Math.min(.58,px+.16));
  ctl('BACK',-.45,2.65,()=>pz=Math.min(1.62,pz+.16),.75);ctl('START / RESET',.45,2.65,restart,.85);
  for(const [text,sign,y] of [['TILT LEFT',-1,.52],['TILT RIGHT',1,.22]]){const b=button(text,-1.4,y,2.15,()=>tiltX=sign*.25,root,.65);b.scale.y=.5;b.name=text;}
  const previous=new THREE.Vector3(),delta=new THREE.Vector3(),contact=new THREE.Vector3(),offset=new THREE.Vector3(),ray=new THREE.Ray(),bounds=new THREE.Box3(),half=new THREE.Vector3(),bounceNormal=new THREE.Vector3();
  function serve(){position.set(px,2.35,pz);velocity.set(0,-speed,0);armed=false;trailCount=0;trailGeometry.setDrawRange(0,0);}
  function reset(){score=0;onScore(score);lives=3;running=true;accumulator=0;px=0;pz=1.04;tiltX=0;tiltZ=0;shards.count=0;targetActors.forEach((t,i)=>{t.cooldown=0;t.mesh.visible=true;t.mesh.position.set((i-1)*.50,1.75+i*.24,.70+(i%2)*.48);});serve();say('3D PONGO / BOUNCE UP / 3 TARGETS / GOAL 50');}
  function reflect(n){if(velocity.dot(n)<0)velocity.reflect(n);velocity.setLength(speed);}
  function tick(dt){
    previous.copy(position);position.addScaledVector(velocity,dt);
    for(const [axis,min,max] of [['x',-.82,.82],['z',.22,1.86],['y',-Infinity,2.65]]){if(position[axis]<min||position[axis]>max){position[axis]=THREE.MathUtils.clamp(position[axis],min,max);velocity[axis]*=-1;}}
    normal.set(tiltX,1,tiltZ).normalize();
    const denominator=velocity.dot(normal),distance=offset.copy(paddlePosition).sub(previous).dot(normal)+radius+.04;
    const hitTime=denominator<0?distance/denominator:-1;
    if(hitTime>=0&&hitTime<=dt){
      contact.copy(previous).addScaledVector(velocity,hitTime);offset.copy(contact).sub(paddlePosition).applyQuaternion(q.copy(paddle.quaternion).invert());
      if(Math.abs(offset.x)<=.25+radius&&Math.abs(offset.z)<=.18+radius){
        reflect(normal);offset.copy(contact).sub(paddlePosition).multiplyScalar(3).clampLength(0,1);offset.addScaledVector(normal,-offset.dot(normal));
        velocity.normalize().addScaledVector(normal,.35).addScaledVector(offset,.65).normalize().multiplyScalar(speed);
        if(velocity.dot(normal)<speed*.35){const planar=velocity.clone().addScaledVector(normal,-velocity.dot(normal)).normalize();velocity.copy(planar).multiplyScalar(.93675).addScaledVector(normal,.35).normalize().multiplyScalar(speed);}
        position.copy(contact).addScaledVector(normal,.003).addScaledVector(velocity,dt-hitTime);armed=true;
      }
    }
    if(armed){
      delta.copy(position).sub(previous);const length=delta.length();if(length>0)ray.set(previous,delta.multiplyScalar(1/length));
      for(const t of targetActors){if(t.cooldown>0)continue;half.setScalar(t.width*.5+radius);bounds.set(t.mesh.position.clone().sub(half),t.mesh.position.clone().add(half));const hit=ray.intersectBox(bounds,contact);if(!hit||contact.distanceTo(previous)>length+.0001)continue;
        const faces=[['x',bounds.min.x,-1],['x',bounds.max.x,1],['y',bounds.min.y,-1],['y',bounds.max.y,1],['z',bounds.min.z,-1],['z',bounds.max.z,1]].sort((a,b)=>Math.abs(contact[a[0]]-a[1])-Math.abs(contact[b[0]]-b[1]));bounceNormal.set(0,0,0);bounceNormal[faces[0][0]]=faces[0][2];reflect(bounceNormal);position.copy(contact).addScaledVector(bounceNormal,.003);
        score+=t.points;onScore(score);t.cooldown=.55;t.mesh.visible=false;burstTime=.55;burstOrigin.copy(t.mesh.position);say(`PONGO / +${t.points} / ${score} OF 50`);
        if(pointText){root.remove(pointText);pointText.geometry.dispose();pointText.material.map.dispose();pointText.material.dispose();}
        pointText=label(`+${t.points}`,400,140,'#ffc25b',100);pointText.scale.setScalar(.35);pointText.position.copy(t.mesh.position);pointText.position.y+=.25;root.add(pointText);pointLife=.8;
        if(score>=50){running=false;say('YOU WIN / 50 POINTS / PLAY AGAIN');}break;
      }
    }
    if(position.y<.64){lives--;if(!lives){running=false;say(`GAME OVER / ${score} POINTS / RESTART`);}else{serve();say(`PONGO / ${lives} LIVES / ${score} POINTS`);}}
  }
  function fold(value,min,max){const span=max-min;let t=((value-min)%(2*span)+2*span)%(2*span);return min+(t>span?2*span-t:t);}
  function update(dt){
    if(pointText){pointLife-=dt;pointText.visible=pointLife>0;pointText.position.y+=dt*.15;}
    time+=dt;paddlePosition.x=THREE.MathUtils.lerp(paddlePosition.x,px,Math.min(1,dt*18));paddlePosition.z=THREE.MathUtils.lerp(paddlePosition.z,pz,Math.min(1,dt*18));paddle.position.copy(paddlePosition);normal.set(tiltX,1,tiltZ).normalize();paddle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    if(running){for(const t of targetActors)if(t.cooldown>0){t.cooldown-=dt;if(t.cooldown<=0){t.mesh.visible=true;t.mesh.position.x=(Math.random()-.5)*1.15;t.mesh.position.z=.52+Math.random()*.95;}}
      accumulator+=Math.min(dt,.1);while(accumulator>=1/180&&running){tick(1/180);accumulator-=1/180;}
      trailData.copyWithin(3,0,69);trailData.set(position.toArray(),0);trailCount=Math.min(24,trailCount+1);trailGeometry.setDrawRange(0,trailCount);trailGeometry.attributes.position.needsUpdate=true;
    }
    ball.position.copy(position);marker.visible=running&&velocity.y<-.01;
    if(marker.visible){const t=(paddlePosition.y+radius+.04-position.y)/velocity.y;marker.visible=t>=0;if(t>=0)marker.position.set(fold(position.x+velocity.x*t,-.82,.82),.78,fold(position.z+velocity.z*t,.22,1.86));}
    if(burstTime>0){burstTime-=dt;shards.count=12;const age=.55-burstTime;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;transform.position.copy(burstOrigin).add(new THREE.Vector3(Math.cos(a)*age*.6,age*.4-age*age,Math.sin(a)*age*.6));transform.scale.setScalar(Math.max(.01,burstTime/.55));transform.rotation.set(age*3,a,age*2);transform.updateMatrix();shards.setMatrixAt(i,transform.matrix);}shards.instanceMatrix.needsUpdate=true;}else shards.count=0;
  }
  ball.position.copy(position);say('3D PONGO / SELECT START / AIM AT THE BOARD');
  return {reset,update,get state(){return{ball:position.toArray(),velocity:velocity.toArray(),paddle:paddlePosition.toArray(),normal:normal.toArray(),lives,armed,targets:targetActors.map(t=>({position:t.mesh.position.toArray(),width:t.width,points:t.points,visible:t.mesh.visible}))};}};
}
