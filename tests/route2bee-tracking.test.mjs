import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const html = readFileSync(new URL('../route2bee/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
test('store click requires current consent and carries no invented revenue', () => {
  let click; let consent = null; const events=[];
  vm.runInNewContext(scripts.find(s=>s.includes('var APPSTORE_LABEL')), {
    document:{querySelectorAll:()=>[{addEventListener:(_,fn)=>click=fn,getAttribute:()=> 'app-store'}]},
    localStorage:{getItem:()=>consent},gtag:(...args)=>events.push(args),
  });
  click(); assert.equal(events.length,0);
  consent='denied'; click(); assert.equal(events.length,0);
  consent='granted'; click(); assert.equal(events.length,1);
  assert.equal(events[0][1],'conversion'); assert.equal(events[0][2].value,undefined);
  consent='denied'; click(); assert.equal(events.length,1);
});
test('nested Play referrer keeps ampersands and plus signs inside UTM values', () => {
  const link={href:'https://play.google.com/store/apps/details?id=com.johannwarkentin.fahrtenbuch'};
  const campaign='Kunden & Handwerk + Beratung';
  const query=new URLSearchParams({utm_source:'instagram',utm_medium:'organic_social',utm_campaign:campaign});
  vm.runInNewContext(scripts.find(s=>s.includes("var STORE_KEY = 'r2b_utm'")), {
    URL,URLSearchParams,window:{location:{search:'?'+query}},sessionStorage:{getItem:()=>null,setItem:()=>{}},document:{querySelectorAll:()=>[link]},
  });
  const referrer=new URLSearchParams(new URL(link.href).searchParams.get('referrer'));
  assert.equal(referrer.get('utm_campaign'),campaign);
  assert.equal(referrer.get('utm_medium'),'organic_social');
  assert.equal([...referrer].length,3);
});
test('marketing tags load once despite repeated acceptance', () => {
  let loads=0; const context={window:{},document:{createElement:()=>({}),head:{appendChild:()=>loads++}},Date};
  vm.createContext(context); vm.runInContext(scripts.find(s=>s.includes('function r2bLoadMarketingTags')),context);
  context.dataLayer=context.window.dataLayer;
  vm.runInContext('r2bLoadMarketingTags(); r2bLoadMarketingTags();',context);
  assert.equal(loads,1);
});
