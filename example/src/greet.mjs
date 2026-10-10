export function greet(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed ? `Hello, ${trimmed}!` : 'Hello, World!';
}
