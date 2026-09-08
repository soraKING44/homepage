import test from 'node:test';
import assert from 'assert';
import { transitionView } from '../js/views/transition.js';

test('phase.kind === "vote" shows "投票を始める" button', () => {
  var html = String(transitionView({ kind: 'vote', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(html.includes('投票を始める'), 'should contain "投票を始める"');
});

test('phase.kind === "result" shows "結果を見る" button', () => {
  var html = String(transitionView({ kind: 'result', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(html.includes('結果を見る'), 'should contain "結果を見る"');
});

test('phase.kind === "discuss" shows "議論を始める" button', () => {
  var html = String(transitionView({ kind: 'discuss', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(html.includes('議論を始める'), 'should contain "議論を始める"');
});

test('phase.kind === "read" shows "読み始める" button', () => {
  var html = String(transitionView({ kind: 'read', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(html.includes('読み始める'), 'should contain "読み始める"');
});

test('phase.kind with unknown value shows "読み始める" button', () => {
  var html = String(transitionView({ kind: 'unknown', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(html.includes('読み始める'), 'should contain "読み始める"');
});

test('script tag in phase.title is escaped', () => {
  var html = String(transitionView({ kind: 'vote', index: 0, total: 3, title: '<script>alert("xss")</script>' }, null));
  assert.ok(!html.includes('<script>'), 'should not contain unescaped script tag');
  assert.ok(html.includes('&lt;script&gt;'), 'should contain escaped script tag');
});

test('data-action and data-index attributes are present', () => {
  var html = String(transitionView({ kind: 'vote', index: 2, total: 5, title: 'Test' }, null));
  assert.ok(html.includes('data-action="ack-phase"'), 'should contain data-action="ack-phase"');
  assert.ok(html.includes('data-index="2"'), 'should contain data-index="2"');
});

test('phase.note without value does not render <p class="lead">', () => {
  var html = String(transitionView({ kind: 'vote', index: 0, total: 3, title: 'Test' }, null));
  assert.ok(!html.includes('<p class="lead">'), 'should not contain <p class="lead">');
});

test('phase.note with value renders <p class="lead">', () => {
  var html = String(transitionView({ kind: 'vote', index: 0, total: 3, title: 'Test', note: 'Sample note' }, null));
  assert.ok(html.includes('<p class="lead">'), 'should contain <p class="lead">');
  assert.ok(html.includes('Sample note'), 'should contain note text');
});
