// Scharteucker Forst – Interaktionen

const header = document.querySelector('.header');
const menuBtn = document.querySelector('.menu-btn');

// Schnellkontakt: ein Kontakt-Button unten rechts. Führt zur Kontaktseite, ploppt auf, sobald die Navigation beim Runterscrollen verschwindet; über dem Footer ausgeblendet.
const fab = document.querySelector('.fab');
let footerVisible = false, fabShown = false;

const updateFab = () => {
  if (!fab) return;
  const show = scrollY > 80 && !footerVisible; // gleiche Schwelle wie das Ausblenden der Navigation
  if (show === fabShown) return;
  fabShown = show;
  fab.classList.toggle('is-visible', show);
};
if (fab) new IntersectionObserver(([e]) => { footerVisible = e.isIntersecting; updateFab(); }).observe(document.querySelector('.footer'));

// Navigation: dunkle Schrift über hellen Sektionen, beim Runterscrollen ausblenden, beim Hochscrollen einblenden
let lastY = scrollY, ticking = false;
const updateHeader = () => {
  const under = document.elementsFromPoint(innerWidth / 2, header.offsetHeight / 2)
    .find(el => !header.contains(el));
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
