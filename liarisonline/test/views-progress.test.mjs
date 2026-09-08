import { test } from 'node:test';
import * as assert from 'node:assert';
import { progressView } from '../js/views/progress.js';

test('progressView: all players ready on read phase - next button enabled', () => {
  const scenario = {
    phases: [
      { kind: 'read', title: 'Phase 1', index: 0 }
    ],
    characters: [
      { id: 'char1', name: 'Character 1' },
      { id: 'char2', name: 'Character 2' }
    ],
    docs: {}
  };

  const state = {
    me: { id: 'player1', characterId: 'char1', ready: true },
    players: [
      { id: 'player1', name: 'Player 1', characterId: 'char1', ready: true, connected: true },
      { id: 'player2', name: 'Player 2', characterId: 'char2', ready: true, connected: true }
    ],
    docs: []
  };

  const phase = {
    kind: 'read',
    title: 'Phase 1',
    index: 0,
    total: 1
  };

  const now = Date.now();
  const html = String(progressView(scenario, state, phase, now, null));

  assert.match(html, /<button[^>]*data-action="next"[^>]*>次のフェーズへ<\/button>/, 'Next button should exist');
  assert.ok(!html.match(/<button[^>]*data-action="next"[^>]*disabled/), 'Next button should not have disabled attribute');
});

test('progressView: partial ready players - next button disabled with status message', () => {
  const scenario = {
    phases: [
      { kind: 'read', title: 'Phase 1', index: 0 }
    ],
    characters: [
      { id: 'char1', name: 'Character 1' },
      { id: 'char2', name: 'Character 2' }
    ],
    docs: {}
  };

  const state = {
    me: { id: 'player1', characterId: 'char1', ready: true },
    players: [
      { id: 'player1', name: 'Player 1', characterId: 'char1', ready: true, connected: true },
      { id: 'player2', name: 'Player 2', characterId: 'char2', ready: false, connected: true }
    ],
    docs: []
  };

  const phase = {
    kind: 'read',
    title: 'Phase 1',
    index: 0,
    total: 1
  };

  const now = Date.now();
  const html = String(progressView(scenario, state, phase, now, null));

  assert.match(html, /<button[^>]*data-action="next"[^>]*disabled/, 'Next button should have disabled attribute');
  assert.match(html, /1 \/ 2人が準備完了/, 'Status message should show 1 / 2 ready');
});

test('progressView: XSS attack in player name - should be escaped', () => {
  const scenario = {
    phases: [
      { kind: 'read', title: 'Phase 1', index: 0 }
    ],
    characters: [
      { id: 'char1', name: 'Character 1' }
    ],
    docs: {}
  };

  const state = {
    me: { id: 'player1', characterId: 'char1', ready: true },
    players: [
      { id: 'player1', name: '<script>alert("XSS")</script>', characterId: 'char1', ready: true, connected: true }
    ],
    docs: []
  };

  const phase = {
    kind: 'read',
    title: 'Phase 1',
    index: 0,
    total: 1
  };

  const now = Date.now();
  const html = String(progressView(scenario, state, phase, now, null));

  assert.match(html, /&lt;script&gt;/, 'Script tag should be escaped as &lt;script&gt;');
  assert.ok(!html.includes('<script>alert("XSS")</script>'), 'Raw script tag should not be present');
});

test('progressView: read phase includes ready section, vote phase excludes it', () => {
  const scenario = {
    phases: [
      { kind: 'read', title: 'Read Phase', index: 0 },
      { kind: 'vote', title: 'Vote Phase', index: 1 }
    ],
    characters: [
      { id: 'char1', name: 'Character 1' }
    ],
    docs: {}
  };

  const state = {
    me: { id: 'player1', characterId: 'char1', ready: true },
    players: [
      { id: 'player1', name: 'Player 1', characterId: 'char1', ready: true, connected: true }
    ],
    docs: []
  };

  const now = Date.now();

  const readPhase = {
    kind: 'read',
    title: 'Read Phase',
    index: 0,
    total: 2
  };

  const votePhase = {
    kind: 'vote',
    title: 'Vote Phase',
    index: 1,
    total: 2
  };

  const readHtml = String(progressView(scenario, state, readPhase, now, null));
  const voteHtml = String(progressView(scenario, state, votePhase, now, null));

  assert.match(readHtml, /<h3>準備<\/h3>/, 'Read phase should include 準備 section');
  assert.match(readHtml, /class="btn[^"]*"[^>]*data-action="ready"/, 'Read phase should include ready button');

  assert.ok(!voteHtml.match(/<div[^>]*class="section"[^>]*><h3>準備<\/h3>/), 'Vote phase should not have 準備 section');
  assert.ok(!voteHtml.match(/data-action="ready"/), 'Vote phase should not have ready button');
});

test('progressView: shows share button when own evidence doc is available and not yet shared (discuss phase)', () => {
  const scenario = {
    phases: [{ kind: 'discuss', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', url: 'pdf/x.pdf' }],
    sharedDocs: []
  };
  const phase = { kind: 'discuss', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.match(html, /data-action="share_doc"[^>]*data-doc="evidence_zieg"/, 'Share button should exist with correct doc id');
});

test('progressView: hides share button during read phase even when own evidence doc is available', () => {
  const scenario = {
    phases: [{ kind: 'read', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', url: 'pdf/x.pdf' }],
    sharedDocs: []
  };
  const phase = { kind: 'read', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.ok(!html.match(/data-action="share_doc"/), 'Share button should not be present during read phase');
});

test('progressView: hides share button when own evidence doc is already shared', () => {
  const scenario = {
    phases: [{ kind: 'read', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', url: 'pdf/x.pdf' }],
    sharedDocs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', log: 'dummy log' }]
  };
  const phase = { kind: 'read', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.ok(!html.match(/data-action="share_doc"/), 'Share button should not be present once already shared');
});

test('progressView: renders shared evidence logs from other players', () => {
  const scenario = {
    phases: [{ kind: 'read', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }, { id: 'ritsu', name: 'リツ' }],
    docs: {}
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [],
    sharedDocs: [{ id: 'evidence_ritsu', title: '追加情報：リツ担当', log: 'SNS投稿記録の内容' }]
  };
  const phase = { kind: 'read', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.match(html, /共有された証拠ログ/, 'Should include shared docs section heading');
  assert.match(html, /SNS投稿記録の内容/, 'Should include the shared log content');
});

test('progressView: shows evidence read notice during read phase when own evidence is not yet shared', () => {
  const scenario = {
    phases: [{ kind: 'read', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', url: 'pdf/x.pdf' }],
    sharedDocs: []
  };
  const phase = { kind: 'read', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.match(html, /次の議論フェーズで共有ボタンから他プレイヤーに公開できるようになります/, 'Evidence read notice should be present');
});

test('progressView: hides evidence read notice during discuss phase', () => {
  const scenario = {
    phases: [{ kind: 'discuss', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [{ id: 'evidence_zieg', title: '追加情報：ジーク担当', url: 'pdf/x.pdf' }],
    sharedDocs: []
  };
  const phase = { kind: 'discuss', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.ok(!html.match(/次の議論フェーズで共有ボタンから他プレイヤーに公開できるようになります/), 'Evidence read notice should not be present during discuss phase');
});

test('progressView: hides evidence read notice when own evidence is not yet distributed', () => {
  const scenario = {
    phases: [{ kind: 'read', title: 'Evidence Phase', index: 0 }],
    characters: [{ id: 'zieg', name: 'ジーク' }],
    docs: { evidence_zieg: { title: '追加情報：ジーク担当', url: 'pdf/x.pdf' } }
  };
  const state = {
    me: { id: 'player1', characterId: 'zieg', ready: true },
    players: [{ id: 'player1', name: 'Player 1', characterId: 'zieg', ready: true, connected: true }],
    docs: [],
    sharedDocs: []
  };
  const phase = { kind: 'read', title: 'Evidence Phase', index: 0, total: 1 };
  const html = String(progressView(scenario, state, phase, Date.now(), null));
  assert.ok(!html.match(/次の議論フェーズで共有ボタンから他プレイヤーに公開できるようになります/), 'Evidence read notice should not be present when evidence is not yet distributed');
});
