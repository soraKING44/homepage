import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { raw } from '../js/html.js';
import { manualSetupView, manualPhaseIndex, manualView } from '../js/views/manual.js';

test('manualSetupView: character list rendered as buttons', () => {
  const scenario = {
    characters: [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ]
  };
  const result = manualSetupView(scenario, null, null);
  const html = String(result);
  assert.ok(html.includes('data-action="preview-manual-character"'));
  assert.ok(html.includes('data-character="alice"'));
  assert.ok(html.includes('data-character="bob"'));
  assert.ok(html.includes('Alice'));
  assert.ok(html.includes('Bob'));
});

test('manualSetupView: character name with script tag is escaped', () => {
  const scenario = {
    characters: [
      { id: 'alice', name: '<script>alert("xss")</script>' }
    ]
  };
  const result = manualSetupView(scenario, null, null);
  const html = String(result);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('manualPhaseIndex: clamps negative phase index to 0', () => {
  const scenario = { phases: [{ id: 'p1' }, { id: 'p2' }] };
  const manual = { phaseIndex: -1 };
  const result = manualPhaseIndex(scenario, manual);
  assert.equal(result, 0);
});

test('manualPhaseIndex: clamps large phase index to phases.length - 1', () => {
  const scenario = { phases: [{ id: 'p1' }, { id: 'p2' }] };
  const manual = { phaseIndex: 5 };
  const result = manualPhaseIndex(scenario, manual);
  assert.equal(result, 1);
});

test('manualPhaseIndex: returns valid index', () => {
  const scenario = { phases: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] };
  const manual = { phaseIndex: 1 };
  const result = manualPhaseIndex(scenario, manual);
  assert.equal(result, 1);
});

test('manualView: shows message when phases are empty', () => {
  const scenario = { phases: [] };
  const manual = { characterId: 'alice', phaseIndex: 0 };
  const result = manualView(scenario, manual, null);
  const html = String(result);
  assert.ok(html.includes('シナリオにフェーズがありません。'));
});

test('manualView: first phase does not include back button', () => {
  const scenario = {
    phases: [
      { id: 'p1', title: 'Phase 1', kind: 'read', handouts: [] },
      { id: 'p2', title: 'Phase 2', kind: 'read', handouts: [] }
    ],
    characters: [{ id: 'alice', name: 'Alice' }],
    docs: {}
  };
  const manual = { characterId: 'alice', phaseIndex: 0 };
  const result = manualView(scenario, manual, null);
  const html = String(result);
  assert.ok(!html.includes('data-action="manual-back"'));
});

test('manualView: last phase includes end button but not next button', () => {
  const scenario = {
    phases: [
      { id: 'p1', title: 'Phase 1', kind: 'read', handouts: [] },
      { id: 'p2', title: 'Phase 2', kind: 'result', branches: [] }
    ],
    characters: [{ id: 'alice', name: 'Alice' }],
    docs: {}
  };
  const manual = { characterId: 'alice', phaseIndex: 1 };
  const result = manualView(scenario, manual, null);
  const html = String(result);
  assert.ok(html.includes('data-action="manual-home"'));
  assert.ok(html.includes('data-confirm="終了しますか？"'));
  assert.ok(!html.includes('data-action="manual-next"'));
});

test('manualView: read phase with minutes includes timeout message', () => {
  const scenario = {
    phases: [
      {
        id: 'p1',
        title: 'Phase 1',
        kind: 'read',
        minutes: 5,
        handouts: []
      }
    ],
    characters: [{ id: 'alice', name: 'Alice' }],
    docs: {}
  };
  const manual = { characterId: 'alice', phaseIndex: 0 };
  const result = manualView(scenario, manual, null);
  const html = String(result);
  assert.ok(html.includes('制限時間（5分）を過ぎたら'));
});

test('manualView: doc title with script tag is escaped', () => {
  const scenario = {
    phases: [
      {
        id: 'p1',
        title: 'Phase 1',
        kind: 'read',
        handouts: [
          { doc: 'doc1', to: 'all' }
        ]
      }
    ],
    characters: [{ id: 'alice', name: 'Alice' }],
    docs: {
      doc1: {
        title: '<script>alert("xss")</script>',
        url: 'http://example.com'
      }
    }
  };
  const manual = { characterId: 'alice', phaseIndex: 0 };
  const result = manualView(scenario, manual, null);
  const html = String(result);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
