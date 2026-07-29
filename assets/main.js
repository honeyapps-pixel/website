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

/* ---------- DSGVO Consent ----------
 * Umgezogen nach /assets/consent.js (im <head> eingebunden). Grund: gtag.js darf
 * erst NACH der Zustimmung vom Google-Server geladen werden — das muss passieren,
 * bevor main.js am Seitenende überhaupt läuft. Nicht hierher zurückholen, sonst
 * gibt es zwei Banner. */
