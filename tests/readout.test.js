import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gestures = readFileSync(new URL('../js/gestures.js', import.meta.url), 'utf8');
const settext = readFileSync(new URL('../js/settext.js', import.meta.url), 'utf8');

function fnBody(name) {
  const start = main.indexOf('function ' + name);
  assert.ok(start >= 0, name);
  const open = main.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < main.length; i++) {
    if (main[i] === '{') depth++;
    else if (main[i] === '}') {
      depth--;
      if (depth === 0) return main.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

describe('readout DOM cache', () => {
  it('looks up gesture, degree, quality, qbadge, chord, and hud-chord once', () => {
    for (const id of ['gesture', 'degree', 'quality', 'qbadge', 'chord', 'hud-chord']) {
      const n = (main.match(new RegExp("\\$\\('" + id + "'\\)", 'g')) || []).length;
      assert.equal(n, 1, id);
    }
  });

  it('writes loop and update text through setText', () => {
    for (const name of ['update', 'loop', 'showMuted', 'setChordText', 'stopPlaying']) {
      assert.doesNotMatch(fnBody(name), /\.textContent\s*=/, name);
    }
    assert.match(fnBody('update'), /setText\(degreeEl/);
    assert.match(fnBody('update'), /setText\(qualityEl/);
    assert.match(fnBody('update'), /qbadgeEl\.hidden/);
    assert.match(fnBody('loop'), /setText\(gestureEl/);
    assert.match(fnBody('setChordText'), /setText\(chordEl/);
    assert.match(fnBody('setChordText'), /setText\(hudChordEl/);
    assert.match(main, /import \{ setText \} from '\.\/settext\.js';/);
  });
});

describe('stale playback state', () => {
  it('calls showMuted when the tab is hidden while playing', () => {
    const vis = main.slice(main.indexOf("document.addEventListener('visibilitychange'"), main.indexOf('function fsElement'));
    const hide = vis.slice(0, vis.indexOf('} else'));
    assert.match(hide, /document\.hidden/);
    assert.match(hide, /showMuted\(\)/);
    assert.doesNotMatch(hide, /stopPlaying\(\)/);
  });

  it('resets every stabilizer and lastNotes in stopPlaying', () => {
    const stop = fnBody('stopPlaying');
    for (const name of ['degStab', 'tiltStab', 'accStab', 'modStab']) {
      assert.match(stop, new RegExp(name + '\\.reset\\(\\)'));
    }
    assert.match(stop, /lastNotes = null/);
  });
});

describe('cheat sheet and hand comment', () => {
  it('labels the m7b5 row as the orange quality hand', () => {
    assert.match(html, /<span>Quality hand \(orange\): index, ring, pinky \(hold\)<\/span><b>m7b5<\/b>/);
    assert.doesNotMatch(html, /<span>Index, ring, pinky \(hold\)<\/span>/);
  });

  it('describes the cyan chord hand by color because the camera is inverted', () => {
    const first = gestures.split(/\r?\n/, 1)[0];
    assert.match(first, /cyan chord hand/);
    assert.match(first, /camera is inverted/);
    assert.doesNotMatch(first, /left hand/);
  });
});

describe('guardrails', () => {
  it('keeps Inversion default Off and leaves madd9 off the page', () => {
    assert.match(html, /<select id="inv"><option value="off">Off<\/option>/);
    assert.equal(html.includes('madd9'), false);
  });

  it('keeps changed text files on LF with no em dashes', () => {
    for (const [rel, text] of [
      ['../js/main.js', main],
      ['../index.html', html],
      ['../js/gestures.js', gestures],
      ['../js/settext.js', settext],
      ['../tests/settext.test.js', readFileSync(new URL('./settext.test.js', import.meta.url), 'utf8')],
      ['../tests/gestures.test.js', readFileSync(new URL('./gestures.test.js', import.meta.url), 'utf8')],
      ['../tests/readout.test.js', readFileSync(new URL('./readout.test.js', import.meta.url), 'utf8')]
    ]) {
      const buf = readFileSync(new URL(rel, import.meta.url));
      assert.equal(buf.includes(0x0d), false, rel);
      assert.equal(text.includes('\u2014'), false, rel);
    }
  });
});
