// Initial of a part = its first letter in any script (\p{L}); parts without one are skipped.
// NFC first, so a decomposed accent stays on its letter ("e\u0301" -> "É").
export function initials(name) {
  return String(name)
    .normalize('NFC')
    .split(/[\s-]+/)
    .map((part) => part.match(/\p{L}/u)?.[0] ?? '')
    .join('')
    .toUpperCase();
}
