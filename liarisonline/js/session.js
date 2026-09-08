var SESSION_KEY = 'mdms.session';
var MANUAL_SESSION_KEY = 'mdms.manual';

function json(value) {
  try { return JSON.stringify(value); } catch (_) { return ''; }
}

function finiteNumber(value, fallback) {
  if (value === null || value === undefined) return fallback;
  var number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function saveSession(session) {
  if (!session) return;
  try { localStorage.setItem(SESSION_KEY, json(session)); } catch (_) { /* private browsing */ }
}

export function loadSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed.code === 'string' && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/i.test(parsed.code) &&
        typeof parsed.playerId === 'string' && parsed.playerId && typeof parsed.token === 'string' && parsed.token) {
      parsed.code = parsed.code.toUpperCase();
      return parsed;
    }
  } catch (_) { /* ignore malformed storage */ }
  return null;
}

export function removeSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ }
}

export function saveManual(manual) {
  if (!manual) return;
  try { localStorage.setItem(MANUAL_SESSION_KEY, json(manual)); } catch (_) { /* private browsing */ }
}

export function loadManual() {
  try {
    var raw = localStorage.getItem(MANUAL_SESSION_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    var phaseIndex = finiteNumber(parsed.phaseIndex, 0);
    if (!Number.isInteger(phaseIndex) || phaseIndex < 0) phaseIndex = 0;
    return { characterId: typeof parsed.characterId === 'string' ? parsed.characterId : '', phaseIndex: phaseIndex };
  } catch (_) { return null; }
}

export function removeManual() {
  try { localStorage.removeItem(MANUAL_SESSION_KEY); } catch (_) { /* ignore */ }
}
