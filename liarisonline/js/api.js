export function apiBase() {
  var configured = (typeof window !== 'undefined' && window.MDMS_API_BASE) ||
    (typeof document !== 'undefined' && document.documentElement.dataset.apiBase) || '';
  return String(configured).replace(/\/$/, '');
}

export function apiUrl(path) { return apiBase() + path; }

export function errorMessage(status, code) {
  if (status === 429 || status === 1015 || status === 503 || code === 'quota') return '本日の無料利用枠を超えました。日本時間 朝9時にリセットされます。';
  if (status === 404 || code === 'room_not_found') return 'その部屋は見つかりません。コードを確認してください。';
  if (code === 'game_started') return 'その部屋はすでに進行中です。';
  if (status === 409 || code === 'room_full' || code === 'full') return 'その部屋は満席です。';
  if (code === 'character_taken') return 'そのキャラクターはすでに選ばれています。';
  if (code === 'version_mismatch' || code === 'version') return 'バージョンが一致しません。ページを再読み込みしてください。';
  if (code === 'unauthorized') return '認証に失敗しました。部屋に入り直してください。';
  if (code === 'not_ready') return 'まだ全員の準備（または投票）が完了していません。';
  return 'サーバーでエラーが発生しました。しばらくしてから再試行してください。';
}

export async function request(path, options) {
  var response;
  try {
    response = await fetch(apiUrl(path), options);
  } catch (_) {
    throw new Error('network');
  }
  var body = null;
  try { body = await response.json(); } catch (_) { /* no JSON body */ }
  if (!response.ok) {
    var err = new Error(errorMessage(response.status, body && typeof body.code === 'string' ? body.code : undefined));
    err.status = response.status;
    err.code = body && typeof body.code === 'string' ? body.code : undefined;
    throw err;
  }
  return body || {};
}

export function post(path, body) {
  return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
}
