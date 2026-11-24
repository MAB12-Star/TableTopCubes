// One streaming music loop and a short decoded UI sound. No per-frame work.
export function createArcadeAudio({AudioClass=globalThis.Audio,ContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,storage,fetchAudio=globalThis.fetch}={}){
  let muted=false,level=.18,started=false,videoActive=false,context,clickBuffer,clickLoading,lastClick=-Infinity;
  try{storage??=globalThis.localStorage;muted=storage?.getItem('tabletop.vr.muted')==='1';const saved=storage?.getItem('tabletop.vr.music');if(saved!==null&&saved!==undefined)level=Math.min(.5,Math.max(0,Number(saved)||0));}catch{}
  const music=AudioClass?new AudioClass('assets/audio/arcade-music.mp3'):null;
  if(music){music.loop=true;music.preload='none';music.volume=level;}
  const listeners=new Set();
  function notify(){for(const fn of listeners)fn({muted,level});}
  function sync(){if(!music)return;music.volume=level;if(!started||muted||videoActive||document.hidden){music.pause();return;}try{music.play()?.catch(()=>{});}catch{}}
  async function unlock(){
    started=true;
    if(!context&&ContextClass){try{context=new ContextClass();}catch{}}
    if(context?.state==='suspended')context.resume().catch(()=>{});
    if(context&&!clickLoading){clickLoading=(async()=>{try{const r=await fetchAudio('assets/audio/ui-click.mp3');if(!r.ok)return;clickBuffer=await context.decodeAudioData(await r.arrayBuffer());}catch{}})();}
    sync();
  }
  function click(){unlock();if(muted||!context)return;const now=context.currentTime;if(now-lastClick<.045)return;lastClick=now;
    if(!clickBuffer){const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(1000,now);oscillator.frequency.exponentialRampToValueAtTime(650,now+.03);gain.gain.setValueAtTime(.06,now);gain.gain.exponentialRampToValueAtTime(.001,now+.035);oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start();oscillator.stop(now+.04);return;}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=clickBuffer;gain.gain.value=.35;source.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  }
  function toggle(){muted=!muted;try{storage?.setItem('tabletop.vr.muted',muted?'1':'0');}catch{}unlock();notify();return muted;}
  function setVolume(value){level=Math.max(0,Math.min(.5,Number(value)||0));try{storage?.setItem('tabletop.vr.music',String(level));}catch{}sync();notify();}
  return{unlock,click,toggle,setVolume,setVideoActive(value){videoActive=value;sync();},visibilityChanged:sync,subscribe(fn){listeners.add(fn);fn({muted,level});return()=>listeners.delete(fn);},get muted(){return muted;},get level(){return level;},get music(){return music;},dispose(){music?.pause();music?.removeAttribute('src');context?.close();listeners.clear();}};
}
