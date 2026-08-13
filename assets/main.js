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

  /* Kontaktformular → vorausgefüllte E-Mail (funktioniert ohne Backend)
   *
   * Rückmeldung entsteht am Feld, nicht erst beim Absenden: geprüft wird beim
   * VERLASSEN eines Feldes, und ein bestehender Fehler verschwindet wieder,
   * sobald die Eingabe stimmt. Beim Tippen wird niemand angemeckert, der noch
   * gar nicht fertig ist. */
  var cf=document.getElementById('kontaktformular');
  if(cf){
    var RULES={
      name:function(v){ return v.length>=2 ? '' : 'Bitte Ihren Namen angeben.'; },
      email:function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte eine gültige E-Mail-Adresse angeben.'; },
      nachricht:function(v){ return v.length>=10 ? '' : 'Ein paar Sätze mehr helfen uns weiter (mind. 10 Zeichen).'; }
    };

    /* Statuszeile — wird angesagt, ohne den Fokus zu stehlen */
    var status=document.createElement('p');
    status.className='cf-status'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    var hint=cf.querySelector('.cf-hint');
    if(hint){cf.insertBefore(status,hint);}else{cf.appendChild(status);}

    Object.keys(RULES).forEach(function(key){
      var field=cf.elements[key]; if(!field) return;
      var label=field.closest('label'); if(!label) return;

      var msg=document.createElement('span');
      msg.className='cf-error'; msg.id='cf-err-'+key;
      msg.setAttribute('aria-live','polite');
      label.appendChild(msg);
      field.setAttribute('aria-describedby',msg.id);

      function check(show){
        var err=RULES[key](field.value.trim());
        if(err && show){
          label.classList.add('has-error'); msg.textContent=err;
          field.setAttribute('aria-invalid','true');
        }else{
          label.classList.remove('has-error'); msg.textContent='';
          field.removeAttribute('aria-invalid');
        }
        return !err;
      }
      field.__check=check;

      field.addEventListener('blur',function(){ if(field.value.trim()!=='') check(true); });
      field.addEventListener('input',function(){
        if(label.classList.contains('has-error')) check(true); // nur korrigieren, nie neu anklagen
      });
    });

    cf.setAttribute('novalidate','');
    cf.addEventListener('submit',function(e){
      e.preventDefault();
      var firstBad=null;
      Object.keys(RULES).forEach(function(key){
        var field=cf.elements[key]; if(!field||!field.__check) return;
        if(!field.__check(true) && !firstBad) firstBad=field;
      });
      if(firstBad){
        status.textContent='Bitte ergänzen Sie noch die markierten Felder.';
        status.style.color='#b3261e';
        firstBad.focus({preventScroll:false});
        return;
      }
      status.style.color='';
      status.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5 11-11"/></svg>E-Mail-Programm wird geöffnet — die Nachricht ist bereits ausgefüllt.';
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
