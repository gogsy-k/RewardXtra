/*
 * CardWiz — Single test runner.  Chalao:  node run-all-tests.js  (ya `npm test`)
 * Saare suites sequentially chalata hai aur ek combined summary deta hai.
 */
const { execFileSync } = require('child_process');

const SUITES = [
  'recommend.test.js',
  'content-detect.test.js',
  'reminders.test.js',
  'offers.test.js',
  'captracker.test.js',
  'affiliate.test.js',
  'premium.test.js',
  'sync.test.js',
  'razorpay.test.js',
  'cardreferral.test.js',
  // ---- launch-day QA expansion ----
  'portfolioscore.test.js',
  'catalog.test.js',
  'auth.test.js',
  'sync-network.test.js',
  'affiliate-apply.test.js',
  'offer-attribution.test.js',
  'bestcards-integrity.test.js',
  'gaps.test.js',
];

let totalPassed = 0;
let failedSuites = 0;

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   CardWiz — Full Test Suite           ║');
console.log('╚════════════════════════════════════════════╝\n');

for (const suite of SUITES) {
  try {
    const out = execFileSync('node', [suite], { encoding: 'utf8' });
    const m = out.match(/(\d+) tests passed/);
    const n = m ? parseInt(m[1], 10) : 0;
    totalPassed += n;
    console.log(`  ✅ ${suite.padEnd(24)} ${n} tests`);
  } catch (e) {
    failedSuites++;
    console.log(`  ❌ ${suite.padEnd(24)} FAILED`);
    if (e.stdout) process.stdout.write(e.stdout);
  }
}

console.log('\n────────────────────────────────────────────');
if (failedSuites === 0) {
  console.log(`  🎉 All suites green — ${totalPassed} tests passed.\n`);
  process.exit(0);
} else {
  console.log(`  ⚠️  ${failedSuites} suite(s) failed. ${totalPassed} tests passed.\n`);
  process.exit(1);
}
