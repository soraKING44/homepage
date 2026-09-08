import { test } from 'node:test';
import assert from 'node:assert';
import { errorMessage, apiBase } from '../js/api.js';

test('errorMessage: 429 and quota both return same message', () => {
  const msg429 = errorMessage(429, undefined);
  const msgQuota = errorMessage(undefined, 'quota');
  assert.strictEqual(msg429, '本日の無料利用枠を超えました。日本時間 朝9時にリセットされます。');
  assert.strictEqual(msgQuota, '本日の無料利用枠を超えました。日本時間 朝9時にリセットされます。');
  assert.strictEqual(msg429, msgQuota);
});

test('errorMessage: 404 and room_not_found both return same message', () => {
  const msg404 = errorMessage(404, undefined);
  const msgRoomNotFound = errorMessage(undefined, 'room_not_found');
  assert.strictEqual(msg404, 'その部屋は見つかりません。コードを確認してください。');
  assert.strictEqual(msgRoomNotFound, 'その部屋は見つかりません。コードを確認してください。');
  assert.strictEqual(msg404, msgRoomNotFound);
});

test('errorMessage: character_taken returns correct message', () => {
  const msg = errorMessage(undefined, 'character_taken');
  assert.strictEqual(msg, 'そのキャラクターはすでに選ばれています。');
});

test('errorMessage: unknown status and code return default message', () => {
  const msg = errorMessage(500, 'unknown');
  assert.strictEqual(msg, 'サーバーでエラーが発生しました。しばらくしてから再試行してください。');
});

test('apiBase: no window/document returns empty string', () => {
  const result = apiBase();
  assert.strictEqual(result, '');
});
