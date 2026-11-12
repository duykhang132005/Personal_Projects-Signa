// Sustained chord synth with crossfading chords and selectable sound presets.
import { midiToHz } from './music.js';

export const ATTACK = 0.6;
export const RELEASE = 1.2;
export const MAX_VOICES = 3; // chord voices (current plus fading) allowed at once
const CULL_FADE = 0.05;      // seconds to fade out a culled voice

// Sound presets. Each osc: [type, detune cents, frequency ratio, relative gain].
// attack/release in seconds. decay: { sustain, tau } makes a percussive envelope.
// filter: { start, peak, sustain, tau } is a cutoff envelope; a number is a fixed cutoff.
// lfo: { rate, depth, delay } wobbles detune (cents). hiss: noise level.
export const PRESETS = {
  synth: {
    oscs: [['sawtooth', -8, 1, 1], ['triangle', 0, 1, 1], ['sawtooth', 7, 1, 1]],
    attack: ATTACK, release: RELEASE, filter: 1800, q: 0.7
  },
  lofi: {
    oscs: [['triangle', -6, 1, 1], ['sine', 0, 1, 1.2], ['triangle', 6, 1, 0.6]],
    attack: 0.9, release: 1.5, filter: 1200, q: 0.5,
    lfo: { rate: 0.35, depth: 14, delay: 0 }, hiss: 0.015
  },
  piano: {
    oscs: [['sine', 0, 1, 1], ['triangle', 0, 2, 0.35], ['sine', 3, 3, 0.15], ['sine', -3, 4, 0.08]],
    attack: 0.9, release: 0.5, decay: { sustain: 0.15, tau: 0.6 },
    filter: { start: 4500, peak: 4500, sustain: 900, tau: 0.8 }, q: 0.5
  },
  brass: {
    oscs: [['sawtooth', -4, 1, 1], ['sawtooth', 4, 1, 1], ['square', 0, 0.5, 0.25]],
    attack: 0.07, release: 0.35,
    filter: { start: 350, peak: 3200, sustain: 1600, tau: 0.25 }, q: 1.5,
    lfo: { rate: 5.5, depth: 9, delay: 0.25 }
  }
};

export class PadSynth {
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    // Light output limiter: catches peaks, transparent at normal levels.
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;
    this.master.connect(this.limiter).connect(this.ctx.destination);
    this.preset = 'synth';
    this.noise = null;
    this.current = null;
    this.fading = [];
  }
  resume() { return this.ctx.resume(); }
  suspend() { return this.ctx.suspend(); }

  // Switch preset: release the sounding chord so the next one uses the new sound.
  setPreset(name) {
    if (!PRESETS[name] || name === this.preset) return;
    this.release();
    this.preset = name;
  }

  noiseBuffer() {
    if (!this.noise) {
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  makeVoice(p, midi, level, out, lfoGain) {
    const total = p.oscs.reduce((s, o) => s + o[3], 0);
    return p.oscs.map(([type, cents, ratio, rel]) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = midiToHz(midi) * ratio;
      o.detune.value = cents;
      if (lfoGain) lfoGain.connect(o.detune);
      const g = this.ctx.createGain();
      g.gain.value = level * rel / total;
      o.connect(g).connect(out);
      o.start();
      return o;
    });
  }

  play(notes, bass) {
    const now = this.ctx.currentTime;
    const p = PRESETS[this.preset];
    this.release(now);
    this.cull(now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = p.q;
    if (typeof p.filter === 'number') filter.frequency.value = p.filter;
    else {
      const f = p.filter;
      filter.frequency.setValueAtTime(f.start, now);
      filter.frequency.linearRampToValueAtTime(f.peak, now + p.attack);
      filter.frequency.setTargetAtTime(f.sustain, now + p.attack, f.tau);
    }
    filter.connect(this.master);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + p.attack);
    if (p.decay) env.gain.setTargetAtTime(p.decay.sustain, now + p.attack, p.decay.tau);
    env.connect(filter);

    const srcs = [];
    let lfoGain = null;
    if (p.lfo) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = p.lfo.rate;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(p.lfo.depth, now + p.lfo.delay + 0.3);
      lfo.connect(lfoGain);
      lfo.start();
      srcs.push(lfo);
    }
    for (const n of notes) srcs.push(...this.makeVoice(p, n, 0.12, env, lfoGain));
    srcs.push(...this.makeVoice(p, bass, 0.16, env, lfoGain));
    if (p.hiss) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = p.hiss;
      src.connect(g).connect(env);
      src.start();
      srcs.push(src);
    }
    this.current = { env, oscs: srcs, release: p.release };
  }

  release(now = this.ctx.currentTime) {
    if (!this.current) return;
    const { env, oscs, release } = this.current;
    env.gain.cancelScheduledValues(now);
    env.gain.setValueAtTime(env.gain.value, now);
    env.gain.linearRampToValueAtTime(0, now + release);
    oscs.forEach(o => o.stop(now + release + 0.05));
    this.fading.push({ env, oscs, endsAt: now + release + 0.05 });
    this.current = null;
  }

  // Drop finished voices, then quickly fade the oldest until under MAX_VOICES.
  cull(now) {
    this.fading = this.fading.filter(v => v.endsAt > now);
    while (this.fading.length >= MAX_VOICES) {
      const { env, oscs } = this.fading.shift();
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(env.gain.value, now);
      env.gain.linearRampToValueAtTime(0, now + CULL_FADE);
      oscs.forEach(o => o.stop(now + CULL_FADE + 0.01));
    }
  }
}
