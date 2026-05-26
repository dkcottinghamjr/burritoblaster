/**
 * BURRITO BLASTER — haptics.js
 * Thin wrapper around the Web Vibration API. Android Chrome/Firefox
 * support navigator.vibrate(); iOS Safari does not, so all calls degrade
 * to no-ops there.
 */
const Haptics = (() => {
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  let muted = false;

  function pulse(pattern) {
    if (!supported || muted || pattern == null) return;
    try { navigator.vibrate(pattern); } catch (_) {}
  }

  function setMuted(m) {
    muted = !!m;
    if (muted && supported) {
      try { navigator.vibrate(0); } catch (_) {}
    }
  }

  return {
    supported,
    setMuted,
    isMuted: () => muted,
    launch: () => pulse(CONFIG.haptics.launch),
    impact: () => pulse(CONFIG.haptics.impact),
    bag:    () => pulse(CONFIG.haptics.bag),
    win:    () => pulse(CONFIG.haptics.win),
    lose:   () => pulse(CONFIG.haptics.lose),
  };
})();
