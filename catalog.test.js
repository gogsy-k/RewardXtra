/*
 * catalog.js — cache-first load() + background refresh.  Chalao:  node catalog.test.js
 * chrome.storage + fetch are stubbed on the global (no real network / no browser).
 */
const assert = require('assert');
const C = require('./catalog');

let passed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((e) => { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; });
}

const CACHE_KEY = 'rxCatalog_v2';
const tick = () => new Promise((r) => setTimeout(r, 15));

function mockChrome(store) {
  global.chrome = {
    storage: { local: {
      get: (keys, cb) => { const out = {}; (Array.isArray(keys) ? keys : [keys]).forEach((k) => { if (k in store) out[k] = store[k]; }); cb(out); },
      set: (o, cb) => { Object.assign(store, o); if (cb) cb(); },
      remove: (keys, cb) => { (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]); if (cb) cb(); },
    } },
    runtime: { getURL: (p) => 'mock://' + p },
  };
}
// catalogFetch(url,opts) handles /catalog; bundled always served for cards.json.
function mockFetch(bundled, catalogFetch) {
  global.fetch = async (url, opts) => {
    if (String(url).includes('cards.json')) return { ok: true, json: async () => bundled };
    return catalogFetch(url, opts);
  };
}

const BUNDLED = { cards: [{ id: 'bundled1' }], categories: ['amazon'] };

console.log('CardWiz — Catalog (cache-first) Tests\n');

(async () => {
  await test('no cache -> returns bundled data instantly', async () => {
    mockChrome({});
    mockFetch(BUNDLED, async () => { throw new Error('backend should not block load'); });
    const data = await C.load();
    assert.deepStrictEqual(data, BUNDLED);
  });

  await test('cache-first: valid v2 cache returned, bundled NOT fetched', async () => {
    const store = { [CACHE_KEY]: { data: { cards: [{ id: 'cached1' }] }, fetchedAt: 1, v: 2 } };
    mockChrome(store);
    let bundledHit = false;
    global.fetch = async (url) => { if (String(url).includes('cards.json')) { bundledHit = true; return { ok: true, json: async () => BUNDLED }; } return { ok: false, status: 503, json: async () => ({}) }; };
    const data = await C.load();
    assert.strictEqual(data.cards[0].id, 'cached1');
    assert.strictEqual(bundledHit, false, 'bundled file should not be fetched when cache is valid');
  });

  await test('version mismatch (v!=2) -> cache rejected -> bundled fallback', async () => {
    mockChrome({ [CACHE_KEY]: { data: { cards: [{ id: 'stale' }] }, fetchedAt: 1, v: 1 } });
    mockFetch(BUNDLED, async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const data = await C.load();
    assert.deepStrictEqual(data, BUNDLED);
  });

  await test('background refresh never blocks load() (backend hangs)', async () => {
    mockChrome({});
    mockFetch(BUNDLED, () => new Promise(() => {})); // /catalog never resolves
    const data = await Promise.race([C.load(), new Promise((_, rej) => setTimeout(() => rej(new Error('load() blocked')), 500))]);
    assert.deepStrictEqual(data, BUNDLED);
  });

  await test('background refresh updates the cache on a successful /catalog', async () => {
    const store = {};
    mockChrome(store);
    const fresh = { cards: [{ id: 'fresh1' }], categories: ['amazon'] };
    mockFetch(BUNDLED, async () => ({ ok: true, json: async () => fresh }));
    await C.load();          // returns bundled immediately
    await tick();            // let the fire-and-forget refresh land
    assert.ok(store[CACHE_KEY], 'cache should be written');
    assert.strictEqual(store[CACHE_KEY].v, 2);
    assert.deepStrictEqual(store[CACHE_KEY].data, fresh);
  });

  await test('background refresh: non-ok /catalog leaves cache untouched', async () => {
    const store = {};
    mockChrome(store);
    mockFetch(BUNDLED, async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await C.load();
    await tick();
    assert.strictEqual(store[CACHE_KEY], undefined, 'cache must not be written on non-ok');
  });

  await test('invalidate() removes the cache key', async () => {
    const store = { [CACHE_KEY]: { data: {}, v: 2 } };
    mockChrome(store);
    await C.invalidate();
    assert.strictEqual(store[CACHE_KEY], undefined);
  });

  await test('no chrome/fetch -> load() still returns something (Node-safe guards)', async () => {
    delete global.chrome;
    // fetch still needed for bundled; keep a minimal one
    global.fetch = async () => ({ ok: true, json: async () => BUNDLED });
    const data = await C.load();
    assert.deepStrictEqual(data, BUNDLED);
  });

  console.log(`\n${passed} tests passed.`);
})();
