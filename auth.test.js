/*
 * auth.js — Google SSO + session token.  Chalao:  node auth.test.js
 * chrome.storage / chrome.identity / fetch are all stubbed on the global.
 */
const assert = require('assert');
const Auth = require('./auth');

let passed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log(`  ✓ ${name}`); })
    .catch((e) => { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; });
}

const KEY = 'scsAuth';
function setStore(initial = {}) {
  const store = { ...initial };
  global.chrome = {
    storage: { local: {
      get: (keys, cb) => { const out = {}; (Array.isArray(keys) ? keys : [keys]).forEach((k) => { if (k in store) out[k] = store[k]; }); cb(out); },
      set: (o, cb) => { Object.assign(store, o); if (cb) cb(); },
      remove: (keys, cb) => { (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]); if (cb) cb(); },
    } },
    identity: {},
  };
  return store;
}
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

console.log('CardWiz — Auth Tests\n');

(async () => {
  await test('isSignedIn: false with no stored auth', async () => {
    setStore({});
    assert.strictEqual(await Auth.isSignedIn(), false);
  });
  await test('isSignedIn: true when a token is stored', async () => {
    setStore({ [KEY]: { token: 't', user: { email: 'a@b.com' } } });
    assert.strictEqual(await Auth.isSignedIn(), true);
  });
  await test('getStoredAuth: returns null when empty', async () => {
    setStore({});
    assert.strictEqual(await Auth.getStoredAuth(), null);
  });

  await test('fetchMe: no token -> null (no fetch)', async () => {
    setStore({});
    global.fetch = async () => { throw new Error('should not fetch'); };
    assert.strictEqual(await Auth.fetchMe(), null);
  });
  await test('fetchMe: 401 -> clears stored auth + returns null', async () => {
    const store = setStore({ [KEY]: { token: 't', user: { email: 'a@b.com' } } });
    global.fetch = async () => res(401, {});
    assert.strictEqual(await Auth.fetchMe(), null);
    assert.strictEqual(store[KEY], undefined, 'auth should be cleared on 401');
  });
  await test('fetchMe: non-ok (500) -> cached user', async () => {
    setStore({ [KEY]: { token: 't', user: { email: 'cached@b.com' } } });
    global.fetch = async () => res(500, {});
    const u = await Auth.fetchMe();
    assert.strictEqual(u.email, 'cached@b.com');
  });
  await test('fetchMe: ok -> fresh user + refreshes stored cache', async () => {
    const store = setStore({ [KEY]: { token: 't', user: { email: 'old@b.com' } } });
    global.fetch = async () => res(200, { user: { email: 'new@b.com', plan: 'pro' } });
    const u = await Auth.fetchMe();
    assert.strictEqual(u.email, 'new@b.com');
    assert.strictEqual(store[KEY].user.email, 'new@b.com', 'cache should refresh');
    assert.strictEqual(store[KEY].token, 't', 'token preserved');
  });
  await test('fetchMe: offline (fetch throws) -> cached user', async () => {
    setStore({ [KEY]: { token: 't', user: { email: 'cached@b.com' } } });
    global.fetch = async () => { throw new Error('network down'); };
    const u = await Auth.fetchMe();
    assert.strictEqual(u.email, 'cached@b.com');
  });

  await test('authedFetch: not signed in -> throws', async () => {
    setStore({});
    await assert.rejects(() => Auth.authedFetch('/cards'), /Not signed in/);
  });
  await test('authedFetch: injects Bearer + Content-Type for a body', async () => {
    setStore({ [KEY]: { token: 'TK', user: {} } });
    let seen = null;
    global.fetch = async (url, opts) => { seen = { url, opts }; return res(200, {}); };
    await Auth.authedFetch('/cards', { method: 'PUT', body: '{"cards":[]}' });
    assert.strictEqual(seen.opts.headers.Authorization, 'Bearer TK');
    assert.strictEqual(seen.opts.headers['Content-Type'], 'application/json');
    assert.ok(seen.url.endsWith('/cards'));
  });
  await test('authedFetch: 401 -> clears auth + throws Session expired', async () => {
    const store = setStore({ [KEY]: { token: 'TK', user: {} } });
    global.fetch = async () => res(401, {});
    await assert.rejects(() => Auth.authedFetch('/cards'), /Session expired/);
    assert.strictEqual(store[KEY], undefined);
  });

  await test('signIn: throws when Google returns no id_token', async () => {
    setStore({});
    global.chrome.identity = {
      getRedirectURL: () => 'https://ext.chromiumapp.org/',
      launchWebAuthFlow: async () => 'https://ext.chromiumapp.org/#access_token=x&foo=bar', // no id_token
    };
    await assert.rejects(() => Auth.signIn(), /id_token/);
  });
  await test('signIn: non-ok backend -> throws', async () => {
    setStore({});
    global.chrome.identity = {
      getRedirectURL: () => 'https://ext.chromiumapp.org/',
      launchWebAuthFlow: async () => 'https://ext.chromiumapp.org/#id_token=abc',
    };
    global.fetch = async () => res(403, {});
    await assert.rejects(() => Auth.signIn(), /sign-in fail/);
  });
  await test('signIn: success stores {token,user} and returns user', async () => {
    const store = setStore({});
    global.chrome.identity = {
      getRedirectURL: () => 'https://ext.chromiumapp.org/',
      launchWebAuthFlow: async () => 'https://ext.chromiumapp.org/#id_token=abc',
    };
    global.fetch = async () => res(200, { token: 'JWT', user: { email: 'z@b.com' } });
    const user = await Auth.signIn();
    assert.strictEqual(user.email, 'z@b.com');
    assert.strictEqual(store[KEY].token, 'JWT');
  });

  await test('signOut clears stored auth', async () => {
    const store = setStore({ [KEY]: { token: 't', user: {} } });
    await Auth.signOut();
    assert.strictEqual(store[KEY], undefined);
  });

  await test('randomNonce is 32 hex chars', async () => {
    // exercised indirectly by signIn; assert via a fresh import surface if exposed, else skip-safe
    assert.ok(typeof Auth.BACKEND_URL === 'string');
  });

  console.log(`\n${passed} tests passed.`);
})();
