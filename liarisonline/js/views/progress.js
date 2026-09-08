import { h } from '../html.js';
import { arrayOrEmpty, finiteNumber, formatTime } from '../util.js';
import { KIND_LABELS, conversationNote, docsMarkup, errorMarkup } from './shared.js';
import { characterName, nextButtonState } from '../scenario.js';

export function progressView(scenario, state, phase, now, uiError) {
  var me = state && state.me && typeof state.me === 'object' ? state.me : {};
  var players = arrayOrEmpty(state && state.players).filter(function (player) { return player && typeof player === 'object'; });
  var total = Math.max(1, finiteNumber(phase.total || arrayOrEmpty(scenario && scenario.phases).length || 1, 1));
  var index = Math.max(0, finiteNumber(phase.index, 0));
  var endsAt = finiteNumber(phase.endsAt, NaN);
  var remaining = Number.isFinite(endsAt) ? endsAt - now : 0;
  var minutes = Math.max(0, finiteNumber(phase.minutes, 0));
  var readyMessage = phase.kind === 'read'
    ? '配布された資料を読み終えたら、準備完了を押してください。全員が準備完了を押すと次のフェーズへ進みます。'
    : '議論が終わったら、準備完了を押してください。全員が準備完了を押すと次のフェーズへ進みます。';
  var readyHtml = (phase.kind === 'read' || phase.kind === 'discuss')
    ? h`<div class="section"><h3>準備</h3><p class="muted">${readyMessage}</p><button class="btn ${me.ready ? 'secondary' : ''}" data-action="ready" data-value="${!me.ready}">${me.ready ? '準備完了を取り消す' : '準備完了'}</button></div>`
    : '';
  var scenarioPhase = arrayOrEmpty(scenario && scenario.phases)[index] || {};
  var currentDocIds = {};
  arrayOrEmpty(scenarioPhase.handouts).forEach(function (handout) {
    if (handout && typeof handout === 'object' && handout.doc && (handout.to === 'all' || handout.to === me.characterId)) currentDocIds[handout.doc] = true;
  });
  var allDocs = arrayOrEmpty(state.docs);
  var currentDocs = allDocs.filter(function (doc) { return doc && typeof doc === 'object' && currentDocIds[doc.id]; });
  var pastDocs = allDocs.filter(function (doc) { return !(doc && typeof doc === 'object' && currentDocIds[doc.id]); });
  var characterOrder = arrayOrEmpty(scenario && scenario.characters).map(function (character) { return character && character.id; });
  var sortedPlayers = players.slice().sort(function (a, b) {
    var ai = characterOrder.indexOf(a.characterId);
    var bi = characterOrder.indexOf(b.characterId);
    if (ai < 0) ai = characterOrder.length;
    if (bi < 0) bi = characterOrder.length;
    return ai - bi;
  });
  var playersHtml = sortedPlayers.map(function (player) {
    var release = player.id !== (me.id || '') && player.connected === false
      ? h`<button type="button" class="btn link" data-action="release" data-player="${player.id}">席を解放</button>`
      : '';
    var statusClass = player.ready ? 'ready' : '';
    return h`<li class="player"><div class="player-main"><span class="player-name">${player.name || '参加者'}</span><span class="player-meta">${player.characterId ? characterName(player.characterId, scenario) : ''}</span></div><span class="status ${statusClass}">${player.ready ? '準備完了' : '準備中'}</span>${release}</li>`;
  });
  var buttonState = nextButtonState(players, phase, now);
  var nextButton = h`<button class="btn" data-action="next"${buttonState.enabled ? '' : ' disabled'}>${buttonState.label}</button>`;
  var kindLabel = KIND_LABELS[phase.kind] || phase.kind || '';
  var timerHtml = (minutes || Number.isFinite(endsAt))
    ? h`<div class="timer${remaining <= 0 ? ' expired' : ''}" data-timer aria-label="残り時間">${Number.isFinite(endsAt) ? (remaining > 0 ? formatTime(remaining) : '時間切れ') : formatTime(minutes * 60000)}</div>`
    : '';
  var noteHtml = phase.note ? h`<p class="note">${phase.note}</p>` : '';
  var pastDocsHtml = pastDocs.length ? h`<div class="section"><h3>これまでの配布資料</h3>${docsMarkup(pastDocs, scenario && scenario.docs)}</div>` : '';
  var myEvidenceId = me.characterId ? 'evidence_' + me.characterId : '';
  var sharedDocs = arrayOrEmpty(state.sharedDocs).filter(function (doc) { return doc && typeof doc === 'object'; });
  var hasMyEvidence = !!myEvidenceId && allDocs.some(function (doc) { return doc && doc.id === myEvidenceId; });
  var alreadyShared = sharedDocs.some(function (doc) { return doc.id === myEvidenceId; });
  var evidenceReadNoticeHtml = (hasMyEvidence && !alreadyShared && phase.kind === 'read')
    ? h`<p class="alert info">この証拠資料のうち、ログ・記録データ部分（公開可能）は、次の議論フェーズで共有ボタンから画面に出して公開できます。所感・観察や読み方のヒント部分（公開不可能）は共有ボタンの対象外ですが、内容を自分の言葉で口頭で伝えるのは問題ありません。</p>`
    : '';
  var shareButtonHtml = (hasMyEvidence && !alreadyShared && phase.kind === 'discuss')
    ? h`<div class="section"><h3>証拠ログの共有</h3><p class="muted">自分に配られた証拠ログを、全員に共有できます。</p><button class="btn secondary" type="button" data-action="share_doc" data-doc="${myEvidenceId}">証拠ログを共有する</button></div>`
    : '';
  var sharedDocsHtml = sharedDocs.length
    ? h`<div class="section"><h3>共有された証拠ログ</h3>${sharedDocs.map(function (doc) { return h`<div class="shared-doc"><h4>${doc.title}</h4><pre>${doc.log}</pre></div>`; })}</div>`
    : '';
  return h`<section class="card"><div class="phase-head"><div><p class="phase-kind">PHASE ${index + 1} / ${total} · ${kindLabel}</p><h2>${phase.title || ''}</h2></div>${timerHtml}</div><div class="progress-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${Math.min(total, index + 1)}" aria-label="進行状況"><span style="width:${Math.max(0, Math.min(100, ((index + 1) / total) * 100))}%"></span></div>${noteHtml}${conversationNote(phase.kind)}<div class="section"><h3>このフェーズの資料</h3>${docsMarkup(currentDocs, scenario && scenario.docs)}</div>${evidenceReadNoticeHtml}${pastDocsHtml}${shareButtonHtml}${sharedDocsHtml}${readyHtml}<div class="section"><h3>準備状況</h3><ul class="player-list">${playersHtml}</ul></div>${errorMarkup(uiError)}<div class="actions end">${nextButton}</div></section>`;
}
