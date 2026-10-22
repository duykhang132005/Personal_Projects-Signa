// Sustained pad synth with crossfading chords.
import { midiToHz } from './music.js';

export const ATTACK = 0.6;
export const RELEASE = 1.2;
export const MAX_VOICES = 3; // chord voices (current plus fading) allowed at once
const CULL_FADE = 0.05;      // seconds to fade out a culled voice
const DETUNE = [-8, 0, 7];

export class PadSynth {
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1800;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.master).connect(this.ctx.destination);
    this.current = null;
    this.fading = [];
  }
  resume() { return this.ctx.resume(); }

  makeVoice(midi, level, out) {
    const oscs = DETUNE.map((cents, i) => {
      const o = this.ctx.createOscillator();
      o.type = i === 1 ? 'triangle' : 'sawtooth';
      o.frequency.value = midiToHz(midi);
      o.detune.value = cents;
      const g = this.ctx.createGain();
      g.gain.value = level / DETUNE.length;
      o.connect(g).connect(out);
      o.start();
      return o;
    });
    return oscs;
  }

  play(notes, bass) {
    const now = this.ctx.currentTime;
    this.release(now);
    this.cull(now);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + ATTACK);
    env.connect(this.filter);
    const oscs = [];
    for (const n of notes) oscs.push(...this.makeVoice(n, 0.12, env));
    oscs.push(...this.makeVoice(bass, 0.16, env));
    this.current = { env, oscs };
  }

  release(now = this.ctx.currentTime) {
    if (!this.current) return;
    const { env, oscs } = this.current;
    env.gain.cancelScheduledValues(now);
    env.gain.setValueAtTime(env.gain.value, now);
    env.gain.linearRampToValueAtTime(0, now + RELEASE);
    oscs.forEach(o => o.stop(now + RELEASE + 0.05));
    this.fading.push({ env, oscs, endsAt: now + RELEASE + 0.05 });
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
