// Update the active navigation link as the reader moves through the sections.
(() => {
  if (!('IntersectionObserver' in window)) return;
    const links = [...document.querySelectorAll('nav a')];
    // Observe each section with a shared navigation observer.
    const observer = new IntersectionObserver(entries => {
      const activeEntry = entries.find(entry => entry.isIntersecting);
      if (!activeEntry) return;
      for (const link of links) {
        const active = link.hash === '#' + activeEntry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      }
    }, {rootMargin:'-15% 0px -55% 0px',threshold:0});
    document.querySelectorAll('main section[id]:not(#home)').forEach(section => observer.observe(section));

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


// Reveal Learning once, on its first entry into the viewport.
(() => {
  const section = document.getElementById('notes');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || reduced.matches || !('IntersectionObserver' in window)) return;
  const columns = [...section.querySelectorAll('.learning-column')];
  if (!columns.length || !columns.every(column => typeof column.animate === 'function')) return;
  let played = false;
  const animations = [];
  const observer = new IntersectionObserver(entries => {
    if (played || !entries.some(entry => entry.isIntersecting)) return;
    played = true;
    observer.disconnect();
    if (reduced.matches) return;
    columns.forEach((column, index) => {
      animations.push(column.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 560, delay: index * 90, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
      ));
    });
  }, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
  const cancel = () => {
    if (!reduced.matches) return;
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
  };
  reduced.addEventListener('change', cancel);
  section.addEventListener('focusin', () => {
    played = true;
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
  });
  observer.observe(section);
})();
