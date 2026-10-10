export function initials(name) {
  return String(name)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('');
}
