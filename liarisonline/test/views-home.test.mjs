import test from 'node:test';
import assert from 'node:assert';
import { homeView } from '../js/views/home.js';

test('homeView includes scenario title when provided', () => {
  const result = homeView({ title: 'テストシナリオ' }, '');
  const html = String(result);
  assert(html.includes('テストシナリオ'), 'Should include scenario title');
});

test('homeView uses default title when scenario is null', () => {
  const result = homeView(null, '');
  const html = String(result);
  assert(html.includes('GMレス進行ツール'), 'Should include default title');
});

test('homeView escapes error markup to prevent XSS', () => {
  const result = homeView(null, '<script>err</script>');
  const html = String(result);
  assert(!html.includes('<script>'), 'Should not include raw script tag');
  assert(html.includes('&lt;script&gt;'), 'Should include escaped script tag');
});

test('homeView includes all required element IDs and actions', () => {
  const result = homeView({}, '');
  const html = String(result);
  assert(html.includes('id="create-name"'), 'Should include create-name input');
  assert(html.includes('id="join-code"'), 'Should include join-code input');
  assert(html.includes('id="join-name"'), 'Should include join-name input');
  assert(html.includes('data-action="create"'), 'Should include create action');
  assert(html.includes('data-action="join"'), 'Should include join action');
  assert(html.includes('data-action="manual"'), 'Should include manual action');
});

test('homeView includes preparation info for players', () => {
  const result = homeView({}, '');
  const html = String(result);
  assert(html.includes('プレイに必要な準備'), 'Should include preparation section heading');
  assert(html.includes('プレイ人数：5名'), 'Should include player count info');
});
