/* Honeyapps — DSGVO/TDDDG-Consent für Google Ads (gtag.js)
 *
 * Wichtig: gtag.js wird ERST nach aktiver Zustimmung vom Google-Server geladen.
 * Vorher verlässt kein Request die Seite — auch keine IP-Übertragung an Google.
 * Bis dahin sammelt der dataLayer-Stub die Events nur lokal ein; nach dem
 * Nachladen arbeitet Google sie ab (Consent Mode v2, Default = denied).
 *
 * Selbst gestylt, damit die Datei unabhängig von main.css/style.css auf allen
 * Seitengenerationen identisch funktioniert.
 */
(function () {
  'use strict';

  var ADS_ID = 'AW-18145804367';
  var KEY = 'ha-consent-v1';
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Default denied — muss vor jedem anderen gtag-Aufruf stehen.
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied',
    ad_personalization: 'denied', analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', ADS_ID);

  var loaded = false;
  function loadGtag() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ADS_ID;
    document.head.appendChild(s);
  }

  function grant() { gtag('consent', 'update', GRANTED); loadGtag(); }
  function deny() {
    gtag('consent', 'update', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
  }

  var styled = false;
  function injectStyles() {
    if (styled) return;
    styled = true;
    var css = document.createElement('style');
    css.textContent =
      '.ha-consent{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483000;max-width:540px;' +
      'margin-inline:auto;background:#1d1d1f;color:#fff;border-radius:12px;padding:1.1rem 1.3rem;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.32);display:flex;flex-direction:column;gap:.9rem;' +
      'font-family:inherit;font-size:.86rem;line-height:1.5}' +
      '.ha-consent p{margin:0;color:rgba(255,255,255,.82)}' +
      '.ha-consent a{color:#8fd0ff;text-decoration:underline}' +
      '.ha-consent-actions{display:flex;gap:.6rem;justify-content:flex-end}' +
      '.ha-consent button{font:inherit;font-weight:600;cursor:pointer;border-radius:6px;padding:.6em 1.2em;' +
      'border:1px solid transparent;transition:opacity .2s}' +
      '.ha-consent button:hover{opacity:.85}' +
      '.ha-consent-decline{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}' +
      '.ha-consent-accept{background:#fff;color:#1d1d1f}' +
      '@media(max-width:480px){.ha-consent-actions{justify-content:stretch}.ha-consent button{flex:1}}';
    document.head.appendChild(css);
  }

  function banner() {
    injectStyles();

    var bar = document.createElement('div');
    bar.className = 'ha-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie-Hinweis');
    bar.innerHTML =
      '<p>Wir nutzen Cookies für Marketing (Google&nbsp;Ads). Ohne deine Zustimmung wird nichts geladen ' +
      'und keine Daten an Google übertragen. <a href="/datenschutz.html">Mehr in der Datenschutzerklärung</a>.</p>' +
      '<div class="ha-consent-actions">' +
      '<button type="button" class="ha-consent-decline">Ablehnen</button>' +
      '<button type="button" class="ha-consent-accept">Akzeptieren</button></div>';

    function choose(v) {
      try { localStorage.setItem(KEY, v); } catch (e) {}
      if (v === 'granted') { grant(); } else { deny(); }
      bar.remove();
    }
    document.body.appendChild(bar);
    bar.querySelector('.ha-consent-accept').addEventListener('click', function () { choose('granted'); });
    bar.querySelector('.ha-consent-decline').addEventListener('click', function () { choose('denied'); });
  }

  // Widerruf muss so einfach sein wie die Erteilung (Art. 7 Abs. 3 DSGVO):
  // hängt einen „Cookie-Einstellungen“-Link in die Fußzeile jeder Seite,
  // die diese Datei einbindet.
  function revokeLink() {
    var host = document.querySelector('.footer-bottom-links');
    if (!host || host.querySelector('.ha-consent-reset')) return;
    var a = document.createElement('a');
    a.href = '#';
    a.className = 'ha-consent-reset';
    a.textContent = 'Cookie-Einstellungen';
    a.addEventListener('click', function (e) { e.preventDefault(); window.haConsentReset(); });
    host.appendChild(a);
  }

  window.haConsentReset = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    var old = document.querySelector('.ha-consent');
    if (old) old.remove();
    banner();
  };

  function init() {
    revokeLink();
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    if (stored === 'granted') { grant(); return; }
    if (stored === 'denied') { return; }
    banner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
