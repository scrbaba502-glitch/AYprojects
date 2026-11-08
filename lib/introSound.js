// Cinematic sound design for the A² intro, generated live with the Web Audio API.
// No audio files to host or download. Browsers only allow sound after a tap/click/key press,
// so the engine unlocks on the first gesture and then plays whichever cues are still ahead.

import { TL } from "./introTimeline";

const PREF_KEY = "a2-sound";

export function createIntroSound() {
  let ctx = null;
  let master = null;
  let reverb = null;
  let noiseBuf = null;
  let muted = false;
  const played = { approach: false, impact: false, reveal: false };

  try {
    muted = localStorage.getItem(PREF_KEY) === "off";
  } catch (e) {}

  function ensure() {
    if (ctx) return ctx;
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.3;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(comp);
    comp.connect(ctx.destination);

    // procedural reverb tail
    const len = Math.floor(ctx.sampleRate * 2.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    reverb = ctx.createGain();
    reverb.gain.value = 0.55;
    reverb.connect(conv);
    conv.connect(master);

    // shared white-noise buffer
    const nlen = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function noise(loop = true) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = loop;
    return s;
  }

  function isRunning() {
    return !!ctx && ctx.state === "running";
  }

  /* ---------------------------------- cues ---------------------------------- */

  // Rising rumble + whoosh while the meteor falls in from infinity.
  function approach(dur) {
    const t0 = ctx.currentTime + 0.02;
    const t1 = t0 + dur;

    const drone = ctx.createGain();
    drone.gain.setValueAtTime(0.0001, t0);
    drone.gain.exponentialRampToValueAtTime(0.5, t1 - 0.1);
    drone.gain.linearRampToValueAtTime(0.0001, t1 + 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(90, t0);
    lp.frequency.exponentialRampToValueAtTime(700, t1);
    lp.connect(drone);
    drone.connect(master);
    [41, 41.7, 61.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sawtooth";
      o.frequency.setValueAtTime(f * 0.7, t0);
      o.frequency.exponentialRampToValueAtTime(f * 1.9, t1);
      o.connect(lp);
      o.start(t0);
      o.stop(t1 + 0.2);
    });

    // whoosh: band-passed noise sweeping upward, getting louder
    const w = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(180, t0);
    bp.frequency.exponentialRampToValueAtTime(4200, t1);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t0);
    wg.gain.exponentialRampToValueAtTime(0.75, t1 - 0.05);
    wg.gain.linearRampToValueAtTime(0.0001, t1 + 0.08);
    w.connect(bp);
    bp.connect(wg);
    wg.connect(master);
    wg.connect(reverb);
    w.start(t0);
    w.stop(t1 + 0.2);

    // tension riser
    const r = ctx.createOscillator();
    r.type = "sine";
    r.frequency.setValueAtTime(160, t0);
    r.frequency.exponentialRampToValueAtTime(1400, t1);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.09, t1 - 0.05);
    rg.gain.linearRampToValueAtTime(0.0001, t1 + 0.05);
    r.connect(rg);
    rg.connect(master);
    rg.connect(reverb);
    r.start(t0);
    r.stop(t1 + 0.2);
  }

  // Sub boom + crack + debris rumble at the moment of impact.
  function impact() {
    const t = ctx.currentTime + 0.01;

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(26, t + 1.3);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(1.0, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    sub.connect(sg);
    sg.connect(master);
    sub.start(t);
    sub.stop(t + 2.3);

    const b = noise(false);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + 1.6);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.95, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    b.connect(lp);
    lp.connect(bg);
    bg.connect(master);
    bg.connect(reverb);
    b.start(t);
    b.stop(t + 1.9);

    const c = noise(false);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.7, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    c.connect(hp);
    hp.connect(cg);
    cg.connect(master);
    c.start(t);
    c.stop(t + 0.25);

    const rum = noise();
    const rl = ctx.createBiquadFilter();
    rl.type = "lowpass";
    rl.frequency.value = 120;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.5, t);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 3.4);
    rum.connect(rl);
    rl.connect(rg);
    rg.connect(master);
    rum.start(t);
    rum.stop(t + 3.5);
  }

  // Warm golden swell + sparkle bells for "A² presents AYneetPYQ+".
  function reveal() {
    const t = ctx.currentTime + 0.02;
    const chord = [110, 220, 329.63, 440, 554.37, 659.25, 880];
    chord.forEach((f, i) => {
      [-4, 4].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = i < 2 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ctx.createGain();
        const peak = (i < 2 ? 0.09 : 0.055) / (1 + i * 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 1.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 5.2);
        o.connect(g);
        g.connect(master);
        g.connect(reverb);
        o.start(t);
        o.stop(t + 5.3);
      });
    });

    const bells = [1318.5, 1760, 2093, 2637, 3136, 2349, 3520];
    bells.forEach((f, i) => {
      const st = t + 0.35 + i * 0.22;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.07, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 1.8);
      o.connect(g);
      g.connect(master);
      g.connect(reverb);
      o.start(st);
      o.stop(st + 1.9);
    });
  }

  /* ------------------------------- public API -------------------------------- */

  // Call every frame with the intro clock. Plays any cue whose moment is "now", and — if the
  // person unlocked audio late — a cue they're still in the middle of.
  function sync(t) {
    if (!ctx || !isRunning() || muted) return;
    if (!played.approach && t >= TL.flight && t < TL.impact - 0.35) {
      played.approach = true;
      approach(TL.impact - t);
    }
    if (!played.impact && t >= TL.impact && t < TL.impact + 0.7) {
      played.impact = true;
      impact();
    }
    if (!played.reveal && t >= TL.reveal && t < TL.reveal + 2.2) {
      played.reveal = true;
      reveal();
    }
  }

  function tryStart() {
    if (!ensure()) return false;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return isRunning();
  }

  function setMuted(m) {
    muted = m;
    try {
      localStorage.setItem(PREF_KEY, m ? "off" : "on");
    } catch (e) {}
    if (!ensure()) return;
    if (!m && ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(m ? 0 : 0.85, now, 0.05);
  }

  function fadeOut() {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0, now, 0.25);
  }

  function destroy() {
    try {
      if (ctx) setTimeout(() => ctx && ctx.close().catch(() => {}), 600);
    } catch (e) {}
  }

  return {
    tryStart,
    sync,
    setMuted,
    fadeOut,
    destroy,
    isRunning,
    get muted() {
      return muted;
    },
  };
}
