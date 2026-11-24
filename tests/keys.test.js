import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isTypingTarget, shortcutAction } from '../js/keys.js';

describe('shortcutAction', () => {
  it('ignores shortcuts while a select, input, textarea, or button has focus', () => {
    for (const tag of ['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON']) {
      const typing = isTypingTarget({ tagName: tag });
      assert.equal(typing, true);
      assert.equal(shortcutAction(' ', { typing, fullscreen: false }), null);
      assert.equal(shortcutAction('Escape', { typing, fullscreen: false }), null);
      assert.equal(shortcutAction('f', { typing, fullscreen: false }), null);
    }
    assert.equal(isTypingTarget({ tagName: 'DIV' }), false);
    assert.equal(isTypingTarget(null), false);
  });

  it('ignores Ctrl, Cmd, and Alt so browser shortcuts are not captured', () => {
    const keys = ['f', 'F', ' ', 'Escape'];
    for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      for (const key of keys) {
        assert.equal(shortcutAction(key, { typing: false, fullscreen: false, ...extra }), null);
        assert.equal(shortcutAction(key, { typing: false, fullscreen: true, ...extra }), null);
      }
    }
    assert.equal(shortcutAction('f', { typing: false, fullscreen: false, ctrlKey: false, metaKey: false, altKey: false }), 'toggle-fs');
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
