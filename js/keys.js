// Keyboard shortcuts shared by the page and tests.
export function isTypingTarget(el) {
  const tag = el && el.tagName;
  return tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA';
}

// Returns 'silence', 'toggle-fs', 'exit-fs', or null.
// Esc exits full screen instead of silencing the chord when already in full screen.
export function shortcutAction(key, { typing, fullscreen } = {}) {
  if (typing) return null;
  if (key === 'f' || key === 'F') return 'toggle-fs';
  if (key === 'Escape') return fullscreen ? 'exit-fs' : 'silence';
  if (key === ' ') return 'silence';
  return null;
}
