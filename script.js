(() => {
  'use strict';
  const canvas = document.getElementById('ecg');
  const context = canvas.getContext('2d');
  const button = document.getElementById('motion-toggle');
  const label = document.getElementById('motion-label');
  const symbol = document.getElementById('motion-symbol');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let manualPreference = false;
  let width = 0, height = 0, phase = 0, lastTime = 0, frame = 0;
  let visible = true;

  // A purely illustrative P-QRS-T trace. No patient measurements are used.
  const gaussian = (x, center, spread, gain) => gain * Math.exp(-0.5 * ((x - center) / spread) ** 2);
  function signal(t) {
    const x = ((t % 1) + 1) % 1;
    return gaussian(x, .17, .032, .12)
      + gaussian(x, .36, .013, -.15)
      + gaussian(x, .393, .011, 1.06)
      + gaussian(x, .427, .016, -.28)
      + gaussian(x, .65, .068, .25);
  }
  function draw() {
    if (!context || !width) return;
    context.clearRect(0, 0, width, height);
    const baseline = height * .63;
    const amplitude = height * .46;
    const period = width < 600 ? 225 : 310;
    context.beginPath();
    for (let x = 0; x <= width; x += 1) {
      const y = baseline - signal(x / period + phase) * amplitude;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(119,175,255,0.12)');
    gradient.addColorStop(.28, 'rgba(119,175,255,0.50)');
    gradient.addColorStop(.72, 'rgba(119,175,255,0.94)');
    gradient.addColorStop(1, 'rgba(119,175,255,0.2)');
    context.strokeStyle = gradient;
    context.lineWidth = 1.7;
    context.lineJoin = 'round';
    context.shadowBlur = 9;
    context.shadowColor = 'rgba(119,175,255,0.25)';
    context.stroke();
    context.shadowBlur = 0;
  }
  function tick(time) {
    frame = 0;
    if (paused || document.hidden || !visible) { lastTime = 0; return; }
    if (lastTime) phase += Math.min((time - lastTime) / 1000, .1) * .34;
    lastTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!paused && !document.hidden && visible && !frame && context) {
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function sync() {
    document.documentElement.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Play animations' : 'Pause animations');
    label.textContent = paused ? 'Play motion' : 'Pause motion';
    symbol.textContent = paused ? '▷' : 'Ⅱ';
    if (paused && frame) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    draw(); start();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  button.addEventListener('click', () => { manualPreference = true; paused = !paused; sync(); });
  reduced.addEventListener('change', event => { if (!manualPreference) { paused = event.matches; sync(); } });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else start();
  });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize, {passive:true});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
      start();
    }).observe(canvas);
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
  }
  resize(); sync();
})();
