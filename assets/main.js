/* Honeyapps — ergänzt die Motion-Engine (assets/motion.js).
 * Aufgaben: Body-Scroll-Lock + Escape fürs Mobil-Menü, Failsafe für blockierte CDNs.
 * Die Engine selbst toggelt [data-nav].open via [data-nav-toggle] und schließt bei Link-Klick. */
(function(){
  'use strict';

  /* Body-Scroll-Lock, solange das Mobil-Menü offen ist (beobachtet die .open-Klasse) */
  var nav = document.querySelector('[data-nav]');
  var toggle = document.querySelector('[data-nav-toggle]');
  if(nav){
    new MutationObserver(function(){
      document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    }).observe(nav,{attributes:true,attributeFilter:['class']});

    /* Escape schließt das Menü */
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && nav.classList.contains('open')){
        nav.classList.remove('open');
        if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');}
      }
    });
  }

  /* Failsafe: Falls die Motion-Engine nicht startet (z. B. assets/motion.js blockiert),
   * Reveals nach kurzer Zeit sichtbar schalten — nichts bleibt unsichtbar. */
  setTimeout(function(){
    if(!window.__motionReady){
      document.documentElement.classList.remove('anim');
      document.querySelectorAll('[data-reveal]').forEach(function(el){
        el.style.opacity=1;el.style.transform='none';el.style.clipPath='none';
      });
    }
  },1400);

  /* Kontaktformular → vorausgefüllte E-Mail (funktioniert ohne Backend) */
  var cf=document.getElementById('kontaktformular');
  if(cf){
    cf.addEventListener('submit',function(e){
      e.preventDefault();
      var g=function(k){var el=cf.elements[k];return el?el.value.trim():'';};
      var subj='Projektanfrage über honeyapps.de';
      var body='Name: '+g('name')+'\nE-Mail: '+g('email')+'\n\n'+g('nachricht');
      window.location.href='mailto:info@honeyapps.de?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
    });
  }
})();

/* ---------- DSGVO Consent (Google Consent Mode v2) ----------
 * Tracking (Google Ads/gtag) startet erst nach „Akzeptieren". Default = denied (im <head> gesetzt).
 * Läuft nur auf Seiten mit gtag. Auswahl wird in localStorage gemerkt. */
(function(){
  'use strict';
  if(typeof window.gtag!=='function') return;        // keine Tracking-Einbindung → kein Banner
  var KEY='ha-consent-v1', stored=null;
  function update(state){
    window.gtag('consent','update',{ad_storage:state,ad_user_data:state,ad_personalization:state,analytics_storage:state});
  }
  try{stored=localStorage.getItem(KEY);}catch(e){}
  if(stored==='granted'){update('granted');return;}
  if(stored==='denied'){return;}                     // bleibt auf denied (Default)

  var bar=document.createElement('div');
  bar.className='consent'; bar.setAttribute('role','dialog'); bar.setAttribute('aria-label','Cookie-Hinweis');
  bar.innerHTML='<p>Wir nutzen Cookies für anonyme Statistik und Marketing (Google&nbsp;Ads). Du entscheidest. <a href="/datenschutz.html">Mehr in der Datenschutzerklärung</a>.</p>'+
    '<div class="consent-actions"><button class="btn btn-line consent-decline" type="button">Ablehnen</button><button class="btn btn-solid consent-accept" type="button">Akzeptieren</button></div>';
  function choose(v){try{localStorage.setItem(KEY,v);}catch(e){} if(v==='granted')update('granted'); bar.remove();}
  document.body.appendChild(bar);
  bar.querySelector('.consent-accept').addEventListener('click',function(){choose('granted');});
  bar.querySelector('.consent-decline').addEventListener('click',function(){choose('denied');});
})();
