/*
 * offers.js parser tests — real-world Amazon/Flipkart offer strings.
 * Chalao:  node offers.test.js
 */
const assert = require('assert');
const { detectBank, parseOffer, offerValue, bestOffersByBank, cardNetwork, binToBank } = require('./offers');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}

console.log('CardWiz — Offer Parser Tests\n');

// --- detectBank ---
test('detectBank HDFC', () => assert.strictEqual(detectBank('10% off on HDFC Bank Credit Card'), 'HDFC'));
test('detectBank SBI word-boundary (not "sbicard typo")', () => assert.strictEqual(detectBank('Get SBI Credit Card offer'), 'SBI'));
test('detectBank none -> null', () => assert.strictEqual(detectBank('Free delivery today'), null));

// --- parseOffer: percent with cap ---
test('Amazon-style: 10% instant up to ₹1,500 HDFC Credit', () => {
  const o = parseOffer('10% Instant Discount up to ₹1,500 on HDFC Bank Credit Card EMI Transactions');
  assert.strictEqual(o.bank, 'HDFC');
  assert.strictEqual(o.kind, 'percent');
  assert.strictEqual(o.percent, 10);
  assert.strictEqual(o.cap, 1500);
  assert.strictEqual(o.creditOnly, true);
});

// --- parseOffer: flat off ---
test('Flat ₹500 off on ICICI Credit Card', () => {
  const o = parseOffer('Flat ₹500 off on ICICI Bank Credit Cards');
  assert.strictEqual(o.bank, 'ICICI');
  assert.strictEqual(o.kind, 'flat');
  assert.strictEqual(o.flat, 500);
});

// --- parseOffer: debit-only flagged ---
test('Debit card offer -> debitOnly true', () => {
  const o = parseOffer('5% off on SBI Bank Debit Card');
  assert.strictEqual(o.debitOnly, true);
  assert.strictEqual(o.creditOnly, false);
});

// --- parseOffer: no bank -> null ---
test('No bank mentioned -> null', () => {
  assert.strictEqual(parseOffer('No Cost EMI available'), null);
});

// --- parseOffer: No Cost EMI ---
test('No Cost EMI Axis -> kind nocostemi', () => {
  const o = parseOffer('No Cost EMI on Axis Bank Credit Card');
  assert.strictEqual(o.bank, 'Axis');
  assert.strictEqual(o.kind, 'nocostemi');
});

// --- offerValue ---
test('offerValue percent under cap', () => {
  const o = parseOffer('10% Instant Discount up to ₹1,500 on HDFC Bank Credit Card');
  assert.strictEqual(offerValue(o, 5000), 500); // 10% of 5000 = 500 < 1500
});
test('offerValue percent hits cap', () => {
  const o = parseOffer('10% Instant Discount up to ₹1,500 on HDFC Bank Credit Card');
  assert.strictEqual(offerValue(o, 50000), 1500); // 10% = 5000, capped 1500
});
test('offerValue flat', () => {
  const o = parseOffer('Flat ₹500 off on ICICI Bank Credit Cards');
  assert.strictEqual(offerValue(o, 3000), 500);
});
test('offerValue nocostemi -> 0', () => {
  const o = parseOffer('No Cost EMI on Axis Bank Credit Card');
  assert.strictEqual(offerValue(o, 10000), 0);
});

// --- bestOffersByBank: picks higher value, skips debit ---
test('bestOffersByBank dedupes per bank + skips debit', () => {
  const texts = [
    '5% off up to ₹250 on HDFC Bank Credit Card',
    '10% Instant Discount up to ₹1,500 on HDFC Bank Credit Card', // higher -> wins
    '5% off on SBI Bank Debit Card', // debit -> skip
  ];
  const best = bestOffersByBank(texts, 5000);
  assert.strictEqual(best.HDFC.value, 500);     // 10% of 5000
  assert.strictEqual(best.SBI, undefined);      // debit skipped
});

// --- Myntra real strings: min-spend + EMI-only (console se) ---
test('min-spend parsed + gated (SBI 10% on min spend ₹3,500)', () => {
  const o = parseOffer('10% Instant Discount On SBI Credit Card on min spend of ₹3,500');
  assert.strictEqual(o.bank, 'SBI');
  assert.strictEqual(o.minSpend, 3500);
  assert.strictEqual(o.emiOnly, false);
  assert.strictEqual(offerValue(o, 3000), 0);    // 3000 < 3500 → offer nahi milega
  assert.strictEqual(offerValue(o, 3995), 400);  // 10% of 3995 = 399.5 → 400
});
test('EMI-only offer flagged + skipped in bestOffersByBank (RBL)', () => {
  const o = parseOffer('10% Instant Discount On RBL Bank Credit Card EMI on min spend of ₹3,500');
  assert.strictEqual(o.emiOnly, true);
  const best = bestOffersByBank(['10% Instant Discount On RBL Bank Credit Card EMI on min spend of ₹3,500'], 3995);
  assert.strictEqual(best.RBL, undefined);       // EMI-only → skip
});
test('non-EMI credit card offer NOT flagged emiOnly', () => {
  const o = parseOffer('10% off on HDFC Bank Credit Card and Credit Card EMI txns');
  assert.strictEqual(o.emiOnly, false);          // "credit card and" = non-EMI path bhi hai
});
test('cap via "maximum discount of ₹X"', () => {
  const o = parseOffer('Get 10% off, maximum discount of ₹250, on Axis Bank Credit Card');
  assert.strictEqual(o.cap, 250);
});
test('cap NOT falsely taken from "up to 10%"', () => {
  const o = parseOffer('Up to 10% Instant Discount on Kotak Bank Credit Card'); // no ₹ cap
  assert.strictEqual(o.cap, null);
});

// --- Ajio payment-page real strings: AU / HSBC banks + credit-and-debit ---
test('AU offer: bank detected, min-spend + cap parsed', () => {
  const o = parseOffer('Get 10% Instant Discount of up to Rs. 1000 on a minimum transaction value of Rs 3000 using AU Credit Cards');
  assert.strictEqual(o.bank, 'AU Small Finance Bank'); // catalog naam se exact match
  assert.strictEqual(o.percent, 10);
  assert.strictEqual(o.cap, 1000);
  assert.strictEqual(o.minSpend, 3000);
  assert.strictEqual(offerValue(o, 4009), 401);  // 10% of 4009 = 400.9 -> 401 (< cap, min met)
  assert.strictEqual(offerValue(o, 2500), 0);    // 2500 < 3000 min -> nahi milega
});
test('HSBC "Credit and Debit Cards" NOT debit-only (shows up)', () => {
  const o = parseOffer('Get 12% Instant Discount of up to Rs. 1000 on a minimum transaction value of Rs 3000 using HSBC Bank Credit and Debit Cards');
  assert.strictEqual(o.bank, 'HSBC');
  assert.strictEqual(o.debitOnly, false);        // credit bhi mentioned hai
  const best = bestOffersByBank(['Get 12% Instant Discount of up to Rs. 1000 on a minimum transaction value of Rs 3000 using HSBC Bank Credit and Debit Cards'], 4009);
  assert.strictEqual(best.HSBC.value, 481);       // 12% of 4009 = 481
});

// --- BIN → bank/network (user ke diye 3 BINs) ---
test('binToBank: Amazon Pay ICICI 431581 → ICICI / Visa', () => {
  const r = binToBank('431581');
  assert.strictEqual(r.bank, 'ICICI');
  assert.strictEqual(r.network, 'Visa');
});
test('binToBank: ICICI Coral 437551 → ICICI / Visa', () => {
  const r = binToBank('437551');
  assert.strictEqual(r.bank, 'ICICI');
  assert.strictEqual(r.network, 'Visa');
});
test('binToBank: HDFC 434155 → HDFC / Visa', () => {
  const r = binToBank('434155');
  assert.strictEqual(r.bank, 'HDFC');
  assert.strictEqual(r.network, 'Visa');
});
test('binToBank: unknown BIN → bank null, network still detected', () => {
  const r = binToBank('512345'); // Mastercard range, not in map
  assert.strictEqual(r.bank, null);
  assert.strictEqual(r.network, 'Mastercard');
});
test('binToBank: <6 digits → bank null', () => {
  assert.strictEqual(binToBank('4315').bank, null);
});
test('cardNetwork: RuPay 60 / Amex 37', () => {
  assert.strictEqual(cardNetwork('607551'), 'RuPay');
  assert.strictEqual(cardNetwork('371449'), 'Amex');
});

console.log(`\n${passed} tests passed.`);
