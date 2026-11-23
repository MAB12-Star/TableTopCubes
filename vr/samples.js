import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createPongoSample} from './pongo-sample.js';

// Small browser-native arcade samples, independent of the Unity game rules.
export function createSample(id,parent,{box,label,button,targets,onEnd,onRestart,onBack,onClose}){
  const root=new THREE.Group();root.name=`Playable ${id} sample`;parent.add(root);
  const ownedTargets=[],geometries=new Set(),materials=new Set();
  const startIndex=targets.length;
  const colors=[0x53e6ac,0xb28bff,0xffc25b,0x66bfff,0xff7b9c];
  const cellGeo=new RoundedBoxGeometry(.147,.147,.147,1,.014);
  const mats=colors.map(color=>new THREE.MeshPhysicalMaterial({color,roughness:.38,metalness:.10,clearcoat:.18,clearcoatRoughness:.4}));
  const cells=mats.map(mat=>{const m=new THREE.InstancedMesh(cellGeo,mat,1400);m.count=0;m.frustumCulled=false;m.castShadow=true;root.add(m);return m;});
  const cellTransform=new THREE.Object3D(),counts=[0,0,0,0,0];
  const deck=box(1.85,.06,1.85,new THREE.MeshStandardMaterial({color:0x0c2533,metalness:.35,roughness:.32}),0,.72,1.04,root);
  deck.geometry.dispose();deck.geometry=new RoundedBoxGeometry(1.85,.06,1.85,2,.025);
  const trim=new THREE.MeshBasicMaterial({color:0x4de4d3});
  for(const x of [-.91,.91])box(.018,.012,1.82,trim,x,.75,1.04,root);
  for(const z of [.13,1.95])box(1.82,.012,.018,trim,0,.75,z,root);
  const grid=new THREE.GridHelper(1.76,10,0x4ce8d4,0x245160);grid.position.set(0,.755,1.04);root.add(grid);
  if(id!=='cubes'){
    const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.76,id==='snake'?1.5:1.9,1.76)),new THREE.LineBasicMaterial({color:'#4b8495',transparent:true,opacity:.25,toneMapped:false}));
    cage.position.set(0,id==='snake'?1.5:1.7,1.04);root.add(cage);
  }
  let caption,captionText='',score=0,running=false,ended=false,timer=0,notified=false;
  function say(text){if(text===captionText)return;captionText=text;if(caption){root.remove(caption);caption.geometry.dispose();caption.material.map.dispose();caption.material.dispose();}caption=label(text,1400,130,'#ffcb73',50,'#0b1d2b');caption.scale.setScalar(.48);caption.position.set(0,.84,2.15);root.add(caption);if(!notified&&/^(GAME OVER|YOU WIN)/.test(text)){notified=true;onEnd?.({won:text.startsWith('YOU WIN'),score,game:id});}}
  // Coplanar rows cannot hide one another. Shorter buttons sit below the board
  // instead of the old near row filling the user's view and obscuring row one.
  function ctl(text,x,row,fn,width=.55){const b=button(text,x,row<2.4?.52:.22,2.15,fn,root,width);b.scale.y=.5;b.name=text;return b;}
  function draw(points){counts.fill(0);for(const p of points){const c=p.c||0;cellTransform.position.set((p.x-4.5)*.17,.85+(p.y||0)*.15,1.04+(p.z-4.5)*.17);cellTransform.updateMatrix();cells[c].setMatrixAt(counts[c]++,cellTransform.matrix);}cells.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;});}
  let update=()=>{},reset=()=>{},state=()=>({}),turnLeft=()=>{};
  if(id==='cubes'){
    let settled=[],piece,x=4,y=10,z=4;
    const shapes=[[[0,0]],[[0,0],[1,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1],[1,1]]];
    const valid=(px,py,p=piece,pz=z)=>pz>=0&&pz<10&&p.every(([dx,dy])=>px+dx>=0&&px+dx<10&&py+dy>=0&&py+dy<13&&!settled.some(b=>b.x===px+dx&&b.y===py+dy&&b.z===pz));
    function spawn(){piece=shapes[Math.floor(Math.random()*shapes.length)].map(p=>[...p]);x=4;y=10;z=4;if(!valid(x,y)){running=false;ended=true;say(`GAME OVER / ${score} POINTS / RESTART`);}}
    function render(){draw([...settled,...piece.map(([dx,dy])=>({x:x+dx,y:y+dy,z,c:1}))]);}
    function step(){if(valid(x,y-1))y--;else{settled.push(...piece.map(([dx,dy])=>({x:x+dx,y:y+dy,z,c:1})));for(let row=0;row<13;row++){if(settled.filter(b=>b.y===row&&b.z===z).length===10){settled=settled.filter(b=>b.y!==row||b.z!==z).map(b=>({...b,y:b.z===z&&b.y>row?b.y-1:b.y}));score+=10;row--;}}if(score>=30){running=false;ended=true;say('YOU WIN / 30 POINTS / PLAY AGAIN');}else spawn();}render();}
    function move(d){if(running&&valid(x+d,y))x+=d;render();}
    turnLeft=()=>{if(running){const p=piece.map(([dx,dy])=>[dy,-dx]);if(valid(x,y,p))piece=p;}render();};
    ctl('LEFT',-.65,2.23,()=>move(-1));ctl('RIGHT',0,2.23,()=>move(1));ctl('TURN',.65,2.23,()=>{if(running){const p=piece.map(([dx,dy])=>[-dy,dx]);if(valid(x,y,p))piece=p;}render();});
    ctl('DROP',-.45,2.65,()=>{if(running){while(valid(x,y-1))y--;step();}},.75);
    ctl('START / RESET',.45,2.65,()=>reset(),.85);
    for(const [text,d,py] of [['FORWARD',-1,.52],['BACK',1,.22]]){const b=button(text,-1.4,py,2.15,()=>{if(running&&valid(x,y,piece,z+d))z+=d;render();},root,.65);b.scale.y=.5;b.name=text;}
    reset=()=>{score=0;settled=[];running=true;ended=false;timer=0;spawn();render();say('CUBES / CLEAR LINES / FIRST TO 30');};
    update=dt=>{if(running){timer+=dt;if(timer>.8){timer=0;step();if(!ended)say(`CUBES / ${score} POINTS / GOAL 30`);}}};
    piece=shapes[1];render();say('CUBES / SELECT START / CLEAR LINES');
    state=()=>({x,y,z,settled:settled.map(b=>({...b}))});
  }else if(id==='snake'){
    let snake=[{x:4,y:0,z:5},{x:4,y:0,z:6}],food={x:4,y:0,z:2},dir={x:0,y:0,z:-1},next=dir;
    function render(){draw([...snake.map((p,i)=>({...p,c:i?0:3})),{...food,c:2}]);}
    function steer(x,z,y=0){if(!running)return;if(x!==-dir.x||z!==-dir.z||y!==-dir.y)next={x,y,z};}
    ctl('LEFT',-.65,2.23,()=>steer(-1,0));ctl('FORWARD',0,2.23,()=>steer(0,-1));ctl('RIGHT',.65,2.23,()=>steer(1,0));
    ctl('BACK',-.45,2.65,()=>steer(0,1),.75);ctl('START / RESET',.45,2.65,()=>reset(),.85);
    for(const [text,d,py] of [['UP',1,.52],['DOWN',-1,.22]]){const b=button(text,-1.4,py,2.15,()=>steer(0,0,d),root,.65);b.scale.y=.5;b.name=text;}
    reset=()=>{score=0;snake=[{x:4,y:0,z:5},{x:4,y:0,z:6}];food={x:4,y:0,z:2};dir={x:0,y:0,z:-1};next=dir;running=true;ended=false;timer=0;render();say('3D SNAKE / EAT 5 / UP AND DOWN TO CLIMB');};
    update=dt=>{if(!running)return;timer+=dt;if(timer<.42)return;timer=0;dir=next;const head={x:(snake[0].x+dir.x+10)%10,y:(snake[0].y+dir.y+10)%10,z:(snake[0].z+dir.z+10)%10};const eating=head.x===food.x&&head.y===food.y&&head.z===food.z;
      if(snake.slice(0,eating?snake.length:-1).some(p=>p.x===head.x&&p.y===head.y&&p.z===head.z)){running=false;ended=true;say(`GAME OVER / ${score} POINTS / RESTART`);return;}
      snake.unshift(head);if(eating){score++;if(score>=5){running=false;say('YOU WIN / 5 POINTS / PLAY AGAIN');}else{const free=[];for(let x=0;x<10;x++)for(let y=0;y<10;y++)for(let z=0;z<10;z++)if(!snake.some(p=>p.x===x&&p.y===y&&p.z===z))free.push({x,y,z});food=free[Math.floor(Math.random()*free.length)];say(`SNAKE / +1 / ${score} OF 5`);}}else snake.pop();render();};
    render();say('SNAKE / SELECT START / EAT 5 CUBES');
    state=()=>({snake:snake.map(p=>({...p})),food:{...food},dir:{...dir}});
  }else{
    const pongo=createPongoSample(root,{box,label,mats,ctl,button,say,targets,restart:()=>reset(),onScore:value=>score=value});
    update=pongo.update;reset=pongo.reset;state=()=>pongo.state;
  }

  const back=button('STEP BACK',1.45,.52,2.15,()=>onBack?.(),root,.52);back.scale.y=.4;back.name='STEP BACK';
  const close=button('BACK TO ROOM',1.45,.22,2.15,()=>onClose?.(),root,.7);close.scale.y=.5;close.name='BACK TO ROOM';
  const begin=reset;reset=()=>{notified=false;begin();onRestart?.();};
  ownedTargets.push(...targets.slice(startIndex));
  return {root,update,reset,command(name){if(name==='TURN LEFT')turnLeft();else root.getObjectByName(name)?.userData.action?.();},get running(){return running;},get state(){return state();},get score(){return score;},dispose(){for(const t of ownedTargets){const i=targets.indexOf(t);if(i>=0)targets.splice(i,1);}root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});parent.remove(root);}};
}
