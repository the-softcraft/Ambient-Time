/* Standby Clock — four full-screen designs, swipe to change.
 *
 * Everything is local: no network, no dependencies, no service worker.
 */
(() => {
  'use strict';

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

  const KEY_INDEX = 'standbyclock.index';
  const KEY_HOUR12 = 'standbyclock.hour12';

  /* --------------------------------------------------------------- dom */

  const stage = document.getElementById('stage');
  const track = document.getElementById('track');
  const clocks = Array.from(document.querySelectorAll('.clock'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  const hint = document.getElementById('hint');
  const formatBtn = document.getElementById('format');
  const fsBtn = document.getElementById('fullscreen');
  const fsIcon = document.getElementById('fsIcon');

  /* ----------------------------------------------------------- bindings */

  const bindings = new Map();
  for (const el of document.querySelectorAll('[data-bind]')) {
    const key = el.dataset.bind;
    if (!bindings.has(key)) bindings.set(key, []);
    bindings.get(key).push(el);
  }

  function set(key, value) {
    const els = bindings.get(key);
    if (!els) return;
    for (const el of els) {
      if (el.textContent !== value) el.textContent = value;
    }
  }

  const pad = (n) => String(n).padStart(2, '0');

  /* ------------------------------------------------------------- storage */

  function read(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* private mode / blocked storage — clocks still work */
    }
  }

  /* ------------------------------------------------------------- format */

  let systemHour12 = false;
  try {
    systemHour12 = new Intl.DateTimeFormat().resolvedOptions().hour12 === true;
  } catch (_) {
    /* keep 24h */
  }

  let storedHour12 = read(KEY_HOUR12, null);
  let hour12 = storedHour12 === null ? systemHour12 : storedHour12 === '1';

  function applyFormat() {
    document.body.dataset.format = hour12 ? '12' : '24';
    formatBtn.textContent = hour12 ? '12H' : '24H';
    formatBtn.setAttribute('aria-label', hour12 ? 'Switch to 24 hour clock' : 'Switch to 12 hour clock');
    tick();
  }

  formatBtn.addEventListener('click', () => {
    hour12 = !hour12;
    write(KEY_HOUR12, hour12 ? '1' : '0');
    applyFormat();
    showChrome();
  });

  /* --------------------------------------------------------------- clock */

  function tick() {
    const now = new Date();

    const h24 = now.getHours();
    const hourValue = hour12 ? h24 % 12 || 12 : h24;
    const H = pad(hourValue);
    const M = pad(now.getMinutes());
    const S = pad(now.getSeconds());

    set('hh', H);
    set('h1', H[0]);
    set('h2', H[1]);
    set('mm', M);
    set('m1', M[0]);
    set('m2', M[1]);
    set('ss', S);
    set('ap', hour12 ? (h24 >= 12 ? 'PM' : 'AM') : '');
    set('dow', DAYS_SHORT[now.getDay()]);
    set('dowLong', DAYS[now.getDay()]);
    set('day', pad(now.getDate()));
    set('mon', MONTHS_SHORT[now.getMonth()]);
    set('monLong', MONTHS[now.getMonth()]);
    set('year', String(now.getFullYear()));

    document.documentElement.style.setProperty(
      '--sec',
      ((now.getSeconds() + now.getMilliseconds() / 1000) / 60 * 100).toFixed(2) + '%'
    );
  }

  // refresh exactly on the second boundary
  function loop() {
    tick();
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  }

  /* ------------------------------------------------------------ carousel */

  let index = Number(read(KEY_INDEX, '0'));
  if (!Number.isFinite(index) || index < 0 || index >= clocks.length) index = 0;

  function setTransform(offset = 0, animate = true) {
    const width = stage.clientWidth || window.innerWidth;
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translate3d(${-index * width + offset}px, 0, 0)`;
  }

  function paintDots() {
    for (let i = 0; i < dots.length; i++) {
      const active = i === index;
      dots[i].classList.toggle('is-active', active);
      dots[i].setAttribute('aria-selected', active ? 'true' : 'false');
    }
  }

  function goTo(next, animate = true) {
    index = Math.max(0, Math.min(clocks.length - 1, next));
    setTransform(0, animate);
    paintDots();
    write(KEY_INDEX, String(index));
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.index));
      showChrome();
    });
  });

  /* ---------------------------------------------------------------- drag */

  const DRAG_START = 8;   // px before we decide the gesture axis
  let drag = null;

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dx: 0,
      axis: null,
      chromeHidden: document.body.classList.contains('chrome-hidden'),
    };
    document.body.classList.add('dragging');
    showChrome();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;

    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    if (!drag.axis) {
      if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (drag.axis !== 'x') return;

    const width = stage.clientWidth || window.innerWidth;
    const atStart = index === 0 && dx > 0;
    const atEnd = index === clocks.length - 1 && dx < 0;
    const limited = atStart || atEnd ? dx * 0.26 : dx;

    drag.dx = limited;
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-index * width + limited}px, 0, 0)`;
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;

    const { dx, axis, chromeHidden } = drag;
    const moved = Math.abs(dx) >= DRAG_START;
    drag = null;
    document.body.classList.remove('dragging');

    if (axis !== 'x') {
      setTransform(0, true);
      if (!moved) {
        if (chromeHidden) showChrome();
        else toggleChrome();
      }
      return;
    }

    const width = stage.clientWidth || window.innerWidth;
    const threshold = Math.min(110, width * 0.16);

    if (dx <= -threshold) goTo(index + 1);
    else if (dx >= threshold) goTo(index - 1);
    else goTo(index);

    showChrome();
  }

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  // horizontal wheel / trackpad swipe
  let wheelLock = 0;
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
    if (Math.abs(horizontal) < 14) return;

    const now = Date.now();
    if (now < wheelLock) return;
    wheelLock = now + 420;

    goTo(index + (horizontal > 0 ? 1 : -1));
    showChrome();
  }, { passive: false });

  /* --------------------------------------------------------------- chrome */

  let chromeTimer = 0;

  function showChrome() {
    document.body.classList.remove('chrome-hidden');
    clearTimeout(chromeTimer);
    chromeTimer = setTimeout(() => {
      if (!drag) document.body.classList.add('chrome-hidden');
    }, 6000);
  }

  function toggleChrome() {
    clearTimeout(chromeTimer);
    const hidden = document.body.classList.contains('chrome-hidden');
    if (hidden) {
      showChrome();
    } else {
      document.body.classList.add('chrome-hidden');
    }
  }

  /* auto fullscreen on load */
  (function () { var N = window.Native; if (N && N.setFullscreen) N.setFullscreen(true); nativeFs = true; })();

  /* ----------------------------------------------------------- fullscreen */

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function syncFullscreenIcon() {
    const isFs = !!fullscreenElement() || nativeFs;
    fsIcon.setAttribute('href', isFs ? '#i-minimize' : '#i-maximize');
    fsBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Enter fullscreen');
  }

  var nativeFs = false;
  fsBtn.addEventListener('click', async () => {
    const N = window.Native;
    try {
      const isFs = !!fullscreenElement() || nativeFs;
      if (!isFs) {
        if (N && N.setFullscreen) N.setFullscreen(true);
        nativeFs = true;
        const req = document.documentElement.requestFullscreen
          || document.documentElement.webkitRequestFullscreen;
        if (req) await req.call(document.documentElement);
      } else {
        if (N && N.setFullscreen) N.setFullscreen(false);
        nativeFs = false;
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      }
    } catch (_) {
      /* WebViews often block fullscreen — nothing to do */
    }
    syncFullscreenIcon();
    showChrome();
  });

  document.addEventListener('fullscreenchange', syncFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', syncFullscreenIcon);

  /* --------------------------------------------------------------- awake */

  let wakeLock = null;

  async function keepAwake() {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      if (wakeLock && !wakeLock.released) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (_) {
      /* unsupported or denied */
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      keepAwake();
      tick();
    }
  });

  window.addEventListener('pointerdown', keepAwake);

  /* -------------------------------------------------------------- keyboard */

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

    if (e.key === 'ArrowRight') { goTo(index + 1); showChrome(); }
    else if (e.key === 'ArrowLeft') { goTo(index - 1); showChrome(); }
    else if (e.key === 'Home') { goTo(0); showChrome(); }
    else if (e.key === 'End') { goTo(clocks.length - 1); showChrome(); }
    else if (e.key === 'f' || e.key === 'F') fsBtn.click();
    else if (e.key === 'h' || e.key === 'H') toggleChrome();
  });

  /* ----------------------------------------------------------------- boot */

  window.addEventListener('resize', () => setTransform(0, false));
  window.addEventListener('orientationchange', () => setTimeout(() => setTransform(0, false), 150));

  applyFormat();
  goTo(index, false);
  loop();
  keepAwake();

  setTimeout(() => hint.classList.add('is-gone'), 5000);
  showChrome();

  // debug hook
  window.StandbyClock = { goTo, index: () => index, tick };
})();
