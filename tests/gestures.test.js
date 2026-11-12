import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDegree, classifyTilt, classifyModifier, Stabilizer,
  STABLE_FRAMES, M7B5_STABLE_FRAMES
} from '../js/gestures.js';
import { makeHand, fist, count, rock, ily } from './hands-fixture.js';

describe('classifyDegree', () => {
  it('maps a fist to 0 (mute)', () => {
    assert.equal(classifyDegree(fist()), 0);
  });

  it('maps 1 to 5 extended fingers to degrees 1 to 5', () => {
    for (let n = 1; n <= 5; n++) assert.equal(classifyDegree(count(n)), n);
  });

  it('maps the rock sign (index and pinky, thumb tucked) to degree 6', () => {
    assert.equal(classifyDegree(rock()), 6);
  });

  it('maps the I-love-you sign (thumb, index, and pinky) to degree 7', () => {
    assert.equal(classifyDegree(ily()), 7);
  });
});


describe('classifyModifier', () => {
  it('keeps five fingers on the chord hand as degree 5, not a 7th', () => {
    assert.equal(classifyDegree(count(5)), 5);
  });

  it('treats five fingers on the quality hand as an add-7th modifier', () => {
    assert.equal(classifyModifier(count(5)), '7th');
  });

  it('still maps the m7b5 shape before plain finger counts', () => {
    const lm = makeHand({ index: true, ring: true, pinky: true });
    assert.equal(classifyModifier(lm), 'm7b5');
  });
});

describe('classifyTilt', () => {
  it('treats an upright hand as diatonic', () => {
    assert.equal(classifyTilt(makeHand({ index: true }, 0)).tilt, 'diatonic');
  });

  it('treats inward tilt as forced major', () => {
    assert.equal(classifyTilt(makeHand({ index: true }, -30)).tilt, 'major');
  });

  it('treats outward tilt as forced minor', () => {
    assert.equal(classifyTilt(makeHand({ index: true }, 30)).tilt, 'minor');
  });
});

describe('Stabilizer', () => {
  it('commits after STABLE_FRAMES consistent frames, not before', () => {
    assert.equal(STABLE_FRAMES, 4);
    const s = new Stabilizer();
    assert.equal(s.push(2), null);
    assert.equal(s.push(2), null);
    assert.equal(s.push(2), null);
    assert.equal(s.push(2), 2);
    assert.equal(s.push(2), 2);
  });

  it('resets the count when the value changes', () => {
    const s = new Stabilizer();
    s.push(1); s.push(1); s.push(1);
    assert.equal(s.push(3), null);
    assert.equal(s.push(3), null);
    assert.equal(s.push(3), null);
    assert.equal(s.push(3), 3);
  });

  it('requires M7B5_STABLE_FRAMES (8) for the m7b5 shape, and 4 for others', () => {
    assert.equal(M7B5_STABLE_FRAMES, 8);
    const s = new Stabilizer(STABLE_FRAMES, { m7b5: M7B5_STABLE_FRAMES });
    for (let i = 0; i < 7; i++) assert.equal(s.push('m7b5'), null);
    assert.equal(s.push('m7b5'), 'm7b5');
    const t = new Stabilizer(STABLE_FRAMES, { m7b5: M7B5_STABLE_FRAMES });
    t.push('min'); t.push('min'); t.push('min');
    assert.equal(t.push('min'), 'min');
  });
});
