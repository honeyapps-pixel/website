import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const pages = ['kundenfahrten/index.html', 'ratgeber/erste-automatische-fahrt.html'];
function visit(page, search, sessionStorage) {
  const html = readFileSync(new URL('../route2bee/' + page, import.meta.url), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(source => source.includes('First-party campaign link propagation'));
  const link = { href: 'https://play.google.com/store/apps/details?id=com.johannwarkentin.fahrtenbuch' };
  vm.runInNewContext(script, {
    URL, URLSearchParams, location: { search }, sessionStorage,
    document: { querySelectorAll: () => [link] },
  });
  return new URLSearchParams(new URL(link.href).searchParams.get('referrer'));
}
test('campaign survives customer landing → setup guide → Android store', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const campaign = 'Kunden & Handwerk + Beratung';
  visit(pages[0], '?' + new URLSearchParams({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: campaign, ignored: 'no' }), storage);
  const referrer = visit(pages[1], '', storage);
  assert.equal(referrer.get('utm_source'), 'google');
  assert.equal(referrer.get('utm_medium'), 'cpc');
  assert.equal(referrer.get('utm_campaign'), campaign);
  assert.equal(referrer.has('ignored'), false);
  assert.equal([...referrer].length, 3);
});
test('new campaign replaces stale source and does not inherit old fields', () => {
  let stored = JSON.stringify({ utm_source: 'facebook', utm_campaign: 'old', utm_content: 'old-creative' });
  const storage = { getItem: () => stored, setItem: (_, value) => stored = value };
  visit(pages[1], '?utm_source=instagram&utm_medium=organic_social', storage);
  const referrer = visit(pages[0], '', storage);
  assert.equal(referrer.get('utm_source'), 'instagram');
  assert.equal(referrer.get('utm_content'), null);
  assert.equal(referrer.get('utm_campaign'), null);
});
test('blocked browser storage still permits direct campaign store links', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  for (const page of pages) {
    assert.equal(visit(page, '?utm_source=google&utm_medium=cpc', storage).get('utm_source'), 'google');
    assert.equal(visit(page, '', storage).get('utm_medium'), 'organic');
  }
});
