/*
 * sync.js network path (pull / push / syncNow).  Chalao:  node sync-network.test.js
 * CardWizAuth.authedFetch is stubbed on the global so no real network is hit.
 */
const assert = require('assert');
const S = require('./sync');

let passed = 0;
function test(name, fn) {
  const p = Promise.resolve().then(fn);
  return p.then(() => { passed++; console.log(`  ✓ ${name}`); })
          .catch((e) => { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; });
}

// Response-like stub.
function res(ok, body, status = ok ? 200 : 500) {
  return { ok, status, json: async () => body };
}
// Install a stub authedFetch; returns the calls it saw.
function stubAuth(handler) {
  const calls = [];
  global.CardWizAuth = { authedFetch: async (path, opts) => { calls.push({ path, opts }); return handler(path, opts); } };
  return calls;
}

console.log('CardWiz — Card Sync (network) Tests\n');

(async () => {
  await test('pull: ok -> returns data.cards array', async () => {
    stubAuth(() => res(true, { cards: [{ id: 'a' }, { id: 'b' }] }));
    const r = await S.pull();
    assert.deepStrictEqual(r.map((c) => c.id), ['a', 'b']);
  });

  await test('pull: ok but non-array cards -> []', async () => {
    stubAuth(() => res(true, { cards: 'nope' }));
    assert.deepStrictEqual(await S.pull(), []);
  });

  await test('pull: non-ok -> throws', async () => {
    stubAuth(() => res(false, {}, 500));
    await assert.rejects(() => S.pull(), /pull fail 500/);
  });

  await test('push: ok -> returns data.cards; sends PUT with body', async () => {
    const calls = stubAuth(() => res(true, { cards: [{ id: 'x' }] }));
    const r = await S.push([{ id: 'x' }]);
    assert.deepStrictEqual(r, [{ id: 'x' }]);
    assert.strictEqual(calls[0].opts.method, 'PUT');
    assert.ok(calls[0].opts.body.includes('"cards"'));
  });

  await test('push: non-ok -> throws', async () => {
    stubAuth(() => res(false, {}, 403));
    await assert.rejects(() => S.push([]), /push fail 403/);
  });

  await test('syncNow: pull -> merge(local,remote) -> push(merged) -> return merged', async () => {
    const t1 = '2026-01-01T00:00:00.000Z';
    const t2 = '2026-02-01T00:00:00.000Z';
    const remote = [{ id: 'a', cardId: 'OLD', updatedAt: t1 }, { id: 'r', cardId: 'R', updatedAt: t1 }];
    let pushed = null;
    global.CardWizAuth = { authedFetch: async (path, opts) => {
      if (opts.method === 'GET') return res(true, { cards: remote });
      pushed = JSON.parse(opts.body).cards; return res(true, { cards: pushed });
    } };
    const local = [{ id: 'a', cardId: 'NEW', updatedAt: t2 }, { id: 'l', cardId: 'L', updatedAt: t1 }];
    const merged = await S.syncNow(local);
    const byId = Object.fromEntries(merged.map((c) => [c.id, c.cardId]));
    assert.strictEqual(byId.a, 'NEW');   // local newer wins
    assert.strictEqual(byId.r, 'R');     // remote-only kept
    assert.strictEqual(byId.l, 'L');     // local-only kept
    assert.deepStrictEqual(pushed.map((c) => c.id).sort(), ['a', 'l', 'r']); // pushed the merged set
  });

  await test('syncNow: idempotent second run yields same set', async () => {
    const t1 = '2026-01-01T00:00:00.000Z';
    let store = [{ id: 'a', cardId: 'X', updatedAt: t1 }];
    global.CardWizAuth = { authedFetch: async (path, opts) => {
      if (opts.method === 'GET') return res(true, { cards: store });
      store = JSON.parse(opts.body).cards; return res(true, { cards: store });
    } };
    const first = await S.syncNow([{ id: 'a', cardId: 'X', updatedAt: t1 }]);
    const second = await S.syncNow(first);
    assert.deepStrictEqual(first.map((c) => c.id).sort(), second.map((c) => c.id).sort());
  });

  console.log(`\n${passed} tests passed.`);
})();
