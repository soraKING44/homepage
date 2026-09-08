import { test } from 'node:test';
import assert from 'node:assert';
import { resultView } from '../js/views/result.js';

function getSafeStringValue(obj) {
  if (obj && obj.value !== undefined) return obj.value;
  return String(obj);
}

test('secretScores が空のとき「得点データがありません。」が含まれる', () => {
  var scenario = { characters: [] };
  var state = { result: { secretScores: {} }, docs: [], players: [] };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('得点データがありません。'), 'secretScoresが空の場合、メッセージが含まれるべき');
});

test('secretScores に値がある場合、プレイヤーごとの得点行が生成される', () => {
  var scenario = { characters: [] };
  var state = {
    result: {
      secretScores: {
        'player1': { culpritBonus: 10, secretBonus: 20, guessPenalty: 5, total: 25 }
      }
    },
    docs: [],
    players: [{ id: 'player1', name: 'テストプレイヤー' }]
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('テストプレイヤー'), 'プレイヤー名が含まれるべき');
  assert(result.includes('10点'), '犯人投票得点が含まれるべき');
  assert(result.includes('20点'), '秘密防衛得点が含まれるべき');
  assert(result.includes('5点'), '秘密推理得点が含まれるべき');
  assert(result.includes('25点'), '合計得点が含まれるべき');
});

test('secretBonus === 0 のとき「0点（守り切れなかった）」の文言が含まれる（シノケン以外）', () => {
  var scenario = { characters: [] };
  var state = {
    result: {
      secretScores: {
        'player1': { culpritBonus: 0, secretBonus: 0, guessPenalty: 0, total: 0 }
      }
    },
    docs: [],
    players: [{ id: 'player1', name: 'テストプレイヤー', characterId: 'ray' }]
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('0点（守り切れなかった）'), 'シノケン以外でsecretBonus=0の場合、文言が含まれるべき');
});

test('シノケン役のとき秘密防衛セルは常に「-」で表示される', () => {
  var scenario = { characters: [] };
  var state = {
    result: {
      secretScores: {
        'player1': { culpritBonus: 0, secretBonus: 0, guessPenalty: 0, total: 0 }
      }
    },
    docs: [],
    players: [{ id: 'player1', name: 'シノケン役', characterId: 'shinoken' }]
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('-</td><td>0点</td>'), 'シノケン役の秘密防衛セルが「-」で表示されるべき');
  assert(!result.includes('守り切れなかった'), 'シノケン役に「守り切れなかった」の文言が含まれてはいけない');
});

test('culprit.counts に投票結果がある場合、キャラクター名と得票数が表示される', () => {
  var scenario = {
    characters: [
      { id: 'char1', name: 'キャラクター1' },
      { id: 'char2', name: 'キャラクター2' }
    ]
  };
  var state = {
    result: {
      culprit: {
        counts: { 'char1': 3, 'char2': 2 },
        top: 'char1'
      },
      secretScores: {}
    },
    docs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('キャラクター1'), 'キャラクター1が含まれるべき');
  assert(result.includes('3票'), 'キャラクター1の投票数が含まれるべき');
  assert(result.includes('キャラクター2'), 'キャラクター2が含まれるべき');
  assert(result.includes('2票'), 'キャラクター2の投票数が含まれるべき');
  assert(result.includes('最多得票: <strong>キャラクター1</strong>'), '最多得票が含まれるべき');
});

test('culprit.top が無い場合は「同票」と表示される', () => {
  var scenario = {
    characters: [
      { id: 'char1', name: 'キャラクター1' }
    ]
  };
  var state = {
    result: {
      culprit: {
        counts: { 'char1': 1 },
        top: null
      },
      secretScores: {}
    },
    docs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('最多得票: <strong>同票</strong>'), '同票が表示されるべき');
});

test('回答テキストの XSS 対策: <script> がエスケープされる', () => {
  var scenario = {
    characters: [
      { id: 'char1', name: 'キャラクター1' }
    ]
  };
  var state = {
    result: {
      culprit: { counts: {} },
      secret: { 'char1': { correct: 0, total: 1, success: false } },
      secretScores: {},
      secretVotes: {
        'player1': { 'char1': '<script>alert("xss")</script>' }
      },
      secretJudgements: { 'player1': { 'char1': false } }
    },
    docs: [],
    players: [{ id: 'player1', name: 'プレイヤー1' }]
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(!result.includes('<script>alert'), 'scriptタグが含まれてはいけない');
  assert(result.includes('&lt;script&gt;'), 'scriptタグがエスケープされるべき');
});

test('docs の ending_ 接頭辞の振り分け', () => {
  var scenario = {
    characters: [],
    docs: {
      'ending_1': { title: 'エンディング1', url: 'http://example.com/ending1' },
      'other_doc': { title: '他の資料', url: 'http://example.com/other' }
    }
  };
  var state = {
    result: { culprit: {}, secretScores: {} },
    docs: [
      { id: 'ending_1' },
      { id: 'other_doc' }
    ],
    allDocs: [
      { id: 'ending_1' },
      { id: 'other_doc' }
    ],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('エンディング1'), 'エンディング1が含まれるべき');
  assert(result.includes('他の資料'), '他の資料が含まれるべき');
});

test('result.message がある場合「結果の詳細」セクションが表示される', () => {
  var scenario = { characters: [] };
  var state = {
    result: {
      culprit: {},
      secretScores: {},
      message: 'これはテストメッセージです'
    },
    docs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('結果の詳細'), '結果の詳細セクションが含まれるべき');
  assert(result.includes('これはテストメッセージです'), 'メッセージが含まれるべき');
});

test('result.message がない場合「結果の詳細」セクションは表示されない', () => {
  var scenario = { characters: [] };
  var state = {
    result: {
      culprit: {},
      secretScores: {}
    },
    docs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(!result.includes('<div class="section"><h3>結果の詳細</h3>'), '結果の詳細セクションが含まれないべき');
});

test('秘密投票の正解/不正解の判定が表示される', () => {
  var scenario = {
    characters: [
      { id: 'char1', name: 'キャラクター1' }
    ]
  };
  var state = {
    result: {
      culprit: { counts: {} },
      secret: { 'char1': { correct: 1, total: 1, success: true } },
      secretScores: {},
      secretVotes: {
        'player1': { 'char1': '正しい回答' }
      },
      secretJudgements: { 'player1': { 'char1': true } }
    },
    docs: [],
    players: [{ id: 'player1', name: 'プレイヤー1' }]
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(result.includes('<span class="status ready">正解</span>'), '正解判定が含まれるべき');
  assert(result.includes('隠し通し成功'), '隠し通し成功が含まれるべき');
});

test('state.docs に secret_ で始まるドキュメントが含まれる場合、エンディングセクションに統合される', () => {
  var scenario = {
    characters: [],
    docs: {
      'secret_zieg': { title: 'ツィーク秘密公開', url: 'http://example.com/secret_zieg' }
    }
  };
  var state = {
    result: { culprit: {}, secretScores: {} },
    docs: [
      { id: 'secret_zieg', title: 'ツィーク秘密公開', url: 'http://example.com/secret_zieg' }
    ],
    allDocs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(!result.includes('見抜かれた秘密の公開資料'), '「見抜かれた秘密の公開資料」という見出しは含まれないべき');
  assert(result.includes('<h3>エンディング</h3>'), 'エンディングセクションが含まれるべき');
  assert(result.includes('ツィーク秘密公開'), '秘密公開資料がエンディングセクション内に含まれるべき');
});

test('state.docs に secret_ で始まるドキュメントがない場合、見出しが含まれない', () => {
  var scenario = {
    characters: [],
    docs: {
      'ending_1': { title: 'エンディング', url: 'http://example.com/ending_1' }
    }
  };
  var state = {
    result: { culprit: {}, secretScores: {} },
    docs: [
      { id: 'ending_1', title: 'エンディング', url: 'http://example.com/ending_1' }
    ],
    allDocs: [],
    players: []
  };
  var phase = { title: 'テスト', kind: 'result' };
  var result = getSafeStringValue(resultView(scenario, state, phase));
  assert(!result.includes('見抜かれた秘密の公開資料'), '「見抜かれた秘密の公開資料」という見出しが含まれないべき');
});
