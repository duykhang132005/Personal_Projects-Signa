import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isTypingTarget, shortcutAction } from '../js/keys.js';

describe('shortcutAction', () => {
  it('ignores shortcuts while a select, input, or textarea has focus', () => {
    for (const tag of ['SELECT', 'INPUT', 'TEXTAREA']) {
      assert.equal(isTypingTarget({ tagName: tag }), true);
      assert.equal(shortcutAction(' ', { typing: true, fullscreen: false }), null);
      assert.equal(shortcutAction('Escape', { typing: true, fullscreen: false }), null);
      assert.equal(shortcutAction('f', { typing: true, fullscreen: false }), null);
    }
    assert.equal(isTypingTarget({ tagName: 'BUTTON' }), false);
  });

  it('maps Space and Esc to silence, and F to toggle full screen', () => {
    assert.equal(shortcutAction(' ', { typing: false, fullscreen: false }), 'silence');
    assert.equal(shortcutAction('Escape', { typing: false, fullscreen: false }), 'silence');
    assert.equal(shortcutAction('f', { typing: false, fullscreen: false }), 'toggle-fs');
    assert.equal(shortcutAction('F', { typing: false, fullscreen: false }), 'toggle-fs');
  });

  it('maps Esc to exit full screen while in full screen, not silence', () => {
    assert.equal(shortcutAction('Escape', { typing: false, fullscreen: true }), 'exit-fs');
    assert.equal(shortcutAction(' ', { typing: false, fullscreen: true }), 'silence');
  });
});
