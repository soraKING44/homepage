export function arrayOrEmpty(value) { return Array.isArray(value) ? value : []; }

export function finiteNumber(value, fallback) {
  if (value === null || value === undefined) return fallback;
  var number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function formatTime(milliseconds) {
  var seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}
