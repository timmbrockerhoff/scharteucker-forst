// Scharteucker Forst – Interaktionen

const header = document.querySelector('.header');
const menuBtn = document.querySelector('.menu-btn');

// Header wird beim Scrollen dunkel (nur auf der Startseite transparent)
const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

// Hero-Video anhalten, wenn reduzierte Bewegung gewünscht ist (dann bleibt das Standbild)
const heroVideo = document.querySelector('video.hero__media');
if (heroVideo && matchMedia('(prefers-reduced-motion: reduce)').matches) heroVideo.pause();

// Mobiles Menü
menuBtn.addEventListener('click', () => {
  const open = header.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', open);
  document.body.classList.toggle('menu-open', open);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && header.classList.contains('is-open')) menuBtn.click();
});

// Einblenden beim Scrollen
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

// Wort für Wort aufhellen, gekoppelt an die Scrollposition
const reveal = document.querySelector('.reveal-text');
if (reveal) {
  reveal.innerHTML = reveal.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = reveal.querySelectorAll('.w');
  const update = () => {
    const r = reveal.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  };
  update();
  addEventListener('scroll', update, { passive: true });
}

// Karten-Slider
document.querySelectorAll('[data-slider]').forEach(slider => {
  const track = slider.querySelector('.slider__track');
  const step = () => track.firstElementChild.getBoundingClientRect().width + 32;
  slider.querySelector('[data-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  slider.querySelector('[data-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

// Jahresringe im Hintergrund der hellen Sektionen: atmen langsam, weichen dem Mauszeiger aus
(() => {
  const light = document.querySelectorAll('.section--light, .section--grey');
  if (!light.length) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'rings';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hash = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const mouse = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, k: 0 };
  let w = 0, h = 0, t = 0, raf = 0;
  const visible = new Set();

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    // Mittelpunkt der „Baumscheibe“ rechts oben, wandert beim Scrollen leicht mit
    const cx = w * .72, cy = h * .38 - scrollY * .12;
    const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 60;
    ctx.strokeStyle = 'rgba(149, 178, 146, .3)';
    ctx.lineJoin = 'round';
    let r = 18;
    for (let i = 0; r < maxR; i++) {
      r += 46 * (.7 + .6 * hash(i));                   // unregelmäßige Ringabstände
      const amp = 4 + r * .035;
      const n = Math.min(360, Math.max(48, Math.round(r / 2.5)));
      const pts = [];
      for (let j = 0; j < n; j++) {
        const a = j / n * Math.PI * 2;
        const wob = amp * (.55 * Math.sin(3 * a + i * .9 + t * .35) + .3 * Math.sin(5 * a - i * .5 - t * .25) + .25 * Math.sin(2 * a + i * 1.7 + t * .18));
        let x = cx + Math.cos(a) * (r + wob), y = cy + Math.sin(a) * (r + wob);
        const dx = x - mouse.sx, dy = y - mouse.sy, d = Math.hypot(dx, dy), R = 170;
        if (d < R && d > 0) { const f = mouse.k * 42 * (1 - d / R) ** 2 / d; x += dx * f; y += dy * f; }
        pts.push(x, y);
      }
      ctx.lineWidth = 7 + 9 * hash(i + 7);              // unterschiedlich dicke Jahresringe
      ctx.beginPath();
      ctx.moveTo((pts[0] + pts[2]) / 2, (pts[1] + pts[3]) / 2);
      for (let j = 1; j <= n; j++) {
        const p = (j % n) * 2, q = ((j + 1) % n) * 2;
        ctx.quadraticCurveTo(pts[p], pts[p + 1], (pts[p] + pts[q]) / 2, (pts[p + 1] + pts[q + 1]) / 2);
      }
      ctx.stroke();
    }
  };

  const loop = () => {
    t += .016;
    mouse.sx += (mouse.x - mouse.sx) * .08;
    mouse.sy += (mouse.y - mouse.sy) * .08;
    mouse.k += ((mouse.x > -1e3 ? 1 : 0) - mouse.k) * .05;
    draw();
    raf = visible.size ? requestAnimationFrame(loop) : 0;
  };
  const start = () => { if (still) draw(); else if (!raf) raf = requestAnimationFrame(loop); };

  // Nur zeichnen, solange eine helle Sektion im Bild ist
  const seen = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
    if (visible.size) start();
  });
  light.forEach(el => seen.observe(el));

  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  addEventListener('resize', () => { resize(); if (still) draw(); });
  if (still) addEventListener('scroll', draw, { passive: true });
  resize();
})();

// YouTube erst nach Klick laden (keine Verbindung zu Google vorher)
document.querySelectorAll('.video[data-youtube]').forEach(box => {
  box.querySelector('button').addEventListener('click', () => {
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${box.dataset.youtube}?autoplay=1&rel=0" title="${box.dataset.title || 'Video'}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
});
