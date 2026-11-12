import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildChord, invertChord, QUALITIES } from '../js/music.js';

const triad = (mode, degree, tilt = 'diatonic', acc = 0, type = 'triad') =>
  buildChord(0, mode, degree, tilt, 4, type, acc, null);

describe('buildChord diatonic qualities', () => {
  it('spells C major triads I through vii', () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => triad('major', d).name);
    assert.deepEqual(names, ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  });

  it('spells C natural-minor triads i through VII', () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => triad('minor', d).name);
    assert.deepEqual(names, ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb']);
  });

  it('spells A minor with natural III, VI and VII', () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => buildChord(9, 'minor', d, 'diatonic').name);
    assert.deepEqual(names, ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  it('spells diatonic 7ths in C major when upright', () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => triad('major', d, 'diatonic', 0, '7th').name);
    assert.deepEqual(names, ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
  });
});

describe('quality-hand 7th modifier', () => {
  const seventh = (degree, tilt, type = 'triad') =>
    buildChord(0, 'major', degree, tilt, 4, type, 0, '7th');

  it('keeps degree 5 as G when the quality hand is absent', () => {
    assert.equal(triad('major', 5).name, 'G');
  });

  it('adds a minor 7th when the 7th modifier is combined with a minor tilt', () => {
    assert.equal(seventh(1, 'minor').name, 'Cm7');
    assert.equal(buildChord(0, 'free', 6, 'minor', 4, 'triad', 0, '7th').name, 'Am7');
  });

  it('uses diatonic 7ths when upright, including degree 5 as G7', () => {
    assert.equal(seventh(1, 'diatonic').name, 'Cmaj7');
    assert.equal(seventh(5, 'diatonic').name, 'G7');
    assert.equal(seventh(6, 'diatonic').name, 'Am7');
  });

  it('uses dominant 7 for a major tilt, or maj7 when Chord type is Maj7', () => {
    assert.equal(seventh(1, 'major').name, 'C7');
    assert.equal(seventh(1, 'major', 'maj7').name, 'Cmaj7');
  });

  it('still spells m7b5 when that quality is set directly', () => {
    assert.equal(buildChord(0, 'major', 7, 'diatonic', 4, 'triad', 0, 'm7b5').name, 'Bm7b5');
  });
});

describe('buildChord Free mode and accidentals', () => {
  it('maps degrees 1 to 7 to natural roots C through B, major when upright', () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => triad('free', d).name);
    assert.deepEqual(names, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('uses minor quality for outward tilt in Free mode', () => {
    assert.equal(triad('free', 6, 'minor').name, 'Am');
  });

  it('raises and lowers the root with accidentals and keeps quality', () => {
    assert.equal(triad('free', 1, 'diatonic', 1).name, 'C#');
    assert.equal(triad('free', 7, 'minor', -1, '7th').name, 'Bbm7');
    assert.equal(triad('major', 6, 'diatonic', -1).name, 'Abm');
  });
});

describe('invertChord', () => {
  const C = triad('major', 1);

  it('returns the same root-position chord when mode is off', () => {
    const off = invertChord(C, 'off', null);
    assert.equal(off, C);
    assert.deepEqual(off.notes, [60, 64, 67]);
    assert.equal(off.bass, 48);
    assert.equal(off.name, 'C');
  });

  it('rotates 1st, 2nd, and 3rd inversions correctly, clamping 3rd on triads', () => {
    const first = invertChord(C, '1', null);
    assert.deepEqual(first.notes, [64, 67, 72]);
    assert.equal(first.name, 'C/E');
    assert.equal(first.bass, 52);
    const second = invertChord(C, '2', null);
    assert.deepEqual(second.notes, [67, 72, 76]);
    assert.equal(second.name, 'C/G');
    const clamped = invertChord(C, '3', null);
    assert.deepEqual(clamped.notes, second.notes);
    assert.equal(clamped.name, 'C/G');
    const g7 = triad('major', 5, 'diatonic', 0, '7th');
    const third = invertChord(g7, '3', null);
    assert.equal(third.name, 'G7/F');
    assert.deepEqual(third.notes, [77, 79, 83, 86]);
  });
});

describe('madd9 placeholder', () => {
  it('keeps madd9 defined but unreachable from UI paths', () => {
    assert.ok(QUALITIES.madd9);
    const mods = [null, 'maj', 'min', 'add9', 'sus4', 'dom7', 'm7b5', '7th'];
    const types = ['triad', '7th', 'maj7', 'sus4'];
    for (const mode of ['major', 'minor', 'free']) {
      for (const degree of [1, 2, 3, 4, 5, 6, 7]) {
        for (const tilt of ['diatonic', 'major', 'minor']) {
          for (const type of types) {
            for (const acc of [-1, 0, 1]) {
              for (const mod of mods) {
                const c = buildChord(0, mode, degree, tilt, 4, type, acc, mod);
                assert.notEqual(c.name.replace(/\/.*$/, ''), 'Cmadd9');
                assert.ok(!c.name.includes('madd9'), c.name);
              }
            }
          }
        }
      }
    }
  });
});
