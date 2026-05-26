/**
 * BURRITO BLASTER — audio.js
 * Procedural audio via the Web Audio API. No external samples; every
 * sound is synthesised from oscillators + a white-noise buffer.
 *
 * Mobile autoplay rules require the AudioContext to be created (or at
 * least resumed) inside a user gesture — see Audio.unlock(), which the
 * Controller calls on the first pointerdown.
 */
const Audio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : CONFIG.audio.masterVolume;
      // Limiter so chain-collision pileups don't clip.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.12;
      master.connect(limiter).connect(ctx.destination);
    } catch (_) {
      ctx = null;
      return false;
    }
    return true;
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) {}
    }
    unlocked = true;
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : CONFIG.audio.masterVolume;
  }

  function isMuted() { return muted; }

  function ready() {
    return !muted && unlocked && ctx && ctx.state === 'running';
  }

  /**
   * Build a short white-noise audio buffer. Re-created each time so we
   * don't have to mess with shared buffer offsets.
   */
  function noiseBuffer(duration) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Standard short ADSR-ish gain. Uses exponential ramps so transients
   * sound natural (linear ramps click on tails).
   */
  function envGain(peak, attack, sustain, release, startTime) {
    const g = ctx.createGain();
    const t = startTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + sustain + release);
    return g;
  }

  function launch() {
    if (!ready()) return;
    const cfg = CONFIG.audio.launch;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + cfg.duration);

    const g = envGain(cfg.peak, 0.006, 0.05, cfg.duration - 0.05, now);

    osc.connect(filter).connect(g).connect(master);
    osc.start(now);
    osc.stop(now + cfg.duration + 0.05);
  }

  function impact(intensity) {
    if (!ready()) return;
    const cfg = CONFIG.audio.impact;
    const i = Math.max(0, Math.min(1, intensity || 0));
    const now = ctx.currentTime;
    const dur = cfg.durationMin + (cfg.durationMax - cfg.durationMin) * i;
    const peak = cfg.peakMin + (cfg.peakMax - cfg.peakMin) * i;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cfg.cutoffStart + 1200 * i, now);
    filter.frequency.exponentialRampToValueAtTime(cfg.cutoffEnd, now + dur);

    const g = envGain(peak, 0.004, 0.018, Math.max(0.01, dur - 0.022), now);

    src.connect(filter).connect(g).connect(master);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  function bag() {
    if (!ready()) return;
    const cfg = CONFIG.audio.bag;
    const now = ctx.currentTime;

    // Crinkly band-pass noise burst
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(cfg.noiseDuration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cfg.noiseCenterHz;
    filter.Q.value = cfg.noiseQ;
    const g1 = envGain(cfg.noisePeak, 0.005, 0.025, cfg.noiseDuration - 0.03, now);
    src.connect(filter).connect(g1).connect(master);
    src.start(now);
    src.stop(now + cfg.noiseDuration + 0.02);

    // Descending sine "boop" gives the satisfying tail
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.blipFreq, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.blipFreqEnd, now + cfg.blipDuration);
    const g2 = envGain(cfg.blipPeak, 0.005, 0.04, cfg.blipDuration - 0.045, now);
    osc.connect(g2).connect(master);
    osc.start(now);
    osc.stop(now + cfg.blipDuration + 0.02);
  }

  function chord(notes, step, type, peak, release) {
    if (!ready()) return;
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const t = now + i * step;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      const g = envGain(peak, 0.012, 0.04, release, t);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + release + 0.06);
    });
  }

  function win() {
    const c = CONFIG.audio.win;
    chord(c.notes, c.step, c.type, c.peak, c.release);
  }

  function lose() {
    const c = CONFIG.audio.lose;
    chord(c.notes, c.step, c.type, c.peak, c.release);
  }

  return { unlock, setMuted, isMuted, launch, impact, bag, win, lose };
})();
