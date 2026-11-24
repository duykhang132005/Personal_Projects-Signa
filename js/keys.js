// Keyboard shortcuts shared by the page and tests.
// Focused selects, inputs, textareas, and buttons keep their own keys.
export function isTypingTarget(el) {
  const tag = el && el.tagName;
  return tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON';
}

// Returns 'silence', 'toggle-fs', 'exit-fs', or null.
// Esc exits full screen instead of silencing the chord when already in full screen.
// Ctrl, Cmd (meta), and Alt combos are ignored so browser shortcuts still work.
export function shortcutAction(key, { typing, fullscreen, ctrlKey, metaKey, altKey } = {}) {
  if (typing || ctrlKey || metaKey || altKey) return null;
  if (key === 'f' || key === 'F') return 'toggle-fs';
  if (key === 'Escape') return fullscreen ? 'exit-fs' : 'silence';
  if (key === ' ') return 'silence';
  return null;
}
