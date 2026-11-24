import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { holdParam, PadSynth, RELEASE } from '../js/synth.js';

const CULL_FADE = 0.05; // js/synth.js cull fade

function installAudio({ cancelAndHold = true } = {}) {
  class Param {
    constructor(value = 0) {
      this.current = value;
      this.events = [];
    }
    get value() {
      this.events.push(['read', this.current]);
      return this.current;
    }
    set value(v) { this.current = v; }
    cancelScheduledValues(t) {
      this.events.push(['cancel', t]);
      this.current = 999; // a post-cancel .value read would see this snap
    }
    setValueAtTime(v, t) { this.events.push(['set', v, t]); this.current = v; }
    linearRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); }
    setTargetAtTime(v, t, tau) { this.events.push(['target', v, t, tau]); }
  }
  if (cancelAndHold) {
    Param.prototype.cancelAndHoldAtTime = function (t) { this.events.push(['hold', t]); };
  }
  class Node {
    constructor() {
      this.gain = new Param(1);
      this.frequency = new Param(440);
      this.detune = new Param(0);
      this.Q = new Param(1);
      this.threshold = new Param(0);
      this.knee = new Param(0);
      this.ratio = new Param(1);
      this.attack = new Param(0);
      this.release = new Param(0);
    }
    connect(dest) { return dest; }
    start() {}
    stop() {}
  }
  class Ctx {
    constructor() {
      this.currentTime = 5;
      this.sampleRate = 1000;
      this.destination = {};
    }
    createGain() { return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    createOscillator() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createBufferSource() { return new Node(); }
    createBuffer(_ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() {}
    suspend() {}
  }
  globalThis.AudioContext = Ctx;
}

describe('holdParam', () => {
  it('uses cancelAndHoldAtTime and does not read .value when it exists', () => {
    const calls = [];
    const param = {
      get value() { calls.push('read'); return 0.4; },
      cancelAndHoldAtTime(t) { calls.push(['hold', t]); },
      cancelScheduledValues(t) { calls.push(['cancel', t]); },
      setValueAtTime(v, t) { calls.push(['set', v, t]); }
    };
    holdParam(param, 1.5);
    assert.deepEqual(calls, [['hold', 1.5]]);
  });

  it('captures .value before cancelScheduledValues when cancelAndHoldAtTime is missing', () => {
    const calls = [];
    let intrinsic = 0.25;
    const param = {
      get value() {
        calls.push(['read', intrinsic]);
        return intrinsic;
      },
      cancelScheduledValues(t) {
        intrinsic = 1;
        calls.push(['cancel', t]);
      },
      setValueAtTime(v, t) { calls.push(['set', v, t]); }
    };
    holdParam(param, 2);
    assert.deepEqual(calls, [['read', 0.25], ['cancel', 2], ['set', 0.25, 2]]);
  });
});

describe('PadSynth gain scheduling', () => {
  it('holds master gain, release, and cull instead of cancelling first', () => {
    installAudio({ cancelAndHold: true });
    const synth = new PadSynth(0.5);
    const now = synth.ctx.currentTime;
    const master = synth.master.gain;
    master.events = [];
    synth.setMasterVolume(0.25, false);
    assert.deepEqual(master.events, [
      ['hold', now],
      ['target', 0.25, now, 0.03]
    ]);

    master.events = [];
    synth.setMasterVolume(0.8, true);
    assert.deepEqual(master.events, [
      ['hold', now],
      ['set', 0.8, now]
    ]);

    synth.play([60, 64, 67], 48);
    const first = synth.current.env.gain;
    synth.play([62, 65, 69], 50);
    synth.play([64, 67, 71], 52);
    synth.play([65, 69, 72], 53);
    const tails = first.events.filter((e) => e[0] === 'hold' || (e[0] === 'ramp' && e[1] === 0));
    assert.deepEqual(tails, [
      ['hold', now],
      ['ramp', 0, now + RELEASE],
      ['hold', now],
      ['ramp', 0, now + CULL_FADE]
    ]);
    assert.equal(first.events.some((e) => e[0] === 'cancel' || e[0] === 'read'), false);
  });

  it('captures live gain before cancel when the context has no cancelAndHoldAtTime', () => {
    installAudio({ cancelAndHold: false });
    const synth = new PadSynth(0.5);
    const now = synth.ctx.currentTime;
    const master = synth.master.gain;
    master.events = [];
    synth.setMasterVolume(0.25, false);
    assert.deepEqual(master.events, [
      ['read', 0.5],
      ['cancel', now],
      ['set', 0.5, now],
      ['target', 0.25, now, 0.03]
    ]);

    synth.play([60, 64, 67], 48);
    const gain = synth.current.env.gain;
    const mark = gain.events.length;
    synth.release(now);
    const tail = gain.events.slice(mark);
    assert.equal(tail[0][0], 'read');
    assert.deepEqual(tail[1], ['cancel', now]);
    assert.deepEqual(tail[2], ['set', tail[0][1], now]);
    assert.notEqual(tail[2][1], 999);
    assert.deepEqual(tail[3], ['ramp', 0, now + RELEASE]);
  });
});
