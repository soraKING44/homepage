import { strict as assert } from 'assert';
import { test } from 'node:test';
import { voteView } from '../js/views/vote.js';
import { SafeString } from '../js/html.js';

test('mode !== "guess" では <label class="choice"> が生成される', () => {
  const scenario = {
    characters: [
      { id: 'ray', name: 'レイ' },
      { id: 'ritsu', name: 'リツ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'ray', votes: {} },
    players: [{ characterId: 'ray', voted: false }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'ballot-1',
        title: '投票1',
        mode: 'regular',
        options: ['ray', 'ritsu']
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(htmlString.includes('<label class="choice">'), 'label要素が含まれていない');
  assert(htmlString.includes('type="radio"'), 'radio入力が含まれていない');
});

test('mode === "guess" では <input type="text"> が生成される', () => {
  const scenario = {
    characters: [
      { id: 'ray', name: 'レイ' },
      { id: 'ritsu', name: 'リツ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'ray', votes: {} },
    players: [{ characterId: 'ray', voted: false }, { characterId: 'ritsu', voted: false }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'guess-ballot',
        title: '秘密を当てよう',
        mode: 'guess',
        subjects: 'others'
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(htmlString.includes('type="text"'), 'text入力が含まれていない');
  assert(htmlString.includes('class="guess-input"'), 'guess-input クラスが含まれていない');
  assert(htmlString.includes('maxlength="200"'), 'maxlength属性が含まれていない');
});

test('投票済みの場合は disabled 属性と「この投票は確定済みです。」が含まれる', () => {
  const scenario = {
    characters: [
      { id: 'ray', name: 'レイ' },
      { id: 'ritsu', name: 'リツ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'ray', votes: { 'ballot-1': 'ritsu' } },
    players: [{ characterId: 'ray', voted: true }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'ballot-1',
        title: '投票1',
        mode: 'regular',
        options: ['ray', 'ritsu']
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(htmlString.includes(' disabled'), 'disabled属性が含まれていない');
  assert(htmlString.includes('この投票は確定済みです。'), '「この投票は確定済みです。」が含まれていない');
});

test('me.characterId === "shinoken" のときの得点説明', () => {
  const scenario = {
    characters: [
      { id: 'shinoken', name: '真犯人' },
      { id: 'ray', name: 'レイ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'shinoken', votes: {} },
    players: [{ characterId: 'shinoken', voted: false }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'ballot-1',
        title: '投票1',
        mode: 'regular',
        options: ['shinoken', 'ray']
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(htmlString.includes('あなたが犯人投票で当てられずに逃げ切ると+10点'), '+10点の文言が含まれていない');
  assert(!htmlString.includes('犯人投票で真犯人を当てると、全員に+10点'), '「犯人投票で真犯人を当てると、全員に+10点」が含まれるべきではない');
});

test('me.characterId === "ray" のときの得点説明', () => {
  const scenario = {
    characters: [
      { id: 'shinoken', name: '真犯人' },
      { id: 'ray', name: 'レイ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'ray', votes: {} },
    players: [{ characterId: 'ray', voted: false }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'ballot-1',
        title: '投票1',
        mode: 'regular',
        options: ['shinoken', 'ray']
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(htmlString.includes('+9点'), '+9点が含まれていない');
  assert(htmlString.includes('犯人投票で真犯人を当てると、全員に+10点'), '「犯人投票で真犯人を当てると、全員に+10点」が含まれていない');
});

test('ユーザー入力値に <script> を含む文字列がエスケープされる', () => {
  const scenario = {
    characters: [
      { id: 'ray', name: 'レイ' },
      { id: 'ritsu', name: 'リツ' }
    ],
    docs: {}
  };
  const state = {
    me: { characterId: 'ray', votes: { 'guess-ballot': { ritsu: '<script>alert("xss")</script>' } } },
    players: [{ characterId: 'ray', voted: true }, { characterId: 'ritsu', voted: false }],
    ballots: [],
    docs: []
  };
  const phase = {
    title: '投票',
    kind: 'vote',
    index: 0,
    ballots: [
      {
        id: 'guess-ballot',
        title: '秘密を当てよう',
        mode: 'guess',
        subjects: ['ritsu']
      }
    ]
  };
  const now = Date.now();
  const html = voteView(scenario, state, phase, now, null);
  const htmlString = html instanceof SafeString ? html.toString() : String(html);
  assert(!htmlString.includes('<script>'), '<script>タグが含まれている（エスケープされていない）');
  assert(htmlString.includes('&lt;script&gt;'), 'エスケープされた<script>が含まれていない');
});
