/* Honeyapps Motion-Engine — geteilte Scroll-/Hero-Animationsschicht.
 * Lädt NACH den CDNs für GSAP, ScrollTrigger und Lenis (siehe _engine/README.md).
 * Hebt das Niveau jeder Seite, ohne sie zu homogenisieren: die KONKRETEN Effekte
 * werden pro Element per data-Attribut gewählt, Tokens/Layout/Hero variieren pro Kunde.
 *
 * Steuerung per Markup:
 *   [data-reveal]                 → Einblendung beim Scrollen (Default: fade-up)
 *   [data-reveal="left|right|scale|mask"]  → Variante
 *   [data-reveal="wipe-left|wipe-right"]   → Bild gleitet seitlich herein (Clip-Wipe + Drift)
 *   [data-reveal] style="--d:2"   → Stagger-Verzögerung (×0.08s)
 *   [data-reveal] style="--rx:140"→ Slide-Distanz px für left/right (statt 48); --ry für up
 *   [data-parallax="0.2"]         → Scroll-Parallaxe (Faktor; +runter/−hoch)
 *   [data-hero-stagger] > *       → gestaffelter Hero-Entrance beim Laden
 *   [data-rotate="4.5"] > img     → Crossfade-Slideshow durch die Kindbilder (Sek.; CSS s. README)
 *   [data-hero-kenburns] img      → langsamer Ken-Burns-Zoom
 *   [data-tilt]                   → dezenter Maus-Tilt (Tiefe), Desktop only
 *   [data-count="1985"]          → Hochzählen (nur ECHTE Zahlen verwenden!)
 */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth Scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
    // interne Anker-Links sanft scrollen
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); }
      });
    });
  }

  // Macht alle Reveal-Elemente sichtbar und nimmt die anim-Sperre weg (Failsafe).
  function revealAll() {
    document.documentElement.classList.remove('anim');
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.style.opacity = 1; el.style.transform = 'none'; el.style.clipPath = 'none';
    });
  }
  window.__motionReady = true; // Signal an den Inline-Failsafe: Engine läuft

  /* ---------- Reduced-Motion ODER fehlende Libs: alles sichtbar, keine Effekte ---------- */
  if (reduce || !hasGSAP || !hasST) {
    revealAll();
    initHeaderState();
    initMobileMenu();
    return;
  }
  // Ab hier Effekte — bei jedem Fehler nichts verschlucken, sondern sichtbar schalten.
  try {

  /* ---------- Reveal-Varianten beim Scrollen ---------- */
  var FROM = {
    up:    { y: 40, opacity: 0 },
    left:  { x: -48, opacity: 0 },
    right: { x: 48, opacity: 0 },
    scale: { scale: 0.92, opacity: 0 },
    mask:  { yPercent: 0, opacity: 1, clipPath: 'inset(0 0 100% 0)' },
    // Cinematischer Seiteneintritt: Bild „gleitet" + Clip-Wipe öffnet von der Kante.
    'wipe-left':  { xPercent: -6, opacity: 1, clipPath: 'inset(0 0 0 100%)' }, // öffnet links→rechts
    'wipe-right': { xPercent:  6, opacity: 1, clipPath: 'inset(0 100% 0 0)' }  // öffnet rechts→links
  };
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    var kind = el.getAttribute('data-reveal') || 'up';
    var cs = getComputedStyle(el);
    var d  = parseFloat(cs.getPropertyValue('--d')) || 0;
    var rx = parseFloat(cs.getPropertyValue('--rx')); // optionale Slide-Distanz (px)
    var ry = parseFloat(cs.getPropertyValue('--ry'));
    var from = Object.assign({}, FROM[kind] || FROM.up); // klonen, damit --rx/--ry nicht global wirken
    if (kind === 'left'  && !isNaN(rx)) from.x = -rx;
    if (kind === 'right' && !isNaN(rx)) from.x =  rx;
    if (kind === 'up'    && !isNaN(ry)) from.y =  ry;
    var to;
    if (kind === 'mask')
      to = { clipPath: 'inset(0 0 0% 0)', duration: 1.0, ease: 'power3.out', delay: d * 0.08 };
    else if (kind === 'wipe-left' || kind === 'wipe-right')
      to = { xPercent: 0, clipPath: 'inset(0 0 0 0%)', duration: 1.1, ease: 'power3.out', delay: d * 0.08 };
    else
      to = { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out', delay: d * 0.08 };
    gsap.fromTo(el, from, Object.assign(to, {
      scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' }
    }));
  });

  /* ---------- Scroll-Parallaxe (mehrschichtige Tiefe) ---------- */
  document.querySelectorAll('[data-parallax]').forEach(function (el) {
    var f = parseFloat(el.getAttribute('data-parallax')) || 0.15;
    gsap.to(el, {
      yPercent: f * 100,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- Ken-Burns-Zoom (Hero-Bild) ---------- */
  document.querySelectorAll('[data-hero-kenburns] img, img[data-hero-kenburns]').forEach(function (img) {
    gsap.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 6, ease: 'power1.out' });
  });

  /* ---------- Hero-Entrance (gestaffelt beim Laden) ---------- */
  document.querySelectorAll('[data-hero-stagger]').forEach(function (wrap) {
    var kids = wrap.querySelectorAll(':scope > *');
    gsap.fromTo(kids, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
  });

  /* ---------- Bild-Rotator (Crossfade durch mehrere Bilder) ---------- */
  document.querySelectorAll('[data-rotate]').forEach(function (box) {
    var items = box.querySelectorAll(':scope > img, :scope > .rot-item');
    if (items.length < 2) return;
    var iv = (parseFloat(box.getAttribute('data-rotate')) || 4.5) * 1000;
    box.classList.add('js-rot');          // schaltet CSS-Crossfade-Modus ein
    var i = 0; items[0].classList.add('on');
    setInterval(function () {
      items[i].classList.remove('on');
      i = (i + 1) % items.length;
      items[i].classList.add('on');
    }, iv);
  });

  /* ---------- Dezenter Maus-Tilt (Tiefe), nur Desktop ---------- */
  if (window.innerWidth > 980) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var qx = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      var qy = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      el.style.transformPerspective = '900px';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width - 0.5) * 10);
        qy(((e.clientY - r.top) / r.height - 0.5) * -10);
      });
      el.addEventListener('mouseleave', function () { qx(0); qy(0); });
    });
  }

  /* ---------- Echte Zähler (NUR mit echten Zahlen einsetzen) ---------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count')) || 0;
    var obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('de-DE'); }
    });
  });

  } catch (e) { revealAll(); }

  initHeaderState();
  initMobileMenu();

  /* ---------- Header: Hintergrund ab Scroll ---------- */
  function initHeaderState() {
    var header = document.querySelector('[data-header]') || document.querySelector('header');
    if (!header) return;
    function upd() { header.classList.toggle('scrolled', window.scrollY > 40); }
    upd(); window.addEventListener('scroll', upd, { passive: true });
  }

  /* ---------- Mobiles Menü ---------- */
  function initMobileMenu() {
    var t = document.querySelector('[data-nav-toggle]'); var n = document.querySelector('[data-nav]');
    if (!t || !n) return;
    t.addEventListener('click', function () {
      var open = n.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    n.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { n.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); t.setAttribute('aria-label', 'Menü öffnen'); }); });
  }
})();
