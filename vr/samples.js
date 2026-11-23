import * as THREE from 'three';

// Small browser-native arcade samples, independent of the Unity game rules.
export function createSample(id,parent,{box,label,button,targets,onEnd,onRestart}){
  const root=new THREE.Group();root.name=`Playable ${id} sample`;parent.add(root);
  const ownedTargets=[],geometries=new Set(),materials=new Set();
  const startIndex=targets.length;
  const colors=[0x53e6ac,0xb28bff,0xffc25b,0x66bfff,0xff7b9c];
  const cellGeo=new THREE.BoxGeometry(.147,.147,.147);
  const mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.42}));
  const cells=mats.map(mat=>{const m=new THREE.InstancedMesh(cellGeo,mat,150);m.count=0;m.frustumCulled=false;root.add(m);return m;});
  const cellTransform=new THREE.Object3D(),counts=[0,0,0,0,0];
  box(1.85,.06,1.85,new THREE.MeshStandardMaterial({color:0x0c2533}),0,.72,1.04,root);
  const grid=new THREE.GridHelper(1.76,10,0x4ce8d4,0x245160);grid.position.set(0,.755,1.04);root.add(grid);
  let caption,captionText='',score=0,running=false,ended=false,timer=0,notified=false;
  function say(text){if(text===captionText)return;captionText=text;if(caption){root.remove(caption);caption.geometry.dispose();caption.material.map.dispose();caption.material.dispose();}caption=label(text,1400,130,'#ffcb73',50,'#0b1d2b');caption.scale.setScalar(.48);caption.position.set(0,.84,2.15);root.add(caption);if(!notified&&/^(GAME OVER|YOU WIN)/.test(text)){notified=true;onEnd?.({won:text.startsWith('YOU WIN'),score,game:id});}}
  // Coplanar rows cannot hide one another. Shorter buttons sit below the board
  // instead of the old near row filling the user's view and obscuring row one.
  function ctl(text,x,row,fn,width=.55){const b=button(text,x,row<2.4?.52:.22,2.15,fn,root,width);b.scale.y=.5;b.name=text;return b;}
  function draw(points){counts.fill(0);for(const p of points){const c=p.c||0;cellTransform.position.set((p.x-4.5)*.17,.85+(p.y||0)*.15,1.04+(p.z-4.5)*.17);cellTransform.updateMatrix();cells[c].setMatrixAt(counts[c]++,cellTransform.matrix);}cells.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;});}
  let update=()=>{},reset=()=>{};
  if(id==='cubes'){
    let settled=[],piece,x=4,y=10;
    const shapes=[[[0,0]],[[0,0],[1,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1],[1,1]]];
    const valid=(px,py,p=piece)=>p.every(([dx,dy])=>px+dx>=0&&px+dx<10&&py+dy>=0&&py+dy<13&&!settled.some(b=>b.x===px+dx&&b.y===py+dy));
    function spawn(){piece=shapes[Math.floor(Math.random()*shapes.length)].map(p=>[...p]);x=4;y=10;if(!valid(x,y)){running=false;ended=true;say(`GAME OVER / ${score} POINTS / RESTART`);}}
    function render(){draw([...settled.map(b=>({...b,z:4})),...piece.map(([dx,dy])=>({x:x+dx,y:y+dy,z:4,c:1}))]);}
    function step(){if(valid(x,y-1))y--;else{settled.push(...piece.map(([dx,dy])=>({x:x+dx,y:y+dy,c:1})));for(let row=0;row<13;row++){if(settled.filter(b=>b.y===row).length===10){settled=settled.filter(b=>b.y!==row).map(b=>({...b,y:b.y>row?b.y-1:b.y}));score+=10;row--;}}if(score>=30){running=false;ended=true;say('YOU WIN / 30 POINTS / PLAY AGAIN');}else spawn();}render();}
    function move(d){if(running&&valid(x+d,y))x+=d;render();}
    ctl('LEFT',-.65,2.23,()=>move(-1));ctl('RIGHT',0,2.23,()=>move(1));ctl('TURN',.65,2.23,()=>{if(running){const p=piece.map(([dx,dy])=>[-dy,dx]);if(valid(x,y,p))piece=p;}render();});
    ctl('DROP',-.45,2.65,()=>{if(running){while(valid(x,y-1))y--;step();}},.75);
    ctl('START / RESET',.45,2.65,()=>reset(),.85);
    reset=()=>{score=0;settled=[];running=true;ended=false;timer=0;spawn();render();say('CUBES / CLEAR LINES / FIRST TO 30');};
    update=dt=>{if(running){timer+=dt;if(timer>.8){timer=0;step();if(!ended)say(`CUBES / ${score} POINTS / GOAL 30`);}}};
    piece=shapes[1];render();say('CUBES / SELECT START / CLEAR LINES');
  }else if(id==='snake'){
    let snake=[{x:4,z:5},{x:4,z:6}],food={x:4,z:2},dir={x:0,z:-1},next=dir;
    function render(){draw([...snake.map((p,i)=>({...p,c:i?0:3})),{...food,c:2}]);}
    function steer(x,z){if(!running)return;if(x!==-dir.x||z!==-dir.z)next={x,z};}
    ctl('LEFT',-.65,2.23,()=>steer(-1,0));ctl('FORWARD',0,2.23,()=>steer(0,-1));ctl('RIGHT',.65,2.23,()=>steer(1,0));
    ctl('BACK',-.45,2.65,()=>steer(0,1),.75);ctl('START / RESET',.45,2.65,()=>reset(),.85);
    reset=()=>{score=0;snake=[{x:4,z:5},{x:4,z:6}];food={x:4,z:2};dir={x:0,z:-1};next=dir;running=true;ended=false;timer=0;render();say('SNAKE / EAT 5 CUBES');};
    update=dt=>{if(!running)return;timer+=dt;if(timer<.42)return;timer=0;dir=next;const head={x:snake[0].x+dir.x,z:snake[0].z+dir.z};const eating=head.x===food.x&&head.z===food.z;
      if(head.x<0||head.x>9||head.z<0||head.z>9||snake.slice(0,eating?snake.length:-1).some(p=>p.x===head.x&&p.z===head.z)){running=false;ended=true;say(`GAME OVER / ${score} POINTS / RESTART`);return;}
      snake.unshift(head);if(eating){score++;if(score>=5){running=false;say('YOU WIN / 5 POINTS / PLAY AGAIN');}else{const free=[];for(let x=0;x<10;x++)for(let z=0;z<10;z++)if(!snake.some(p=>p.x===x&&p.z===z))free.push({x,z});food=free[Math.floor(Math.random()*free.length)];say(`SNAKE / +1 / ${score} OF 5`);}}else snake.pop();render();};
    render();say('SNAKE / SELECT START / EAT 5 CUBES');
  }else{
    let px=0,bx=0,bz=.1,vx=.45,vz=.7,hits=0,lives=3;
    const paddle=box(.5,.08,.18,mats[3],0,.86,1.75,root);
    const ball= new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),mats[2]);root.add(ball);
    const target=box(.35,.25,.22,mats[1],0,.94,.32,root);
    const aim=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));aim.rotation.x=-Math.PI/2;aim.position.set(0,.78,1.04);root.add(aim);targets.push(aim);
    aim.userData.action=()=>{if(!running)reset();};aim.userData.aim=point=>{const local=root.worldToLocal(point.clone());px=THREE.MathUtils.clamp(local.x,-.63,.63);};
    ctl('LEFT',-.65,2.23,()=>{px=Math.max(-.63,px-.18);});ctl('START / RESET',0,2.23,()=>reset(),.8);ctl('RIGHT',.65,2.23,()=>{px=Math.min(.63,px+.18);});
    reset=()=>{score=0;hits=0;lives=3;bx=0;bz=0;vx=.45;vz=.7;running=true;say('PONGO / AIM AT BOARD TO MOVE PADDLE');};
    update=dt=>{paddle.position.x=px;if(running){bx+=vx*dt;bz+=vz*dt;if(Math.abs(bx)>.76){bx=Math.sign(bx)*.76;vx=-vx;}if(bz<-.73){bz=-.73;vz=Math.abs(vz);if(Math.abs(bx-target.position.x)<.24){score+=10;hits++;target.position.x=[-.48,0,.48][hits%3];say(`PONGO / +10 / ${score} OF 50`);if(score>=50){running=false;say('YOU WIN / 50 POINTS / PLAY AGAIN');}}}if(vz>0&&bz>.58&&bz<.79&&Math.abs(bx-px)<.32){bz=.58;vz=-Math.abs(vz);vx=(bx-px)*2.2;}if(bz>.9){lives--;if(!lives){running=false;say('GAME OVER / SELECT START TO RETRY');}else{bx=0;bz=0;vz=.7;say(`PONGO / ${lives} LIVES / ${score} POINTS`);}}}ball.position.set(bx,.94,1.04+bz);};
    say('PONGO / SELECT START / HIT THE TARGET');update(0);
  }
  const begin=reset;reset=()=>{notified=false;begin();onRestart?.();};
  ownedTargets.push(...targets.slice(startIndex));
  return {root,update,reset,get score(){return score;},dispose(){for(const t of ownedTargets){const i=targets.indexOf(t);if(i>=0)targets.splice(i,1);}root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});parent.remove(root);}};
}
