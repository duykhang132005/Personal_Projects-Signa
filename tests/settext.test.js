import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setText } from '../js/settext.js';

function spyEl(initial) {
  let writes = 0;
  const el = {
    _t: initial,
    get textContent() { return this._t; },
    set textContent(v) { writes++; this._t = v; }
  };
  return { el, writes: () => writes };
}

describe('setText', () => {
  it('skips the write when the string is unchanged', () => {
    const el = spyEl('C');
    setText(el.el, 'C');
    assert.equal(el.writes(), 0);
    assert.equal(el.el.textContent, 'C');
  });

  it('writes when the string changes', () => {
    const el = spyEl('C');
    setText(el.el, 'Dm');
    assert.equal(el.writes(), 1);
    assert.equal(el.el.textContent, 'Dm');
    setText(el.el, 'Dm');
    assert.equal(el.writes(), 1);
  });

  it('compares the string form so a numeric degree does not rewrite every frame', () => {
    const el = spyEl('');
    setText(el.el, 5);
    assert.equal(el.writes(), 1);
    assert.equal(el.el.textContent, '5');
    setText(el.el, 5);
    assert.equal(el.writes(), 1);
  });
});
