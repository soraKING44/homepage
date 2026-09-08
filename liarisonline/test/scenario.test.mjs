import { test } from 'node:test';
import assert from 'node:assert';
import {
  handoutDocs,
  characterName,
  subjectsFor,
  normalizeOptions,
  nextButtonState,
  voteTimeUpMessage
} from '../js/scenario.js';

test('handoutDocs: single phase with filtered recipients', () => {
  const phases = [
    null,
    { handouts: [{ to: 'all', doc: 'opening' }, { to: 'zieg', doc: 'ho_zieg' }, { to: 'other', doc: 'ho_other' }] }
  ];
  const docsDefinition = {
    opening: { title: 'Opening', url: 'u1' },
    ho_zieg: { title: 'Zieg Doc', url: 'u2' },
    ho_other: { title: 'Other Doc', url: 'u3' }
  };

  const result = handoutDocs(phases, docsDefinition, 'zieg', 1, 1);
  assert.deepEqual(result, [
    { id: 'opening', title: 'Opening', url: 'u1' },
    { id: 'ho_zieg', title: 'Zieg Doc', url: 'u2' }
  ]);
});

test('handoutDocs: multiple phases without duplicates', () => {
  const phases = [
    { handouts: [{ to: 'all', doc: 'opening' }] },
    { handouts: [{ to: 'zieg', doc: 'ho_zieg' }, { to: 'all', doc: 'opening' }] },
    { handouts: [{ to: 'all', doc: 'closing' }] }
  ];
  const docsDefinition = {
    opening: { title: 'Opening', url: 'u1' },
    ho_zieg: { title: 'Zieg Doc', url: 'u2' },
    closing: { title: 'Closing', url: 'u3' }
  };

  const result = handoutDocs(phases, docsDefinition, 'zieg', 0, 2);
  assert.deepEqual(result, [
    { id: 'opening', title: 'Opening', url: 'u1' },
    { id: 'ho_zieg', title: 'Zieg Doc', url: 'u2' },
    { id: 'closing', title: 'Closing', url: 'u3' }
  ]);
});

test('handoutDocs: missing doc definition is ignored', () => {
  const phases = [
    { handouts: [{ to: 'all', doc: 'opening' }, { to: 'all', doc: 'missing' }] }
  ];
  const docsDefinition = {
    opening: { title: 'Opening', url: 'u1' }
  };

  const result = handoutDocs(phases, docsDefinition, 'zieg', 0, 0);
  assert.deepEqual(result, [
    { id: 'opening', title: 'Opening', url: 'u1' }
  ]);
});

test('characterName: found character returns name, unknown returns id', () => {
  const scenario = {
    characters: [
      { id: 'zieg', name: 'ジーク' },
      { id: 'tamer', name: 'タメル' }
    ]
  };

  assert.equal(characterName('zieg', scenario), 'ジーク');
  assert.equal(characterName('nope', scenario), 'nope');
});

test('characterName: character with no name falls back to id', () => {
  const scenario = {
    characters: [
      { id: 'zieg' }
    ]
  };

  assert.equal(characterName('zieg', scenario), 'zieg');
});

test('subjectsFor: array subjects excludes self', () => {
  const ballot = { subjects: ['zieg', 'tamer', 'other'] };
  const result = subjectsFor(ballot, 'zieg', {}, []);
  assert.deepEqual(result, ['tamer', 'other']);
});

test('subjectsFor: object subjects returns keys', () => {
  const ballot = { subjects: { zieg: true, tamer: false } };
  const result = subjectsFor(ballot, 'zieg', {}, []);
  assert.deepEqual(result, ['zieg', 'tamer']);
});

test('subjectsFor: others returns scenario characters except self', () => {
  const scenario = {
    characters: [
      { id: 'zieg' },
      { id: 'tamer' },
      { id: 'other' }
    ]
  };
  const ballot = { subjects: 'others' };
  const result = subjectsFor(ballot, 'zieg', scenario, []);
  assert.deepEqual(result, ['tamer', 'other']);
});

test('subjectsFor: with players array', () => {
  const scenario = {
    characters: [
      { id: 'zieg' },
      { id: 'tamer' }
    ]
  };
  const ballot = {};
  const players = [
    { characterId: 'zieg' },
    { characterId: 'tamer' }
  ];
  const result = subjectsFor(ballot, 'zieg', scenario, players);
  assert.deepEqual(result, ['tamer']);
});

test('subjectsFor: without players falls back to scenario characters', () => {
  const scenario = {
    characters: [
      { id: 'zieg' },
      { id: 'tamer' },
      { id: 'other' }
    ]
  };
  const ballot = {};
  const result = subjectsFor(ballot, 'zieg', scenario, undefined);
  assert.deepEqual(result, ['tamer', 'other']);
});

test('normalizeOptions: characters string converts to character ids', () => {
  const scenario = {
    characters: [
      { id: 'zieg', name: 'ジーク' },
      { id: 'tamer', name: 'タメル' }
    ]
  };
  const result = normalizeOptions('characters', scenario);
  assert.deepEqual(result, [
    { id: 'zieg', label: 'ジーク' },
    { id: 'tamer', label: 'タメル' }
  ]);
});

test('normalizeOptions: string array converts to normalized options', () => {
  const scenario = {
    characters: [
      { id: 'zieg', name: 'ジーク' },
      { id: 'tamer', name: 'タメル' }
    ]
  };
  const result = normalizeOptions(['zieg', 'tamer'], scenario);
  assert.deepEqual(result, [
    { id: 'zieg', label: 'ジーク' },
    { id: 'tamer', label: 'タメル' }
  ]);
});

test('normalizeOptions: object array preserves structure', () => {
  const scenario = {};
  const result = normalizeOptions([
    { id: 'x', label: 'ラベル' },
    { id: 'y', label: 'ラベル2' }
  ], scenario);
  assert.deepEqual(result, [
    { id: 'x', label: 'ラベル' },
    { id: 'y', label: 'ラベル2' }
  ]);
});

test('normalizeOptions: invalid elements are filtered out', () => {
  const scenario = {};
  const result = normalizeOptions([
    { id: 'valid' },
    {},
    { id: null },
    { id: 'another' }
  ], scenario);
  assert.deepEqual(result, [
    { id: 'valid', label: 'valid' },
    { id: 'another', label: 'another' }
  ]);
});

test('normalizeOptions: null or undefined label becomes id string', () => {
  const scenario = {};
  const result = normalizeOptions([
    { id: 'x', label: null },
    { id: 'y', label: undefined },
    { id: 'z', label: 'explicit' }
  ], scenario);
  assert.deepEqual(result, [
    { id: 'x', label: 'x' },
    { id: 'y', label: 'y' },
    { id: 'z', label: 'explicit' }
  ]);
});

test('nextButtonState: all ready is enabled', () => {
  const players = [
    { ready: true },
    { ready: true }
  ];
  const phase = { endsAt: 1000 };
  const now = 500;

  const result = nextButtonState(players, phase, now);
  assert.equal(result.enabled, true);
  assert.equal(result.readyCount, 2);
  assert.equal(result.total, 2);
  assert.equal(result.label, '次のフェーズへ');
});

test('nextButtonState: partial ready with time remaining is disabled', () => {
  const players = [
    { ready: true },
    { ready: false }
  ];
  const phase = { endsAt: 1000 };
  const now = 500;

  const result = nextButtonState(players, phase, now);
  assert.equal(result.enabled, false);
  assert.equal(result.readyCount, 1);
  assert.equal(result.total, 2);
  assert.equal(result.label, '次のフェーズへ（1 / 2人が準備完了）');
});

test('nextButtonState: time expired enables button', () => {
  const players = [
    { ready: false },
    { ready: false }
  ];
  const phase = { endsAt: 100 };
  const now = 500;

  const result = nextButtonState(players, phase, now);
  assert.equal(result.enabled, true);
  assert.equal(result.label, '次のフェーズへ');
});

test('voteTimeUpMessage: time not expired returns empty string', () => {
  const ballots = [{ id: 'b1' }];
  const isVoted = () => false;
  const endsAt = 1000;
  const now = 500;

  const result = voteTimeUpMessage(ballots, isVoted, endsAt, now);
  assert.equal(result, '');
});

test('voteTimeUpMessage: time expired, all voted', () => {
  const ballots = [
    { id: 'b1' },
    { id: 'b2' }
  ];
  const isVoted = () => true;
  const endsAt = 100;
  const now = 500;

  const result = voteTimeUpMessage(ballots, isVoted, endsAt, now);
  assert.equal(result, 'あなたの投票は完了しています。他のプレイヤーの投票をお待ちください。');
});

test('voteTimeUpMessage: time expired, not all voted', () => {
  const ballots = [
    { id: 'b1' },
    { id: 'b2' }
  ];
  const isVoted = (id) => id === 'b1';
  const endsAt = 100;
  const now = 500;

  const result = voteTimeUpMessage(ballots, isVoted, endsAt, now);
  assert.equal(result, '時間です。投票してください。');
});

test('voteTimeUpMessage: endsAt is not finite', () => {
  const ballots = [{ id: 'b1' }];
  const isVoted = () => false;
  const endsAt = undefined;
  const now = 500;

  const result = voteTimeUpMessage(ballots, isVoted, endsAt, now);
  assert.equal(result, '');
});
