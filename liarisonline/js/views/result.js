import { h } from '../html.js';
import { arrayOrEmpty } from '../util.js';
import { docsMarkup, conversationNote } from './shared.js';
import { characterName } from '../scenario.js';

function playerName(players, id) {
  var found = arrayOrEmpty(players).find(function (player) { return player && player.id === id; });
  return found ? (found.name || '参加者') : id;
}

export function resultView(scenario, state, phase) {
  var result = (state && state.result) || {};
  var docs = arrayOrEmpty(state && state.docs);
  var allDocs = arrayOrEmpty(state && state.allDocs);
  var players = arrayOrEmpty(state && state.players);
  var scenarioDocs = scenario && scenario.docs;
  var culprit = result.culprit && typeof result.culprit === 'object' ? result.culprit : {};

  var secretScores = result.secretScores && typeof result.secretScores === 'object' ? result.secretScores : {};
  var secretScoreRows = Object.keys(secretScores).map(function (id) {
    var entry = secretScores[id] || {};
    var culpritBonus = typeof entry === 'object' ? (entry.culpritBonus || 0) : 0;
    var secretBonus = typeof entry === 'object' ? (entry.secretBonus || 0) : 0;
    var guessPenalty = typeof entry === 'object' ? (entry.guessPenalty || 0) : 0;
    var total = typeof entry === 'object' ? (entry.total || 0) : entry;
    var player = arrayOrEmpty(players).find(function (p) { return p && p.id === id; });
    var isShinoken = player && player.characterId === 'shinoken';
    var secretCell = isShinoken ? '-' : (secretBonus === 0 ? '0点（守り切れなかった）' : secretBonus + '点');
    return h`<tr><th scope="row">${playerName(players, id)}</th><td>${culpritBonus}点</td><td>${secretCell}</td><td>${guessPenalty}点</td><td>${total}点</td></tr>`;
  });
  var secretScoreTable = secretScoreRows.length
    ? h`<div class="table-wrap"><table class="result-table"><caption class="sr-only">得点</caption><thead><tr><th scope="col">プレイヤー</th><th scope="col">犯人投票</th><th scope="col">秘密防衛</th><th scope="col">秘密推理</th><th scope="col">合計</th></tr></thead><tbody>${secretScoreRows}</tbody></table></div>`
    : h`<p class="muted">得点データがありません。</p>`;

  var counts = culprit.counts && typeof culprit.counts === 'object' ? culprit.counts : (culprit.votes && typeof culprit.votes === 'object' ? culprit.votes : {});
  var culpritRows = Object.keys(counts).map(function (id) {
    return h`<tr><th scope="row">${characterName(id, scenario)}</th><td>${counts[id]}票</td></tr>`;
  });
  var culpritTop = typeof culprit.top === 'string' && culprit.top ? characterName(culprit.top, scenario) : '同票';
  var culpritTable = culpritRows.length
    ? h`<div class="table-wrap"><table class="result-table"><caption class="sr-only">犯人投票の集計</caption><thead><tr><th scope="col">候補</th><th scope="col">得票</th></tr></thead><tbody>${culpritRows}</tbody></table></div><p class="lead">最多得票: <strong>${culpritTop}</strong></p>`
    : h`<p class="muted">犯人投票の結果はありません。</p>`;

  var secret = result.secret && typeof result.secret === 'object' ? result.secret : {};
  var answerPayload = result.answers && typeof result.answers === 'object' ? result.answers : {};
  var answers = answerPayload.secret && typeof answerPayload.secret === 'object' ? answerPayload.secret : answerPayload;
  var judgements = result.secretJudgements && typeof result.secretJudgements === 'object' ? result.secretJudgements : {};
  var overrides = result.secretOverrides && typeof result.secretOverrides === 'object' ? result.secretOverrides : {};
  var votesBySubject = {};
  Object.keys(result.secretVotes || {}).forEach(function (voterId) {
    var voterAnswers = result.secretVotes[voterId] || {};
    Object.keys(voterAnswers).forEach(function (subject) {
      votesBySubject[subject] = votesBySubject[subject] || [];
      votesBySubject[subject].push({ voterId: voterId, text: voterAnswers[subject] });
    });
  });
  var secretGuideNote = h`<p class="muted">表示されているキーワードは正解の一例です。回答文にキーワードが含まれていれば自動で正解と判定しますが、この自動判定は間違えることがあります。最終的な正誤はここで人が判断し、『正解にする』『不正解にする』ボタンで確定させてください。</p>`;
  var secretSections = Object.keys(secret).map(function (subject) {
    var item = secret[subject] || {};
    var keywords = Array.isArray(answers[subject]) ? answers[subject] : (answers[subject] ? [answers[subject]] : []);
    var rows = (votesBySubject[subject] || []).map(function (entry) {
      var isCorrect = judgements[entry.voterId] && judgements[entry.voterId][subject];
      var isOverridden = overrides[subject] && Object.prototype.hasOwnProperty.call(overrides[subject], entry.voterId);
      var judgementLabel = h`${isCorrect ? h`<span class="status ready">正解</span>` : h`<span class="status">不正解</span>`}${isOverridden ? h`<span class="muted"> (手動判定)</span>` : ''}`;
      var toggleLabel = isCorrect ? '不正解にする' : '正解にする';
      var toggleButton = h`<button type="button" class="btn link" data-action="override-secret" data-subject="${subject}" data-voter="${entry.voterId}" data-correct="${isCorrect ? 'false' : 'true'}">${toggleLabel}</button>`;
      return h`<tr><th scope="row">${playerName(players, entry.voterId)}</th><td>${entry.text}</td><td>${judgementLabel}</td><td>${toggleButton}</td></tr>`;
    });
    var table = rows.length
      ? h`<div class="table-wrap"><table class="result-table"><caption class="sr-only">${characterName(subject, scenario)}の秘密投票</caption><thead><tr><th scope="col">回答者</th><th scope="col">回答</th><th scope="col">判定</th><th scope="col">操作</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : h`<p class="muted">回答がありません。</p>`;
    return h`<div class="section"><h4>${characterName(subject, scenario)}の秘密</h4><p class="muted">正解キーワード: ${keywords.join('、')}</p>${table}<p class="lead">見抜いた人数: ${item.correct} / ${item.total}人 ${item.success ? h`<span class="status ready">隠し通し成功</span>` : h`<span class="status">隠し通し失敗</span>`}</p></div>`;
  });
  var secretTable = secretSections.length ? h`${secretGuideNote}${secretSections}` : h`<p class="muted">秘密投票の結果はありません。</p>`;

  var endingDocs = docs.filter(function (doc) { return doc && typeof doc.id === 'string' && (doc.id.indexOf('ending_') === 0 || doc.id.indexOf('secret_') === 0); });
  var messageHtml = (result.message || result.summary)
    ? h`<div class="section"><h3>結果の詳細</h3><p>${result.message || result.summary}</p></div>`
    : '';
  var allDocsSection = allDocs.length ? h`<div class="section"><h3>全ての資料（感想戦用）</h3>${docsMarkup(allDocs, scenarioDocs)}</div>` : '';

  return h`<section class="card"><p class="eyebrow">RESULT</p><h2>${phase.title || '結果'}</h2><p class="lead">投票結果と、あなたに公開された資料を確認してください。</p>${conversationNote(phase.kind)}<div class="section"><h3>エンディング</h3>${docsMarkup(endingDocs, scenarioDocs)}</div><div class="section"><h3>犯人投票</h3>${culpritTable}</div><div class="section"><h3>秘密投票</h3>${secretTable}</div><div class="section"><h3>得点</h3>${secretScoreTable}</div>${allDocsSection}${messageHtml}<div class="section"><p class="muted">ゲームは終了しました。終わったらこの部屋を退出してください。</p></div><div class="actions end"><button class="btn secondary" data-action="leave" data-confirm="終了しますか？">終了する</button></div></section>`;
}
