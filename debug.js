/*
 * CardWiz — shared debug logger (sab jagah ek jaisa format).
 * Console filter me bas "CardWiz" type karo → saare logs ek saath, order ke saath:
 *   [CardWiz]#7 +2.4s [widget] offer matched: …
 *   [CardWiz]#8 +2.5s [popup] boot | cards: 190 …
 * #seq = usi context ka sequence number, +time = load ke baad beeta samay,
 * [module] = kahan se aaya (widget/popup/frame/auth/sync…).
 *
 * 🔧 TODO(PUBLISH): publish se pehle CW_DEBUG_ALL = false karo.
 */

const CW_DEBUG_ALL = true;
const CW_LOG_T0 = Date.now();
let CW_LOG_SEQ = 0;

function cwlog(tag) {
  if (!CW_DEBUG_ALL) return;
  try {
    const t = ((Date.now() - CW_LOG_T0) / 1000).toFixed(1);
    const args = Array.prototype.slice.call(arguments, 1);
    console.log('[CardWiz]#' + (++CW_LOG_SEQ) + ' +' + t + 's [' + tag + ']', ...args);
  } catch (_) { /* noop */ }
}

const debugApi = { cwlog, CW_DEBUG_ALL };
if (typeof module !== 'undefined' && module.exports) module.exports = debugApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizDebug = debugApi;
