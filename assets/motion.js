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

  /* Brücke zwischen Menü und Header: solange das Blatt offen ist, braucht es
     tragende Chrome darunter. (Oben deklariert — die Zuweisung darf nicht
     nach den init-Aufrufen stehen, sonst überschreibt sie sie wieder.) */
  var headerSync = null;
  var navOpen = false;

  /* ======================================================================
     SPRING — für alles, was der Nutzer anfassen kann.
     Eine Animation mit fester Dauer kann auf neue Eingaben nicht reagieren;
     eine Feder schon: ein neues Ziel ändert nur das Ziel, die Bewegung läuft
     ohne Sprung weiter. Sie startet immer beim AKTUELLEN Bildschirmwert und
     nimmt die Geschwindigkeit mit — deshalb lässt sie sich jederzeit greifen
     und umkehren.

     Parametrisiert wie bei Apple, nicht über Masse/Steifigkeit:
       damping  1.0 = kritisch gedämpft, kein Überschwingen (Standard)
                ~0.8 = leichter Nachschwinger — NUR wenn die Geste selbst
                       Schwung hatte (Wischen, Werfen)
       response = wie schnell der Wert das Ziel erreicht (Sekunden).
                  Das ist KEINE Dauer: die Einschwingzeit ergibt sich.
     ====================================================================== */
  var springs = [];
  var springRAF = null;
  var springLast = 0;

  function springTick(now) {
    var dt = Math.min((now - springLast) / 1000, 0.064); // Tab-Wechsel abfangen
    springLast = now;
    for (var i = springs.length - 1; i >= 0; i--) {
      var s = springs[i];
      // Feste Substeps: sonst wird die Integration bei Frame-Drops instabil.
      var steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      var h = dt / steps;
      for (var n = 0; n < steps; n++) {
        var a = -s.k * (s.x - s.target) - s.c * s.v;
        s.v += a * h;
        s.x += s.v * h;
      }
      s.onUpdate(s.x, s.v);
      if (Math.abs(s.x - s.target) < s.eps && Math.abs(s.v) < s.eps * 12) {
        s.x = s.target; s.v = 0;
        s.onUpdate(s.x, s.v);
        springs.splice(i, 1);
        if (s.onRest) s.onRest();
      }
    }
    springRAF = springs.length ? requestAnimationFrame(springTick) : null;
  }

  function startSpringLoop() {
    if (springRAF) return;
    springLast = performance.now();
    springRAF = requestAnimationFrame(springTick);
  }

  function createSpring(opts) {
    var s = {
      x: opts.from || 0,
      v: opts.velocity || 0,
      target: opts.from || 0,
      eps: opts.eps || 0.25,
      onUpdate: opts.onUpdate || function () {},
      onRest: opts.onRest || null,
      k: 0, c: 0
    };
    s.tune = function (damping, response) {
      var omega = (2 * Math.PI) / response;
      s.k = omega * omega;          // Steifigkeit
      s.c = 2 * damping * omega;    // Dämpfung
    };
    s.tune(opts.damping == null ? 1.0 : opts.damping, opts.response || 0.4);

    return {
      /* Neues Ziel. Die vorhandene Geschwindigkeit wird MITGENOMMEN — genau das
         verhindert die „Wand", wenn eine Geste mitten in der Bewegung umkehrt. */
      to: function (target, cfg) {
        cfg = cfg || {};
        if (cfg.damping != null || cfg.response != null)
          s.tune(cfg.damping == null ? 1.0 : cfg.damping, cfg.response || 0.4);
        if (cfg.velocity != null) s.v = cfg.velocity;
        s.target = target;
        if (springs.indexOf(s) === -1) springs.push(s);
        startSpringLoop();
      },
      /* Während einer Geste: Position direkt setzen, Feder pausiert. */
      set: function (x, v) {
        var i = springs.indexOf(s);
        if (i !== -1) springs.splice(i, 1);
        s.x = x; s.v = v || 0; s.target = x;
        s.onUpdate(s.x, s.v);
      },
      value: function () { return s.x; },
      velocity: function () { return s.v; },
      stop: function () {
        var i = springs.indexOf(s);
        if (i !== -1) springs.splice(i, 1);
        s.v = 0;
      }
    };
  }

  /* Ruhepunkt einer Wurfbewegung — dieselbe exponentielle Abbremsung wie beim
     Scrollen. Wichtig: NICHT zum nächsten Rastpunkt ab dem Loslass-Punkt
     springen, sondern dorthin, wo die Geste HIN WOLLTE. */
  function project(velocity, decelerationRate) {
    var d = decelerationRate || 0.998;
    return (velocity / 1000) * d / (1 - d);
  }

  /* Weiche Grenze: je weiter darüber hinaus, desto weniger folgt das Element.
     Ein harter Stopp liest sich als „eingefroren", nachgebender Widerstand als
     „reagiert — hier ist nur nichts mehr". */
  function rubberband(overshoot, dimension, constant) {
    var c = constant || 0.55;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

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
    initPressFeedback();
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
  initPressFeedback();

  /* ---------- Header: Material fährt STUFENLOS mit dem Scroll hoch ----------
   * Ein Umschalten bei 40 px ist ein Ereignis; ein durchgehender Verlauf ist
   * Rückmeldung. `--chrome` (0→1) steuert Deckkraft, Blur und Scroll-Edge. */
  function initHeaderState() {
    var header = document.querySelector('[data-header]') || document.querySelector('header');
    if (!header) return;
    var RAMP = 80, ticking = false, last = -1;
    function apply() {
      ticking = false;
      var c = Math.min(1, Math.max(0, window.scrollY / RAMP));
      if (navOpen) c = 1; // offenes Menü braucht tragende Chrome darunter
      if (Math.abs(c - last) < 0.005) return;
      last = c;
      header.style.setProperty('--chrome', c.toFixed(3));
      header.classList.toggle('scrolled', c > 0.5);
    }
    headerSync = apply;
    apply();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
  }

  /* ---------- Mobiles Menü: federnd, greifbar, jederzeit umkehrbar ----------
   * Das Blatt hängt an einer Feder statt an einer CSS-Transition. Dadurch:
   *   · ein Tap mitten in der Bewegung kehrt sie um, ohne zu springen (§3)
   *   · es lässt sich mit dem Finger 1:1 nach oben wegwischen (§2)
   *   · beim Loslassen zählt, wohin die Geste WOLLTE, nicht wo sie endete (§6)
   *   · die Wurfgeschwindigkeit geht nahtlos in die Feder über (§5)
   *   · über die Öffnungsposition hinaus federt es weich zurück (§9)
   */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) return;

    var mq = window.matchMedia('(max-width:920px)');

    function syncToggle(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    }

    /* Reduzierte Bewegung: keine Feder, keine Geste — nur die Überblendung,
       die das Stylesheet ohnehin liefert. Ein sanfteres Äquivalent, nicht
       „gar kein Feedback". */
    if (reduce) {
      toggle.addEventListener('click', function () { syncToggle(nav.classList.toggle('open')); });
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); syncToggle(false); });
      });
      return;
    }

    document.documentElement.classList.add('js-nav-spring');

    /* Der Scrim gehört an den Body, NICHT neben die Nav: die liegt im Header,
       und dessen Stapelkontext würde den Scrim über den Menü-Button legen —
       dann ließe sich das Menü nicht mehr schließen. */
    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scrim);

    var grip = document.createElement('span');
    grip.className = 'nav-grip';
    grip.setAttribute('aria-hidden', 'true');
    nav.insertBefore(grip, nav.firstChild);

    var H = 1, handoffVelocity = null, dragging = false;

    function measure() { H = Math.max(1, nav.offsetHeight); }

    function render(y) {
      var p = Math.min(1, Math.max(0, 1 + y / H)); // 1 = offen, 0 = zu
      nav.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      nav.style.opacity = p.toFixed(3);
      nav.style.pointerEvents = p > 0.02 ? 'auto' : 'none';
      scrim.style.opacity = p.toFixed(3);
      scrim.classList.toggle('is-active', p > 0.02);
      navOpen = p > 0.5;
      if (headerSync) headerSync();
    }

    var sheet = createSpring({
      from: -1, damping: 1.0, response: 0.34,
      onUpdate: function (y) { render(y); },
      onRest: function () { nav.style.willChange = ''; }
    });

    function settle(open, velocity) {
      nav.style.willChange = 'transform,opacity';
      sheet.to(open ? 0 : -H, {
        velocity: velocity,
        // Nachschwingen nur, wenn die Geste selbst Schwung hatte.
        damping: velocity ? 0.82 : 1.0,
        response: velocity ? 0.3 : 0.34
      });
    }

    /* Die `.open`-Klasse bleibt der Zustand — so wirken auch Escape und
       Link-Klicks aus main.js weiter, ohne dass sie die Feder kennen müssen. */
    new MutationObserver(function () {
      if (dragging || !mq.matches) return;
      var open = nav.classList.contains('open');
      syncToggle(open);
      if (open) measure();
      settle(open, handoffVelocity);
      handoffVelocity = null;
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });

    function setOpen(open, velocity) {
      handoffVelocity = velocity || null;
      if (nav.classList.contains('open') === open) {
        // Zustand stimmt schon — die Feder trotzdem neu ausrichten (Umkehr).
        settle(open, velocity);
        handoffVelocity = null;
      } else {
        nav.classList.toggle('open', open);
      }
    }

    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    scrim.addEventListener('click', function () { setOpen(false); });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    /* ---- Wischen: 1:1 am Finger, Umkehr jederzeit ---- */
    var startY = 0, startPos = 0, captured = false, samples = [];
    var THRESHOLD = 10; // erst ab ~10 px auf eine Richtung festlegen

    nav.addEventListener('pointerdown', function (e) {
      if (!mq.matches || e.pointerType === 'mouse') return;
      if (nav.offsetHeight > window.innerHeight - 68) return; // dann lieber scrollen lassen
      measure();
      dragging = true; captured = false;
      startY = e.clientY;
      startPos = sheet.value();
      samples = [{ y: e.clientY, t: performance.now() }];
      sheet.stop();
    });

    nav.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = e.clientY - startY;
      if (!captured) {
        if (Math.abs(dy) < THRESHOLD) return;
        captured = true;
        nav.setPointerCapture(e.pointerId);
        nav.style.willChange = 'transform,opacity';
      }
      var y = startPos + dy;
      if (y > 0) y = rubberband(y, H); // über „offen" hinaus: weicher Widerstand
      if (y < -H) y = -H - rubberband(-(y + H), H);
      samples.push({ y: e.clientY, t: performance.now() });
      if (samples.length > 6) samples.shift();
      sheet.set(y, 0);
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (!captured) return;
      captured = false;
      if (nav.hasPointerCapture && nav.hasPointerCapture(e.pointerId)) nav.releasePointerCapture(e.pointerId);

      // Geschwindigkeit aus den letzten Samples, nicht aus dem letzten Punkt
      var v = 0, first = samples[0], lastS = samples[samples.length - 1];
      if (first && lastS && lastS.t > first.t) v = (lastS.y - first.y) / ((lastS.t - first.t) / 1000);

      var pos = sheet.value();
      var projected = pos + project(v);           // wohin die Geste wollte
      var open = projected > -H / 2;
      if (Math.abs(v) > 320) open = v > 0;        // klarer Wurf schlägt Position
      setOpen(open, v);
    }
    nav.addEventListener('pointerup', endDrag);
    nav.addEventListener('pointercancel', endDrag);

    /* Breitenwechsel: auf Desktop alle Inline-Werte zurückgeben. */
    function syncViewport() {
      if (mq.matches) {
        measure();
        // `set` statt `render`: die Feder muss den Wert kennen, der WIRKLICH auf
        // dem Schirm steht. Rendert man nur, glaubt sie weiter ihren alten Wert
        // und springt beim nächsten Ziel, statt von dort loszulaufen.
        sheet.set(nav.classList.contains('open') ? 0 : -H, 0);
      } else {
        sheet.stop();
        nav.style.cssText = '';
        scrim.style.cssText = '';
        scrim.classList.remove('is-active');
        nav.classList.remove('open');
        navOpen = false;
        syncToggle(false);
        if (headerSync) headerSync();
      }
    }
    if (mq.addEventListener) mq.addEventListener('change', syncViewport);
    window.addEventListener('resize', function () { if (mq.matches && !nav.classList.contains('open')) syncViewport(); }, { passive: true });
    syncViewport();
  }

  /* ---------- Press-Feedback beim DRÜCKEN, nicht beim Loslassen ----------
   * Sichtbar ab pointerdown; zieht der Finger weg, geht es zurück und kommt
   * wieder, wenn er zurückkehrt (Abbrechen durch Wegziehen, §10). */
  function initPressFeedback() {
    var SEL = '.btn,.app-card,.card,.pillar,.shot,.store-badge,.vit,.nav-toggle,' +
              '.arrow-link,.nav a,.footer-col a,.footer-bottom-links a';
    var el = null, pid = null;

    function within(e) {
      if (!el) return false;
      var r = el.getBoundingClientRect(), m = 10; // ~10 px Hysterese
      return e.clientX >= r.left - m && e.clientX <= r.right + m &&
             e.clientY >= r.top - m && e.clientY <= r.bottom + m;
    }
    function release() {
      if (el) el.classList.remove('is-pressed');
      el = null; pid = null;
    }

    document.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var hit = e.target.closest && e.target.closest(SEL);
      if (!hit) return;
      release();
      el = hit; pid = e.pointerId;
      el.classList.add('is-pressed');
    }, { passive: true });

    document.addEventListener('pointermove', function (e) {
      if (!el || e.pointerId !== pid) return;
      el.classList.toggle('is-pressed', within(e));
    }, { passive: true });

    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    window.addEventListener('blur', release);
  }
})();
