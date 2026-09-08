export function esc(value) {
  var text = value === null || value === undefined ? '' : String(value);
  return text.replace(/[&<>"']/g, function (ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

export class SafeString {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export function raw(value) {
  return new SafeString(value === null || value === undefined ? '' : String(value));
}

function escapeValue(value) {
  if (value instanceof SafeString) return value.value;
  if (Array.isArray(value)) return value.map(escapeValue).join('');
  return esc(value);
}

export function h(strings, ...values) {
  var out = strings[0];
  for (var i = 0; i < values.length; i++) {
    out += escapeValue(values[i]) + strings[i + 1];
  }
  return raw(out);
}

export function safeDocUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return '';
  var resolvedBase = base || (typeof document !== 'undefined' ? document.baseURI : undefined);
  try {
    var parsed = new URL(value, resolvedBase);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch (_) {
    return '';
  }
}
