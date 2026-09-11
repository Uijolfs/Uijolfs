// Keep navigation and sticky-header styling aligned with the reading position.
(() => {
  const header = document.querySelector('.site-header');
  const links = [...document.querySelectorAll('nav a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  let frame = 0;
  function update() {
    frame = 0;
    const height = header?.offsetHeight || 90;
    document.documentElement.style.setProperty('--header-height', height + 'px');
    header?.classList.toggle('is-scrolled', window.scrollY > 12);
    const readingLine = height + Math.min(window.innerHeight * .2, 160);
    let active = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= readingLine) active = index;
    });
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = links.length - 1;
    links.forEach((link, index) => {
      const selected = index === active;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  if (header && 'ResizeObserver' in window) new ResizeObserver(schedule).observe(header);
  schedule();
})();

// Lorenz's equations, integrated with fourth-order Runge–Kutta.
// The faint orbit gives context; the bright trail follows the evolving state.
(() => {
  'use strict';
  const canvas = document.getElementById('lorenz');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const button = document.getElementById('chaos-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let manualPreference = false;
  const backdrop = document.createElement('canvas');
  const bg = backdrop.getContext('2d');
  if (!bg) return;
  const dt = .005;
  function derivative([x, y, z]) { return [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z]; }
  function step(p) {
    const a = derivative(p);
    const b = derivative(p.map((v, i) => v + dt * a[i] / 2));
    const c = derivative(p.map((v, i) => v + dt * b[i] / 2));
    const d = derivative(p.map((v, i) => v + dt * c[i]));
    return p.map((v, i) => v + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  let state = [1, 1, 1];
  for (let i = 0; i < 1800; i++) state = step(state);
  const orbit = [];
  for (let i = 0; i < 9000; i++) { state = step(state); orbit.push(state); }
  const trail = orbit.slice(-600);
  let width = 0, height = 0, ratio = 1, frame = 0, last = 0, carry = 0;
  let visible = true;
  let paused = reduced.matches;
  // An almost frontal x-z projection retains the familiar butterfly silhouette.
  function project([x, y, z]) {
    const scale = Math.min(width / 49, height / 54);
    return [width / 2 + (x + .12 * y) * scale, height / 2 - (z - 25) * scale];
  }
  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(backdrop, 0, 0, width, height);
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    // Batch the trail into age bands rather than hundreds of separate strokes.
    for (let band = 0; band < 16; band++) {
      const start = Math.floor(band * (trail.length - 1) / 16);
      const end = Math.floor((band + 1) * (trail.length - 1) / 16);
      ctx.beginPath();
      for (let i = start; i <= end; i++) {
        const [x, y] = project(trail[i]);
        if (i === start) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(119,175,255,${.12 + .88 * (band / 15) ** 1.6})`;
      ctx.stroke();
    }
    const [x, y] = project(trail[trail.length - 1]);
    ctx.beginPath(); ctx.arc(x, y, 2.7, 0, Math.PI * 2);
    ctx.fillStyle = '#f3f4f6'; ctx.shadowColor = '#77afff'; ctx.shadowBlur = 12;
    ctx.fill(); ctx.shadowBlur = 0;
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = backdrop.width = Math.round(width * ratio);
    canvas.height = backdrop.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    bg.setTransform(ratio, 0, 0, ratio, 0, 0);
    bg.strokeStyle = 'rgba(119,175,255,.17)'; bg.lineWidth = .65;
    bg.beginPath();
    orbit.forEach((p, i) => { const [x, y] = project(p); if (i === 0) bg.moveTo(x, y); else bg.lineTo(x, y); });
    bg.stroke(); draw();
  }
  function tick(time) {
    frame = 0;
    if (paused || !visible || document.hidden) { last = 0; return; }
    if (last) carry += Math.min((time - last) / 1000, .08) * .65;
    last = time;
    let changed = false;
    while (carry >= dt) {
      state = step(state); trail.push(state); trail.shift(); carry -= dt; changed = true;
    }
    if (changed) draw();
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function sync() {
    button.textContent = paused ? 'Play motion' : 'Pause motion';
    button.setAttribute('aria-label', paused ? 'Play Lorenz animation' : 'Pause Lorenz animation');
    button.setAttribute('aria-pressed', String(paused));
    schedule();
  }
  button.addEventListener('click', () => { manualPreference = true; paused = !paused; sync(); });
  reduced.addEventListener('change', event => { if (!manualPreference) { paused = event.matches; sync(); } });
  document.addEventListener('visibilitychange', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; schedule();
  }).observe(canvas);
  resize(); sync();
})();


// Swap the cover and project content without changing the card's footprint.
(() => {
  document.querySelectorAll('.research-card').forEach(card => {
    const front = card.querySelector('.research-front');
    const back = card.querySelector('.research-back');
    const open = card.querySelector('.research-open');
    const close = card.querySelector('.research-back-button');
    if (!front || !back || !open || !close) return;
    function setActive(active, moveFocus = true) {
      card.classList.toggle('is-active', active);
      front.inert = active;
      back.inert = !active;
      front.setAttribute('aria-hidden', String(active));
      back.setAttribute('aria-hidden', String(!active));
      open.setAttribute('aria-expanded', String(active));
      if (moveFocus) (active ? close : open).focus({ preventScroll: true });
    }
    open.disabled = false;
    close.hidden = false;
    card.classList.add('is-ready');
    setActive(false, false);
    open.addEventListener('click', () => setActive(true));
    close.addEventListener('click', () => setActive(false));
    card.addEventListener('keydown', event => {
      if (event.key === 'Escape' && card.classList.contains('is-active')) {
        event.preventDefault();
        setActive(false);
      }
    });
  });
})();


// Repeat subtle entrance and departure motion as content crosses the viewport.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window)) return;
  const groups = [
    '.hero-heading h1, .hero-intro, .chaos-figure',
    '.about-sidebar, .about-section .section-body',
    '.research-layout > .section-marker, .research-layout > .section-intro',
    '.research-grid > .research-card',
    '.learning-header, .learning-grid > .learning-column',
    '.personal-section .section-marker, .personal-content',
    'footer.page-width'
  ];
  const records = new Map();
  let observer = null;
  groups.forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (typeof element.animate === 'function') {
        records.set(element, { visible: null, animation: null, delay: Math.min(index * 65, 130) });
      }
    });
  });
  function cancel(record) {
    if (!record.animation) return;
    record.animation.onfinish = record.animation.oncancel = null;
    record.animation.cancel();
    record.animation = null;
  }
  function reset() {
    observer?.disconnect();
    observer = null;
    records.forEach(record => { cancel(record); record.visible = null; });
  }
  function start() {
    reset();
    if (reduced.matches) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target;
        const record = records.get(element);
        if (!record) continue;
        // Different entry and exit thresholds avoid flicker at a boundary.
        const visible = entry.isIntersecting && entry.intersectionRatio >= (record.visible === true ? .07 : .18);
        if (visible === record.visible) continue;
        const previous = record.visible;
        record.visible = visible;
        if (reduced.matches || document.hidden || element.contains(document.activeElement)) {
          cancel(record);
          continue;
        }
        // Do not animate unseen content when the observer first initializes.
        if (!visible && previous === null) continue;
        const current = getComputedStyle(element);
        const direction = entry.boundingClientRect.top < 0 ? -1 : 1;
        const from = record.animation
          ? { opacity: current.opacity, transform: current.transform }
          : visible
            ? { opacity: .22, transform: 'translateY(' + direction * 24 + 'px)' }
            : { opacity: 1, transform: 'translateY(0)' };
        cancel(record);
        const animation = element.animate(
          [from, visible
            ? { opacity: 1, transform: 'translateY(0)' }
            : { opacity: .28, transform: 'translateY(' + direction * 18 + 'px)' }],
          { duration: visible ? 620 : 340, delay: visible ? record.delay : 0, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }
        );
        record.animation = animation;
        if (visible) animation.onfinish = () => {
          if (record.animation === animation) {
            animation.onfinish = null;
            animation.cancel();
            record.animation = null;
          }
        };
      }
    }, { threshold: [0, .06, .08, .17, .19, .3], rootMargin: '-3% 0px -5% 0px' });
    records.forEach((record, element) => observer.observe(element));
  }
  reduced.addEventListener('change', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) records.forEach(cancel);
  });
  document.addEventListener('focusin', event => {
    records.forEach((record, element) => {
      if (element.contains(event.target)) {
        cancel(record);
        record.visible = true;
      }
    });
  });
  start();
})();
