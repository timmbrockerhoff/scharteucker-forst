// Scharteucker Forst – Interaktionen

const header = document.querySelector('.header');
const menuBtn = document.querySelector('.menu-btn');

// Schnellkontakt unten rechts (zur Kontaktseite) und Nach-oben-Button unten links. Ploppen auf, sobald die Navigation beim Runterscrollen verschwindet; über dem Footer ausgeblendet.
const fabs = document.querySelectorAll('.fab');
let footerVisible = false, fabShown = false;

const updateFab = () => {
  if (!fabs.length) return;
  const show = scrollY > 80 && !footerVisible; // gleiche Schwelle wie das Ausblenden der Navigation
  if (show === fabShown) return;
  fabShown = show;
  fabs.forEach(f => f.classList.toggle('is-visible', show));
};
if (fabs.length) new IntersectionObserver(([e]) => { footerVisible = e.isIntersecting; updateFab(); }).observe(document.querySelector('.footer'));
document.querySelector('.fab--left .fab__btn')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

// Navigation: dunkle Schrift über hellen Sektionen, beim Runterscrollen ausblenden, beim Hochscrollen einblenden
// Hell oder dunkel unter der Navigation? Echte Helligkeit an fünf Punkten über die Breite der Leiste (mobil: ganze Kopfzeile).
// Pro Punkt wird der Stapel unter dem Zeiger von oben nach unten durchsucht: Foto → Helligkeit der Bildpunkte an genau dieser Stelle,
// Video (Hero, stark abgedunkelt) → dunkel, deckende Fläche → Helligkeit ihrer Hintergrundfarbe. Ist der Durchschnitt hell, wird die Schrift dunkel.
const navList = document.querySelector('.nav__list');
const lum = (r, g, b) => (.2126 * r + .7152 * g + .0722 * b) / 255;
const GRID = 48, grids = new WeakMap();
const gridOf = img => { // jedes Bild einmal auf 48 × 48 verkleinert auslesen und als Helligkeitsraster merken
  if (grids.has(img)) return grids.get(img);
  if (!img.complete || !img.naturalWidth) { img.addEventListener('load', () => updateHeader(), { once: true }); return null; }
  const c = document.createElement('canvas'); c.width = c.height = GRID;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, GRID, GRID);
  let g = null;
  try { const d = ctx.getImageData(0, 0, GRID, GRID).data; g = new Float32Array(GRID * GRID).map((_, i) => lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])); } catch {}
  grids.set(img, g);
  return g;
};
const imgLumAt = (img, x, y) => { // berücksichtigt object-fit: cover und object-position
  const g = gridOf(img);
  if (!g) return 0;
  const r = img.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
  const sc = Math.max(r.width / nw, r.height / nh), dw = nw * sc, dh = nh * sc;
  const [px, py] = getComputedStyle(img).objectPosition.split(' ').map(v => v.endsWith('%') ? parseFloat(v) / 100 : .5);
  const u = (x - r.left - (r.width - dw) * px) / dw, v = (y - r.top - (r.height - dh) * py) / dh;
  const cl = n => Math.min(GRID - 1, Math.max(0, Math.floor(n * GRID)));
  return g[cl(v) * GRID + cl(u)];
};
const mediaLum = (el, x, y) => el.tagName === 'IMG' ? imgLumAt(el, x, y) : .1; // Video = Hero, stark abgedunkelt
const pointLum = (x, y) => {
  const stack = document.elementsFromPoint(x, y).filter(el => !header.contains(el));
  for (const el of stack) {
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return mediaLum(el, x, y);
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (m && (m[3] === undefined || +m[3] > .3)) {
      // Ein Foto/Video im Inneren dieses Elements liegt über dessen Hintergrundfarbe (z. B. Kachel mit dunkler Grundfarbe)
      const media = stack.find(e => (e.tagName === 'IMG' || e.tagName === 'VIDEO') && el.contains(e));
      return media ? mediaLum(media, x, y) : lum(+m[0], +m[1], +m[2]);
    }
  }
  return 1;
};
const underIsLight = () => {
  let r = navList?.getBoundingClientRect();
  if (!r || !r.width || getComputedStyle(navList.closest('.nav')).position === 'fixed') r = header.getBoundingClientRect();
  const y = header.offsetHeight / 2;
  let sum = 0;
  for (let i = 0; i < 5; i++) sum += pointLum(r.left + r.width * (.1 + i * .2), y);
  return sum / 5 > .5;
};
let lastY = scrollY, ticking = false;
const updateHeader = () => {
  header.classList.toggle('on-light', underIsLight());
  const y = scrollY;
  header.classList.toggle('is-compact', y > 80); // außerhalb des Seitenanfangs nur die mittlere Navigation zeigen
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
  // Zeilenumbrüche (<br>) aus dem HTML bleiben erhalten
  reveal.innerHTML = reveal.innerHTML.split(/<br\s*\/?>/).map(part => part.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ')).join(' <br>');
  const words = reveal.querySelectorAll('.w');
  const link = reveal.parentElement.querySelector('.about__link'); // hellt als letztes „Wort“ mit auf
  const update = () => {
    const r = reveal.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
    const n = Math.round(p * (words.length + 1));
    words.forEach((w, i) => w.classList.toggle('on', i < n));
    link?.classList.toggle('on', n > words.length);
  };
  update();
  addEventListener('scroll', update, { passive: true });
}

// Kennzahlen zählen beim Erscheinen von 0 hoch. Der Endwert steht im HTML, ohne JS bleibt alles korrekt.
const countUp = el => {
  const text = el.textContent, m = text.match(/\d[\d.,]*/);
  if (!m) return;
  const dec = (m[0].split(',')[1] || '').length;
  const target = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  const pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length);
  const fmt = v => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const t0 = performance.now(), dur = 1800;
  const step = t => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = pre + fmt(target * (1 - (1 - p) ** 3)) + post; // schnell los, sanft auslaufen
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const countIo = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.querySelectorAll('.fact b').forEach(countUp); countIo.unobserve(e.target); }
  }, { threshold: .4 });
  document.querySelectorAll('.facts').forEach(el => countIo.observe(el));
}

// Karten-Slider
document.querySelectorAll('[data-slider]').forEach(slider => {
  const track = slider.querySelector('.slider__track');
  const step = () => track.firstElementChild.getBoundingClientRect().width + 32;
  slider.querySelector('[data-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  slider.querySelector('[data-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

// YouTube erst nach Klick laden (keine Verbindung zu Google vorher)
document.querySelectorAll('.video[data-youtube]').forEach(box => {
  box.querySelector('button').addEventListener('click', () => {
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${box.dataset.youtube}?autoplay=1&rel=0" title="${box.dataset.title || 'Video'}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
});
