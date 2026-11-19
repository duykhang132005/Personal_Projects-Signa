import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startErrorMessage, handModelError, HAND_MODEL_STATUS } from '../js/errors.js';

describe('startErrorMessage', () => {
  it('uses a specific status for a hand model load failure, not a camera error', () => {
    const err = handModelError(new Error('missing wasm'));
    assert.equal(err.name, 'HandModelError');
    assert.equal(startErrorMessage(err), HAND_MODEL_STATUS);
    assert.match(HAND_MODEL_STATUS, /vendor\/ folder/);
    assert.notEqual(startErrorMessage(err), startErrorMessage({ name: 'NotAllowedError' }));
  });

  it('keeps the existing camera error messages', () => {
    assert.equal(startErrorMessage({ name: 'NotAllowedError' }), 'Camera permission denied. Allow camera access in your browser.');
    assert.equal(startErrorMessage({ name: 'SecurityError' }), 'Camera permission denied. Allow camera access in your browser.');
    assert.equal(startErrorMessage({ name: 'NotFoundError' }), 'No camera found.');
    assert.equal(startErrorMessage({ name: 'OverconstrainedError' }), 'No camera found.');
    assert.equal(startErrorMessage({ name: 'NotReadableError' }), 'Camera is in use by another app.');
    assert.equal(startErrorMessage({ name: 'Other', message: 'boom' }), 'Error: boom');
  });
});
