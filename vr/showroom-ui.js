// Keep basic page controls usable independently of WebGL/XR initialization.
(() => {
  const promo = document.querySelector('#journey-promo');
  const close = document.querySelector('#close-journey-promo');
  const enter = document.querySelector('#explore-arcade');
  const reopen = document.querySelector('#open-journey-promo');
  const games = document.querySelector('#games');
  const video = document.querySelector('#journey-video');
  if (!promo || !close || !enter || !reopen || !games) return;
  const key = 'tabletop.showroom.promo-dismissed';
  const remember = dismissed => {
    try {
      if (dismissed) sessionStorage.setItem(key, '1');
      else sessionStorage.removeItem(key);
    } catch { /* Closing still works when browser storage is unavailable. */ }
  };
  const hide = (navigate = true) => {
    if (video && !video.paused) video.pause();
    promo.hidden = true;
    reopen.hidden = false;
    reopen.setAttribute('aria-expanded', 'false');
    if (navigate) {
      remember(true);
      games.scrollIntoView({block: 'center', behavior: 'auto'});
      games.focus({preventScroll: true});
      window.trackTableTop?.('vr-promo-dismiss');
    }
  };
  close.addEventListener('click', () => hide());
  enter.addEventListener('click', () => hide());
  reopen.addEventListener('click', () => {
    promo.hidden = false;
    reopen.hidden = true;
    reopen.setAttribute('aria-expanded', 'true');
    remember(false);
    promo.scrollIntoView({block: 'start', behavior: 'auto'});
    close.focus({preventScroll: true});
    window.trackTableTop?.('vr-promo-open');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || promo.hidden || document.querySelector('dialog[open]') || document.body.classList.contains('xr-active') || document.body.classList.contains('sample-active')) return;
    event.preventDefault();
    hide();
  });
  try { if (sessionStorage.getItem(key) === '1') hide(false); } catch {}
})();
