// XR-standard reserves axes 0/1 for touchpads and 2/3 for thumbsticks.
// These inputs control the sample only; they never move the player's rig.
export function createThumbstickControls(){
  let state=new WeakMap(),activeSample=null;
  function reset(){state=new WeakMap();activeSample=null;}
  function update(session,game,sample,now){
    if(!session||!sample||!['cubes','snake'].includes(game)){reset();return;}
    if(activeSample!==sample){state=new WeakMap();activeSample=sample;}
    for(const source of session.inputSources||[]){
      const pad=source.gamepad;if(source.hand||!pad||pad.mapping!=='xr-standard')continue;
      let s=state.get(source);if(!s){s={direction:'',next:0,a:false,b:false};state.set(source,s);}
      const a=!!pad.buttons?.[4]?.pressed,b=!!pad.buttons?.[5]?.pressed;
      if(a&&!s.a)sample.command(game==='cubes'&&sample.running?'DROP':'START / RESET');
      if(b&&!s.b)sample.command('START / RESET');s.a=a;s.b=b;
      const x=pad.axes?.[2]||0,y=pad.axes?.[3]||0,amount=Math.max(Math.abs(x),Math.abs(y));
      if(amount<.25){s.direction='';s.next=0;continue;}if(amount<.6)continue;
      let action='';
      if(source.handedness==='left'||source.handedness==='none')action=Math.abs(x)>Math.abs(y)?(x>0?'RIGHT':'LEFT'):(y<0?'FORWARD':'BACK');
      else if(source.handedness==='right')action=game==='snake'?(Math.abs(y)>=Math.abs(x)?(y<0?'UP':'DOWN'):''):(Math.abs(x)>Math.abs(y)?(x>0?'TURN':'TURN LEFT'):'');
      if(!action)continue;
      if(action!==s.direction){sample.command(action);s.direction=action;s.next=now+.32;}
      else if(game==='cubes'&&source.handedness!=='right'&&now>=s.next){sample.command(action);s.next=now+.20;}
    }
  }
  return{update,reset};
}
