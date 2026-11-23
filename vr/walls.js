import * as THREE from 'three';
const titles={cubes:'CUBES',snake:'CUBE SNAKE',pongo:'PONGO'};
const endpoint='https://raw.githubusercontent.com/MAB12-Star/TableTopCubes/leaderboard-data/leaderboard.json';
const animals=['Penguin','Crocodile','White Fox','Tiger','Unicorn','Hedgehog','Elephant','Giraffe','Raccoon','Gorilla','White Bear','Rhino'];
export function normalizeScores(snapshot){
  const result={};
  for(const id of Object.keys(titles))result[id]=(Array.isArray(snapshot?.scores?.[id])?snapshot.scores[id]:[])
    .filter(r=>Number.isFinite(Number(r.points))&&Number(r.points)>=0)
    .map(r=>({name:String(r.name||'Player').replace(/[\u0000-\u001f]/g,' ').slice(0,64),points:Number(r.points),icon:Number.isInteger(r.profileIcon)&&r.profileIcon>=0&&r.profileIcon<12?r.profileIcon:null}))
    .sort((a,b)=>b.points-a.points).slice(0,5);
  return result;
}
export function installScoreWalls(scene){
  const panels=[];
  for(const side of [-1,1])for(const [i,id] of Object.keys(titles).entries()){
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.15,2.87),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    mesh.name=`${side<0?'Leaderboard':'Champion'} / ${id}`;
    mesh.position.set(side*5.80,2.12,(i-1)*2.65);mesh.rotation.y=-side*Math.PI/2;scene.add(mesh);
    panels.push({side,id,canvas,texture});
  }
  const image=new Image();let atlasReady=false,data=null,failed=false,updated='';
  function text(ctx,value,x,y,size,color='#eefafa',align='left',max=760){ctx.fillStyle=color;ctx.font=`700 ${size}px Arial`;ctx.textAlign=align;ctx.fillText(value,x,y,max);}
  function icon(ctx,id,x,y,size){
    if(atlasReady&&id!==null)ctx.drawImage(image,(id%4)*256,Math.floor(id/4)*256,256,256,x,y,size,size);
    else {ctx.fillStyle='#183444';ctx.fillRect(x,y,size,size);text(ctx,'?',x+size/2,y+size*.70,size*.60,'#8ca9b7','center',size);}
  }
  function trophy(ctx,x,y,size){
    ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.strokeStyle='#ffc25b';ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(15,22,17,0,Math.PI*2);ctx.arc(85,22,17,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#ffcf6d';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(88,0);ctx.lineTo(78,40);ctx.quadraticCurveTo(50,73,22,40);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e5a83e';ctx.fillRect(44,52,12,27);ctx.fillRect(25,78,50,11);ctx.fillStyle='#ffe4a5';ctx.fillRect(17,0,66,5);ctx.restore();
  }
  function paint(){
    for(const panel of panels){const c=panel.canvas.getContext('2d');c.fillStyle='#060c13';c.fillRect(0,0,900,1200);c.strokeStyle='#244653';c.lineWidth=7;c.strokeRect(5,5,890,1190);c.fillStyle='#4df2e0';c.fillRect(30,28,840,6);
      text(c,panel.side<0?'TOP 5 / '+titles[panel.id]:'HIGH-SCORE CHAMPION',450,110,49,'#4df2e0','center');
      const rows=data?.[panel.id]||[];
      if(!rows.length){text(c,failed?'RANKINGS UNAVAILABLE':data?'BE THE FIRST TO SCORE':'CONNECTING TO RANKINGS',450,560,39,'#adc5d1','center');}
      else if(panel.side<0){
        rows.forEach((r,i)=>{const y=230+i*157;icon(c,r.icon,85,y-62,112);text(c,String(i+1),40,y+8,34,'#ffc25b','center',40);text(c,r.name,220,y,35,'#eefafa','left',610);text(c,`${r.points.toLocaleString()} POINTS`,220,y+51,33,'#ffc25b');});
      }else{
        const winner=rows[0];text(c,titles[panel.id],450,191,63,'#ffc25b','center');
        icon(c,winner.icon,200,255,500);trophy(c,555,590,210);
        text(c,winner.name,450,888,47,'#eefafa','center');text(c,`${winner.points.toLocaleString()} POINTS`,450,970,65,'#ffc25b','center');
        text(c,winner.icon===null?'PLAYER ICON NOT SET':animals[winner.icon].toUpperCase(),450,1045,27,'#adc5d1','center');
      }
      text(c,updated?'SCORES UPDATED '+updated:'FULL-GAME SCORES / NOT MINI SAMPLES',450,1146,22,'#8ca9b7','center');panel.texture.needsUpdate=true;
    }
  }
  image.onload=()=>{atlasReady=true;paint();};image.onerror=()=>paint();image.src='assets/player-portraits.webp';paint();
  async function refresh(){
    try{const response=await fetch(endpoint,{credentials:'omit',cache:'no-cache'});if(!response.ok)throw Error('Scores unavailable');const snapshot=await response.json();data=normalizeScores(snapshot);failed=false;
      const date=new Date(snapshot.updated);updated=Number.isNaN(date.valueOf())?'':date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    }catch{failed=true;}paint();
  }
  refresh();const interval=setInterval(()=>{if(!document.hidden)refresh();},300000);
  return {panels,refresh,dispose(){clearInterval(interval);panels.forEach(p=>p.texture.dispose());}};
}
