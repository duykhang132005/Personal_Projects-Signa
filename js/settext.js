// Write textContent only when the string actually differs.
export function setText(el, text) {
  const next = String(text);
  if (el.textContent !== next) el.textContent = next;
}
