/* Aggregate website events only. Never send player/profile or XR motion data. */
(()=>{
  'use strict';
  const queue=[];
  function drain(){if(typeof window.goatcounter?.count!=='function')return;while(queue.length)window.goatcounter.count(queue.shift());}
  window.trackTableTop=name=>{
    if(!/^[a-z0-9-]{1,100}$/.test(name))return;
    const entry={path:name,title:name.replaceAll('-',' '),event:true};
    if(typeof window.goatcounter?.count==='function')window.goatcounter.count(entry);
    else if(queue.length<40)queue.push(entry);
  };
  window.flushTableTop=()=>{drain();return new Promise(resolve=>setTimeout(resolve,200));};
  const tracker=document.createElement('script');tracker.async=true;tracker.src='https://gc.zgo.at/count.js';
  tracker.dataset.goatcounter='https://tabletopcubes.goatcounter.com/count';tracker.onload=drain;document.head.appendChild(tracker);
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link)return;
    let url;try{url=new URL(link.href,location.href);}catch{return;}
    const scope=location.pathname.startsWith('/vr/')?'vr':'site';
    if(url.hostname==='www.meta.com'||url.hostname==='meta.com')window.trackTableTop(`${scope}-store-meta`);
    else if(url.hostname==='mab12-star.itch.io')window.trackTableTop(`${scope}-store-itch`);
    else if(url.origin===location.origin&&url.pathname==='/vr/')window.trackTableTop('site-open-vr-arcade');
  });
  document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO'&&!location.pathname.startsWith('/vr/'))window.trackTableTop('site-video-play');},true);
  document.addEventListener('play',event=>{if(event.target.dataset?.promo==='cube-world-adventure')window.trackTableTop('site-animal-promo-play');},true);
  document.addEventListener('ended',event=>{if(event.target.dataset?.promo==='cube-world-adventure')window.trackTableTop('site-animal-promo-complete');},true);
})();
