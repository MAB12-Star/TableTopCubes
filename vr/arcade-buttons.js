import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const ARCADE_ACCENTS={room:'#4df2e0',cubes:'#b28bff',snake:'#53e6ac',pongo:'#ffc25b'};

function shape(ctx,x,y,w,h,cut=12){
  ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);
  ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);
  ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();
}
function glyph(ctx,text){
  ctx.save();ctx.translate(63,80);ctx.strokeStyle='#effffc';ctx.fillStyle='#effffc';ctx.lineWidth=4;
  ctx.lineCap='round';ctx.lineJoin='round';
  const path=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  if(/MUSIC/.test(text)){
    path([[-10,9],[-10,-15],[13,-20],[13,4]]);path([[-10,-8],[13,-13]]);
    for(const [x,y] of [[-15,11],[8,7]]){ctx.beginPath();ctx.ellipse(x,y,7,5,-.25,0,Math.PI*2);ctx.fill();}
  }else if(/SOUND/.test(text)){
    path([[-20,-6],[-12,-6],[-2,-16],[-2,16],[-12,6],[-20,6],[-20,-6]]);
    for(const r of [11,20]){ctx.beginPath();ctx.arc(0,0,r,-.7,.7);ctx.stroke();}
  }else if(/WELCOME|ROOM/.test(text)){
    path([[-21,-2],[0,-20],[21,-2]]);path([[-15,-5],[-15,18],[-4,18],[-4,4],[5,4],[5,18],[15,18],[15,-5]]);
  }else if(/TURN|TILT|REPLAY|AGAIN|JOURNEY/.test(text)){
    ctx.beginPath();ctx.arc(0,0,17,.4,Math.PI*1.8);ctx.stroke();path([[11,-19],[18,-9],[5,-9]]);
  }else if(/META|ITCH|STORE/.test(text)){
    path([[-17,-4],[-17,18],[17,18],[17,-4],[-17,-4]]);ctx.beginPath();ctx.arc(0,-5,9,Math.PI,Math.PI*2);ctx.stroke();
  }else if(/LEFT|RIGHT|BACK|FORWARD|UP|DOWN|DROP/.test(text)){
    if(/LEFT/.test(text))ctx.rotate(-Math.PI/2);
    else if(/RIGHT/.test(text))ctx.rotate(Math.PI/2);
    else if(/BACK|DOWN|DROP/.test(text))ctx.rotate(Math.PI);
    path([[0,20],[0,-19],[-13,-5],[0,-19],[13,-5]]);
    if(/DROP/.test(text))path([[-16,-27],[16,-27]]);
  }else{
    ctx.beginPath();ctx.moveTo(-10,-19);ctx.lineTo(20,0);ctx.lineTo(-10,19);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
export function arcadeButtonStyle(text,accent){
  return{accent:accent??(/WELCOME|START|PLAY|STORE|ITCH|FOLLOW/.test(text)?'#ffc25b':/JOURNEY/.test(text)?'#b28bff':ARCADE_ACCENTS.room)};
}
export function paintArcadeButton(canvas,text,accent=ARCADE_ACCENTS.room){
  const ctx=canvas.getContext('2d');canvas.width=600;canvas.height=160;
  ctx.clearRect(0,0,600,160);
  // The glow is baked into this small face texture, not a fullscreen bloom pass.
  ctx.shadowColor=accent;ctx.shadowBlur=11;ctx.strokeStyle=accent;ctx.lineWidth=2;
  shape(ctx,9,10,582,137,15);ctx.fillStyle='#050a12';ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  const bevel=ctx.createLinearGradient(0,13,0,144);bevel.addColorStop(0,'#3a4856');bevel.addColorStop(.11,'#14212e');bevel.addColorStop(.85,'#080d16');bevel.addColorStop(1,'#02050a');
  shape(ctx,13,14,574,129,13);ctx.fillStyle=bevel;ctx.fill();
  const face=ctx.createLinearGradient(0,24,0,135);face.addColorStop(0,'#111c29');face.addColorStop(.5,'#0a1420');face.addColorStop(1,'#060d17');
  shape(ctx,21,23,558,111,9);ctx.fillStyle=face;ctx.fill();ctx.strokeStyle='#344451';ctx.lineWidth=1;ctx.stroke();
  ctx.globalAlpha=.18;ctx.strokeStyle=accent;
  for(let x=122;x<572;x+=28){ctx.beginPath();ctx.moveTo(x,26);ctx.lineTo(x-30,132);ctx.stroke();}ctx.globalAlpha=1;
  ctx.fillStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=7;
  ctx.fillRect(37,15,168,3);ctx.fillRect(430,15,127,3);ctx.fillRect(37,140,80,2);ctx.fillRect(480,140,77,2);ctx.shadowBlur=0;
  shape(ctx,30,43,66,74,9);ctx.fillStyle='#07131d';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  glyph(ctx,text);
  ctx.fillStyle='#f0fffc';ctx.textAlign='left';ctx.textBaseline='middle';
  let size=44;ctx.font=`700 ${size}px Arial`;
  while(ctx.measureText(text).width>435&&size>28){size--;ctx.font=`700 ${size}px Arial`;}
  ctx.shadowColor='#000000';ctx.shadowBlur=3;ctx.fillText(text,116,81,435);ctx.shadowBlur=0;
  for(let i=0;i<3;i++){ctx.globalAlpha=1-i*.26;ctx.fillStyle=accent;ctx.fillRect(561,68+i*9,5,4);}ctx.globalAlpha=1;
}

export function createArcadeButton(text,{accent,canvasFactory=()=>document.createElement('canvas')}={}){
  const style=arcadeButtonStyle(text,accent),canvas=canvasFactory();paintArcadeButton(canvas,text,style.accent);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.4),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,toneMapped:false}));
  const housing=new THREE.Mesh(new RoundedBoxGeometry(1.47,.37,.065,1,.025),new THREE.MeshStandardMaterial({color:'#080e17',metalness:.48,roughness:.38,emissive:style.accent,emissiveIntensity:.025}));
  housing.name='Arcade button / beveled housing';housing.position.z=-.043;face.add(housing);
  face.userData.arcadeButton={text,accent:style.accent,housing,hovered:false,pressedUntil:0};
  return face;
}
export function setArcadeButtonText(face,text){
  const style=face.userData.arcadeButton;if(!style||style.text===text)return;
  style.text=text;paintArcadeButton(face.material.map.image,text,style.accent);face.material.map.needsUpdate=true;
}
export function setArcadeButtonFeedback(face,hovered,time=0,pressed=false){
  const style=face?.userData.arcadeButton;if(!style)return;
  if(pressed)style.pressedUntil=time+140;
  const down=time<style.pressedUntil,state=down?'pressed':hovered?'hover':'idle';
  if(style.state===state)return;style.state=state;style.hovered=hovered;
  face.material.color.setRGB(...(down?[.76,1,.95]:hovered?[1.16,1.16,1.16]:[1,1,1]));
  style.housing.material.emissiveIntensity=down?.23:hovered?.12:.025;
}
