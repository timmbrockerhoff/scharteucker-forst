// Scharteucker Forst – Interaktionen

const header = document.querySelector('.header');
const menuBtn = document.querySelector('.menu-btn');

// Schnellkontakt: ein Kontakt-Button unten rechts. Erscheint beim Runterscrollen als fallender Tropfen:
// unter dem Kontakt-Button oben schwillt ein Tropfen an, schnürt sich ab, fällt mit Schwerkraft und schwappt unten zum Button auf.
const fab = document.querySelector('.fab');
const fabBtn = fab && fab.querySelector('.fab__btn');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let footerVisible = false, fabShown = false, hiddenBy = 'top', stopDrip = null;
const closeFab = () => { if (fab) { fab.classList.remove('is-open'); fabBtn.setAttribute('aria-expanded', 'false'); } };

const drip = () => {
  const src = document.querySelector(matchMedia('(max-width: 991px)').matches ? '.menu-btn' : '.header .nav__cta');
  const a = src.getBoundingClientRect(), b = fabBtn.getBoundingClientRect();
  if (!a.width || !b.width || getComputedStyle(header.firstElementChild).opacity < .5) return; // Button oben nicht sichtbar: ohne Effekt
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v)), lerp = (x, y, t) => x + (y - x) * t;
  const inOut = t => -(Math.cos(Math.PI * t) - 1) / 2, easeIn = t => t * t, easeOut = t => 1 - Math.pow(1 - t, 3);
  const from = getComputedStyle(src).backgroundColor, to = getComputedStyle(fabBtn).backgroundColor;
  const tint = p => `color-mix(in srgb, ${to} ${Math.round(clamp(p) * 100)}%, ${from})`;
  const ax = a.left + a.width / 2, bx = b.left + b.width / 2, by = b.top + b.height / 2;
  // Zeiten in ms: Anschwellen, Abschnüren, freier Fall (Dauer aus der Fallhöhe), Aufprall mit Nachschwingen
  const R = 13, G = .007, SWELL = 380, PINCH = 200, SPLASH = 560, y0 = a.bottom + 40;
  const tDet = SWELL + PINCH, tHit = tDet + Math.sqrt(2 * Math.max(0, b.top - R - y0) / G), total = tHit + SPLASH;
  const mk = (parent, r, color) => { const d = document.createElement('div'); d.style.borderRadius = r; d.style.background = color; parent.appendChild(d); return d; };
  const place = (el, x, y, w, h, extra = '') => { el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.transform = `translate(${x - w / 2}px,${y - h / 2}px)${extra}`; };
  const goo = document.createElement('div'); goo.className = 'goo-layer';
  const crisp = document.createElement('div'); crisp.className = 'drip-layer';
  document.body.append(goo, crisp);
  // im Goo-Filter verschmelzen: Ansatz am Button (liegt hinter ihm), anschwellender Tropfen, Faden, Ziel-Button, einsinkender Tropfen
  const anchor = mk(goo, '50%', from), bulge = mk(goo, '50%', from), pool = mk(goo, '100px', to), sink = mk(goo, '50%', to);
  const neck = Array.from({ length: 4 }, () => mk(goo, '50%', from));
  // scharf gezeichnet: fallender Tropfen (Spitze oben), Nachtropfen, zwei Spritzer
  const drop = mk(crisp, '0 50% 50% 50%', from), sat = mk(crisp, '50%', from), splash = [mk(crisp, '50%', to), mk(crisp, '50%', to)];
  header.classList.add('is-hold'); // Navigation bleibt sichtbar, bis der Tropfen abreißt
  fab.classList.add('is-dripping');
  let raf; const t0 = performance.now();
  const end = () => { cancelAnimationFrame(raf); goo.remove(); crisp.remove(); header.classList.remove('is-hold'); fab.classList.remove('is-dripping'); stopDrip = null; };
  const frame = now => {
    const ms = now - t0;
    // oben: anschwellen, dann lang ziehen und abschnüren
    if (ms < tDet) {
      const sw = inOut(clamp(ms / SWELL)), pu = clamp((ms - SWELL) / PINCH), r = lerp(4, R, sw);
      const y = lerp(a.bottom + r * .6, y0, easeIn(pu));
      place(anchor, ax, a.bottom - 7, a.width * .45, 14);
      place(bulge, ax, y, r * 2, r * 2);
      neck.forEach((el, i) => { const s = (i + 1) / (neck.length + 1), nr = pu > 0 ? (6 - 2 * s) * (1 - easeIn(pu)) : 0; place(el, ax, lerp(a.bottom - 2, y - r * .5, s), nr * 2, nr * 2); });
    } else {
      header.classList.remove('is-hold');
      const k = clamp((ms - tDet) / 260);
      place(anchor, ax, a.bottom - 7 - 4 * k, a.width * .45 * (1 - k), 14 * (1 - easeOut(k)));
      place(bulge, 0, 0, 0, 0); neck.forEach(el => place(el, 0, 0, 0, 0));
    }
    // freier Fall mit Schwerkraft: je schneller, desto länger gestreckt; färbt sich unterwegs ins Grün
    if (ms >= tDet && ms < tHit) {
      const dt = ms - tDet, p = dt / (tHit - tDet), y = y0 + G * dt * dt / 2, sy = 1 + Math.min(.35, G * dt * .12);
      place(drop, lerp(ax, bx, easeIn(p)), y, R * 2, R * 2, ` scale(${1 / Math.sqrt(sy)},${sy}) rotate(45deg)`);
      drop.style.background = tint(p);
      const ds = Math.max(0, dt - 50), sy2 = y0 - R * 1.8 + G * ds * ds / 2;
      place(sat, lerp(ax, bx, easeIn(p)), sy2, 5, 5); sat.style.background = tint(p); sat.style.opacity = sy2 < b.top - 4 ? 1 : 0;
    } else { place(drop, 0, 0, 0, 0); place(sat, 0, 0, 0, 0); }
    // unten: Aufprall, Tropfen sinkt ein, Button schwappt breit auf und schwingt aus, zwei Spritzer fliegen weg
    if (ms >= tHit) {
      const t = ms - tHit, k = t / SPLASH, w = .16 * Math.exp(-5 * k) * Math.sin(k * Math.PI * 5);
      const gw = easeOut(clamp(k / .4)), gh = easeOut(clamp(k / .3));
      place(sink, bx, lerp(b.top, by, clamp(k / .25)), R * 2 * (1 - easeIn(clamp(k / .25))), R * 2 * (1 - easeIn(clamp(k / .25))));
      place(pool, bx, lerp(b.top + 6, by, gh), b.width * gw * (1 + w) + .0001, b.height * gh * (1 - w) + .0001);
      splash.forEach((el, i) => { const d = i ? 1 : -1, x = bx + d * (8 + .12 * t), y = b.top - .32 * t + G * t * t / 2; place(el, x, y, 6, 6); el.style.opacity = clamp(1 - t / 320); });
    } else { place(pool, 0, 0, 0, 0); place(sink, 0, 0, 0, 0); splash.forEach(el => place(el, 0, 0, 0, 0)); }
    if (ms < total) raf = requestAnimationFrame(frame);
    else { fab.classList.remove('is-dripping'); goo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).onfinish = end; }
  };
  raf = requestAnimationFrame(frame);
  stopDrip = end;
};

const updateFab = () => {
  if (!fab) return;
  const show = scrollY > 80 && !footerVisible; // gleiche Schwelle wie das Ausblenden der Navigation: Abtropfen startet, solange der Button oben noch sichtbar ist
  if (show === fabShown) return;
  fabShown = show;
  fab.classList.toggle('is-visible', show);
  if (!show) { hiddenBy = footerVisible ? 'footer' : 'top'; if (stopDrip) stopDrip(); closeFab(); return; }
  if (hiddenBy === 'top' && !reduceMotion) drip();
};
if (fab) {
  new IntersectionObserver(([e]) => { footerVisible = e.isIntersecting; updateFab(); }).observe(document.querySelector('.footer'));
  fabBtn.addEventListener('click', () => { const open = !fab.classList.contains('is-open'); fab.classList.toggle('is-open', open); fabBtn.setAttribute('aria-expanded', open); });
  document.addEventListener('click', e => { if (!e.target.closest('.fab')) closeFab(); });
}

// Navigation: dunkle Schrift über hellen Sektionen, beim Runterscrollen ausblenden, beim Hochscrollen einblenden
let lastY = scrollY, ticking = false;
const updateHeader = () => {
  const under = document.elementsFromPoint(innerWidth / 2, header.offsetHeight / 2)
    .find(el => !header.contains(el) && !el.classList.contains('rings'));
  header.classList.toggle('on-light', !!under?.closest('.section--light, .section--grey'));
  const y = scrollY;
  if (Math.abs(y - lastY) > 6) {
    const hide = y > lastY && y > 80 && !header.classList.contains('is-open');
    if (hide && !header.classList.contains('is-hidden')) closeDropdowns();
    header.classList.toggle('is-hidden', hide);
    lastY = y;
  }
  updateFab();
  ticking = false;
};
updateHeader();
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); } }, { passive: true });
addEventListener('resize', updateHeader);

// Hero-Video anhalten, wenn reduzierte Bewegung gewünscht ist (dann bleibt das Standbild)
const heroVideo = document.querySelector('video.hero__media');
if (heroVideo && matchMedia('(prefers-reduced-motion: reduce)').matches) heroVideo.pause();

// Fortschrittsbalken unter dem Hero-Text: ein Balken je Clip im zusammengeschnittenen Video
const progress = document.querySelector('.hero__progress');
if (heroVideo && progress) {
  const starts = progress.dataset.segments.split(',').map(Number);
  const bars = [...progress.querySelectorAll('button')];
  const tick = () => {
    const t = heroVideo.currentTime, end = heroVideo.duration || Infinity;
    bars.forEach((bar, i) => {
      const s = starts[i], e = starts[i + 1] ?? end;
      bar.firstElementChild.style.setProperty('--p', Math.min(1, Math.max(0, (t - s) / (e - s))));
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  bars.forEach((bar, i) => bar.addEventListener('click', () => { heroVideo.currentTime = starts[i] + .01; heroVideo.play(); }));
}

// Mobiles Menü
menuBtn.addEventListener('click', () => {
  const open = header.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', open);
  document.body.classList.toggle('menu-open', open);
});
// Untermenüs: mit Maus beim Überfahren öffnen (kurze Schließverzögerung), sonst per Klick/Tippen; Klick daneben oder Escape schließt
const toggles = document.querySelectorAll('.nav__toggle');
const closeDropdowns = () => toggles.forEach(t => { t.parentElement.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false'); });
const navList = document.querySelector('.nav__list');
const openDropdown = t => {
  // Wechsel von einem offenen Panel zum anderen: ohne Ein-/Ausblenden, nur der Inhalt tauscht
  const switching = [...toggles].some(o => o !== t && o.parentElement.classList.contains('is-open'));
  if (switching) navList.classList.add('is-switching');
  closeDropdowns();
  t.parentElement.classList.add('is-open');
  t.setAttribute('aria-expanded', 'true');
  if (switching) requestAnimationFrame(() => requestAnimationFrame(() => navList.classList.remove('is-switching')));
};
const hoverNav = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 992px)');
toggles.forEach(t => {
  const item = t.parentElement;
  let closeTimer;
  t.addEventListener('click', () => {
    if (hoverNav.matches && item.matches(':hover') && item.classList.contains('is-open')) return;
    item.classList.contains('is-open') ? closeDropdowns() : openDropdown(t);
  });
  item.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse' || !hoverNav.matches) return;
    clearTimeout(closeTimer);
    openDropdown(t);
  });
  item.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse' || !hoverNav.matches) return;
    closeTimer = setTimeout(() => { item.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false'); }, 200);
  });
});
document.addEventListener('click', e => { if (!e.target.closest('.nav__item')) closeDropdowns(); });

addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeDropdowns();
  closeFab();
  if (header.classList.contains('is-open')) menuBtn.click();
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

// Jahresringe im Hintergrund der hellen Sektionen: atmen langsam, folgen der Maus leicht, Lichtkegel am Zeiger
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
  let w = 0, h = 0, t = 0, raf = 0, ox = 0, oy = 0;
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
    const cx = w * .72 + ox, cy = h * .38 - scrollY * .12 + oy;
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
        pts.push(cx + Math.cos(a) * (r + wob), cy + Math.sin(a) * (r + wob));
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
    // Lichtkegel: färbt nur die Ringe rund um den Zeiger dunkler, ohne sie zu verformen
    if (mouse.k > .01) {
      const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 240);
      g.addColorStop(0, `rgba(0, 79, 35, ${.8 * mouse.k})`);
      g.addColorStop(1, 'rgba(0, 79, 35, 0)');
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = g;
      ctx.fillRect(mouse.sx - 240, mouse.sy - 240, 480, 480);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const loop = () => {
    t += .0065;
    const on = mouse.x > -1e3;
    if (on) {
      if (mouse.k < .01) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * .1;
      mouse.sy += (mouse.y - mouse.sy) * .1;
    }
    mouse.k += ((on ? 1 : 0) - mouse.k) * .05;
    // ganze Baumscheibe wandert sanft ein Stück Richtung Maus
    ox += ((on ? (mouse.x - w / 2) * .05 : 0) - ox) * .04;
    oy += ((on ? (mouse.y - h / 2) * .05 : 0) - oy) * .04;
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
