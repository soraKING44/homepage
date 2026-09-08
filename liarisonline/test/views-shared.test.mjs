import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { docsMarkup, conversationNote, errorMarkup } from '../js/views/shared.js';

test('docsMarkup with empty docs shows empty message', () => {
  var result = String(docsMarkup([], {}));
  assert.match(result, /このフェーズで配布される資料はありません/);
});

test('docsMarkup escapes HTML in title', () => {
  var result = String(docsMarkup([{ id: 'a', title: '<script>x</script>', url: 'https://example.com/a.pdf' }], {}));
  assert.match(result, /&lt;script&gt;/);
  assert(!/^<script>|[^&]<script>/.test(result), 'should not contain unescaped <script> tag');
});

test('docsMarkup with invalid URL shows unavailable', () => {
  var result = String(docsMarkup([{ id: 'a', title: 'Test', url: 'javascript:alert(1)' }], {}));
  assert.match(result, /資料を開けません/);
  assert(!result.includes('href="javascript:'), 'should not include javascript: URL in href');
});

test('conversationNote discuss phase', () => {
  var result = String(conversationNote('discuss'));
  assert.match(result, /自由に話し合ってください/);
});

test('conversationNote read phase', () => {
  var result = String(conversationNote('read'));
  assert.match(result, /相談はできません/);
});

test('conversationNote result phase', () => {
  var result = String(conversationNote('result'));
  assert.match(result, /台本を声に出して読み合わせてください/);
});

test('errorMarkup with empty string returns empty', () => {
  var result = String(errorMarkup(''));
  assert.strictEqual(result, '');
});

test('errorMarkup escapes HTML', () => {
  var result = String(errorMarkup('<b>err</b>'));
  assert.match(result, /&lt;b&gt;/);
  assert(!result.includes('<b>err</b>'), 'should not contain unescaped <b> tag');
  assert.match(result, /&lt;\/b&gt;/);
});
