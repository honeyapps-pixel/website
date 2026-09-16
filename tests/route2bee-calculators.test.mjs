import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
function calculator(file) {
  const html = readFileSync(new URL('../route2bee/ratgeber/' + file, import.meta.url), 'utf8');
  const elements = Object.fromEntries([...html.matchAll(/<input id="([^"]+)"[^>]*value="([^"]*)"/g)].map(([,id,value]) => [id, { value }]));
  for (const id of ['v-out-1','v-out-fb','v-verdict','km-deductible','km-saving']) elements[id] = { textContent:'', style:{} };
  for (const e of Object.values(elements)) e.addEventListener = (_, handler) => { e.update = handler; };
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([,s]) => s.includes('function update'))[1];
  vm.runInNewContext(script, { document:{ getElementById:id=>elements[id] } });
  return { elements, set(id, value) { elements[id].value = value; elements[id].update(); } };
}
test('employee comparison includes commute on both sides', () => {
  const c = calculator('fahrtenbuch-oder-1-prozent-regelung.html');
  assert.equal(c.elements['v-out-1'].textContent, '8.640 €');
  assert.equal(c.elements['v-out-fb'].textContent, '4.200 €');
  c.set('v-work', '0'); c.set('v-km', '0');
  assert.equal(c.elements['v-out-1'].textContent, '5.400 €');
  assert.equal(c.elements['v-out-fb'].textContent, '3.000 €');
  c.set('v-priv', '95'); c.set('v-work', '10');
  assert.equal(c.elements['v-out-fb'].textContent, '—');
  c.set('v-work', '-1'); assert.equal(c.elements['v-out-1'].textContent, '—');
  c.set('v-work', '0'); c.set('v-kosten', ''); assert.equal(c.elements['v-out-fb'].textContent, '—');
});
test('travel deduction differs from approximate tax saving and rejects bad input', () => {
  const c = calculator('kilometergeld-2026-absetzen.html');
  assert.equal(c.elements['km-deductible'].textContent, '3.000 €');
  assert.equal(c.elements['km-saving'].textContent, '900 €');
  for (const bad of ['-10','Infinity','']) { c.set('km-input', bad); assert.equal(c.elements['km-deductible'].textContent, '—'); }
  c.set('km-input','0'); assert.equal(c.elements['km-saving'].textContent,'0 €');
  c.set('tax-input','51'); assert.equal(c.elements['km-deductible'].textContent,'—');
});
