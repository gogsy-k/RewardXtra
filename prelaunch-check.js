/*
 * CardWiz — Pre-launch production-flag guard.
 * Chalao:  node prelaunch-check.js   (RUN THIS BEFORE building the Chrome Web Store zip)
 *
 * This is DELIBERATELY separate from `npm test` — during local dev the flags below are ON,
 * and that's correct. This script fails the moment a debug/localhost build would ship.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); }

let manifest = {};
try { manifest = JSON.parse(read('manifest.json')); } catch (e) { check('manifest.json parses', false, e.message); }

const catalog = safe(() => read('catalog.js'));
const auth = safe(() => read('auth.js'));
const debugjs = safe(() => read('debug.js'));
const contentDetect = safe(() => read('content-detect.js'));
const popup = safe(() => read('popup-smartcard.js'));
function safe(fn) { try { return fn(); } catch { return ''; } }

// ---- flag checks ----
// Anchor on the real `const NAME = true;` declaration so a "…= false karo" COMMENT
// never yields a false pass. A flag is BAD (dev build) when its declaration is `= true`.
const declTrue = (src, name) => new RegExp('const\\s+' + name + '\\s*=\\s*true\\b').test(src);
check('catalog.js  CATALOG_USE_LOCAL = false', !declTrue(catalog, 'CATALOG_USE_LOCAL'),
  'catalog would hit http://localhost:3000');
check('auth.js     USE_LOCAL_BACKEND = false', !declTrue(auth, 'USE_LOCAL_BACKEND'),
  'auth would hit http://localhost:3000');
check('debug.js    CW_DEBUG_ALL = false', !declTrue(debugjs, 'CW_DEBUG_ALL'),
  'verbose logging left on');
check('content-detect.js  CW_DEBUG = false', !declTrue(contentDetect, 'CW_DEBUG'),
  'widget logs verbose traces');
check('popup  ONBOARD_ALWAYS = false', !declTrue(popup, 'ONBOARD_ALWAYS'),
  'onboarding would force-show every open');

// ---- manifest checks ----
const manifestStr = JSON.stringify(manifest);
check('manifest has NO localhost host permission', !/localhost/.test(manifestStr),
  'remove http://localhost:3000/* from host_permissions');
check('manifest homepage_url is not the github placeholder',
  !!manifest.homepage_url && !/^https:\/\/github\.com\/?$/.test(manifest.homepage_url),
  `homepage_url = ${manifest.homepage_url}`);
check('manifest version present', !!manifest.version, '');

// ---- report ----
console.log('\nCardWiz — Pre-launch flag audit\n');
let failed = 0;
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : '   — ' + r.detail}`);
  if (!r.ok) failed++;
}
console.log('\n────────────────────────────────────────────');
if (failed === 0) {
  console.log('  ✅ Production-ready — safe to build the store zip.\n');
  process.exit(0);
} else {
  console.log(`  ⛔ ${failed} check(s) failed — DO NOT ship this build. Flip the flags above first.`);
  console.log('     (Also verify manually: FEATURED/APPLY_URLS/REFERRAL_CONFIG in cardreferral.js,');
  console.log('      background.js BACKEND url, EXTENSION_PUBLISHED in website/lib/constants.ts,');
  console.log('      ALLOWED_EXTENSION_IDS on the backend.)\n');
  process.exit(1);
}
