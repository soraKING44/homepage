import { h } from '../html.js';
import { arrayOrEmpty, finiteNumber, formatTime } from '../util.js';
import { conversationNote, docsMarkup, errorMarkup } from './shared.js';
import { characterName, subjectsFor, normalizeOptions } from '../scenario.js';

function ownVote(state, ballotId) {
  var votes = state && state.me && state.me.votes;
  return votes && typeof votes === 'object' ? votes[ballotId] : undefined;
}

function selectedGuess(state, ballotId, subject) {
  var vote = ownVote(state, ballotId);
  if (!vote || Array.isArray(vote)) return '';
  return vote[subject] || '';
}

export function voteView(scenario, state, phase, now, uiError) {
  var me = state && state.me && typeof state.me === 'object' ? state.me : {};
  var players = arrayOrEmpty(state && state.players);
  var ballots = arrayOrEmpty(phase.ballots && phase.ballots.length ? phase.ballots : state && state.ballots).filter(function (ballot) { return ballot && typeof ballot === 'object' && ballot.id; });

  var ballotBlocks = ballots.map(function (ballot) {
    var current = ownVote(state, ballot.id);
    var locked = current !== undefined && current !== null;
    var body;
    if (ballot.mode === 'guess') {
      body = subjectsFor(ballot, me.characterId, scenario, players).map(function (subject) {
        var savedValue = selectedGuess(state, ballot.id, subject) || '';
        return h`<fieldset class="guess-subject"><legend>${characterName(subject, scenario)} の秘密</legend><div class="choice-list"><input type="text" class="guess-input" name="${ballot.id + ':' + subject}" data-ballot="${ballot.id}" data-subject="${subject}" value="${savedValue}" maxlength="200" placeholder="自由記述で回答してください"${locked ? ' disabled' : ''}></div></fieldset>`;
      });
    } else {
      var options = normalizeOptions(ballot.options || arrayOrEmpty(scenario && scenario.characters).map(function (character) { return character.id; }), scenario);
      body = h`<div class="choice-list">${options.map(function (option) {
        var checked = Array.isArray(current) ? (current.indexOf(option.id) >= 0 ? ' checked' : '') : (current === option.id ? ' checked' : '');
        return h`<label class="choice"><input type="radio" name="${ballot.id}" value="${option.id}" data-ballot="${ballot.id}"${checked}${locked ? ' disabled' : ''}><span>${option.label || option.id}</span></label>`;
      })}</div>`;
    }
    var lockedNote = locked ? h`<p class="vote-count">この投票は確定済みです。</p>` : '';
    return h`<fieldset class="vote-block"><legend><strong>${ballot.title || ballot.id}${ballot.mode !== 'guess' ? '（必須）' : ''}</strong></legend>${body}${lockedNote}</fieldset>`;
  });

  var voted = players.filter(function (player) { return player && typeof player === 'object' && player.voted; }).length;
  var voteEndsAt = finiteNumber(phase.endsAt, NaN);
  var voteRemaining = Number.isFinite(voteEndsAt) ? voteEndsAt - now : 0;
  var voteIndex = Math.max(0, finiteNumber(phase.index, 0));
  var voteBackButton = voteIndex > 0 ? h`<button class="btn secondary" type="button" data-action="back">投票をやり直す</button>` : '';

  var myCharacterId = me.characterId;
  var myScoreLine = myCharacterId === 'shinoken'
    ? 'あなたが犯人投票で当てられずに逃げ切ると+10点'
    : (myCharacterId ? 'あなたの秘密を言い当てた人が4人未満なら+' + ({ ray: 9, ritsu: 6, yuipisu: 5, zieg: 3 }[myCharacterId] || 0) + '点' : '');
  var culpritLine = myCharacterId === 'shinoken' ? '' : h`<li>犯人投票で真犯人を当てると、全員に+10点</li>`;
  var guessPenaltyLine = h`<li>他人の秘密を外すと1件につき-1点（正解しても加点はありません）。わからない場合は空欄のまま提出すれば、その項目の減点はありません。</li>`;
  var scoreGuideHtml = h`<div class="alert info"><strong>得点について</strong><ul>${culpritLine}${myScoreLine ? h`<li>${myScoreLine}</li>` : ''}${guessPenaltyLine}</ul></div>`;
  var hasGuessBallot = ballots.some(function (ballot) { return ballot && ballot.mode === 'guess'; });
  var guessNoteHtml = hasGuessBallot ? h`<p class="note">わからない場合は、該当する欄を空欄のままにしてください。減点の対象にはなりません。</p>` : '';

  var noteHtml = phase.note ? h`<p class="note">${phase.note}</p>` : '';
  var timerHtml = Number.isFinite(voteEndsAt)
    ? h`<div class="timer${voteRemaining <= 0 ? ' expired' : ''}" data-timer aria-label="残り時間">${voteRemaining > 0 ? formatTime(voteRemaining) : '時間切れ'}</div>`
    : '';

  return h`<section class="card"><div class="phase-head"><div><p class="phase-kind">VOTE</p><h2>${phase.title || '投票'}</h2></div>${timerHtml}</div>${noteHtml}${conversationNote(phase.kind)}<div class="section"><h3>配布資料</h3>${docsMarkup(arrayOrEmpty(state && state.docs), scenario && scenario.docs)}</div><p class="vote-count">投票確定済み: ${voted} / ${players.length}人</p><form id="vote-form" class="section">${scoreGuideHtml}${ballotBlocks}${guessNoteHtml}${errorMarkup(uiError)}<div class="actions end">${voteBackButton}<button class="btn" type="submit">投票を確定する</button></div></form></section>`;
}
