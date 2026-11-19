// User-facing messages for Start failures (camera vs hand model).
export const HAND_MODEL_STATUS = 'Hand model failed to load. Check that the vendor/ folder is present and serve the page over http.';

export function startErrorMessage(e) {
  if (e && e.name === 'HandModelError') return HAND_MODEL_STATUS;
  switch (e && e.name) {
    case 'NotAllowedError':
    case 'SecurityError': return 'Camera permission denied. Allow camera access in your browser.';
    case 'NotFoundError':
    case 'OverconstrainedError': return 'No camera found.';
    case 'NotReadableError': return 'Camera is in use by another app.';
    default: return 'Error: ' + (e && e.message ? e.message : e);
  }
}

export function handModelError(cause) {
  const err = new Error(HAND_MODEL_STATUS);
  err.name = 'HandModelError';
  err.cause = cause;
  return err;
}
