/* global fetch */
import { finiteNumber, arrayOrEmpty, formatTime } from './js/util.js';
import { errorMarkup } from './js/views/shared.js';
import { characterName, subjectsFor, nextButtonState, voteTimeUpMessage } from './js/scenario.js';
import { loadSession, saveSession, removeSession, loadManual, saveManual, removeManual } from './js/session.js';
import { apiBase, errorMessage, post } from './js/api.js';
import { createSocket, wsUrlFor } from './js/socket.js';
import { h } from './js/html.js';
import { homeView } from './js/views/home.js';
import { lobbyView } from './js/views/lobby.js';
import { progressView } from './js/views/progress.js';
import { voteView } from './js/views/vote.js';
import { resultView } from './js/views/result.js';
import { manualSetupView, manualView, manualPhaseIndex } from './js/views/manual.js';
import { transitionView } from './js/views/transition.js';

var app = {
  scenario: null,
  state: null,
  session: null,
  clockOffset: 0,
  timer: null,
  manual: null,
  uiError: '',
  ackPhaseIndex: null,
  lobbyPreview: null,
  manualPreview: null,
  view: document.getElementById('view'),
  banner: document.getElementById('connection-banner'),
  voteTimeUpBanner: document.getElementById('vote-timeup-banner')
};

function setBanner(message, error, retry) {
  app.banner.textContent = '';
  if (message) {
    var text = document.createElement('span');
    text.textContent = message;
    app.banner.appendChild(text);
  }
  if (retry) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn link';
    button.dataset.action = 'retry';
    button.textContent = '再試行';
    app.banner.appendChild(document.createTextNode(' '));
    app.banner.appendChild(button);
    var manual = document.createElement('button');
    manual.type = 'button';
    manual.className = 'btn link';
    manual.dataset.action = 'manual';
    manual.textContent = '手動進行';
    app.banner.appendChild(document.createTextNode(' '));
    app.banner.appendChild(manual);
  }
  app.banner.hidden = !message;
  app.banner.className = 'connection-banner' + (error ? ' error' : '');
  app.banner.setAttribute('role', error ? 'alert' : 'status');
  app.banner.setAttribute('aria-live', error ? 'assertive' : 'polite');
}

function updateVoteTimeUp(text) {
  if (!app.voteTimeUpBanner) return;
  if (!text) {
    app.voteTimeUpBanner.hidden = true;
  } else {
    app.voteTimeUpBanner.textContent = text;
    app.voteTimeUpBanner.hidden = false;
  }
}

function showError(message) { app.uiError = message || ''; render(); }

function showInlineError(message) {
  app.uiError = message || '';
  var old = app.view.querySelector('.inline-error');
  if (old) old.remove();
  if (!message) return;
  var alert = document.createElement('div');
  alert.className = 'alert error inline-error';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  var form = document.getElementById('vote-form');
  var actionsInForm = form && form.querySelector('.actions');
  if (actionsInForm) form.insertBefore(alert, actionsInForm);
  else app.view.insertBefore(alert, app.view.firstChild);
}

function clearSession() {
  app.session = null;
  app.state = null;
  removeSession();
}

function clearManual() {
  app.manual = null;
  removeManual();
}

function startManual() {
  connection.close();
  clearSession();
  setBanner('', false);
  app.uiError = '';
  app.manualPreview = null;
  app.manual = { characterId: '', phaseIndex: 0 };
  saveManual(app.manual);
  render();
}

function acceptSession(data, code, name) {
  var sessionCode = typeof code === 'string' ? code.toUpperCase() : '';
  if (!data || typeof data.playerId !== 'string' || !data.playerId || typeof data.token !== 'string' || !data.token ||
      !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(sessionCode)) throw new Error('invalid_response');
  app.session = { code: sessionCode, playerId: data.playerId, token: data.token, name: name || '' };
  saveSession(app.session);
  app.uiError = '';
  render();
  connection.connect();
}

function enterRoom(code, name, creating) {
  var promise = creating ? post('/api/rooms', { name: name }) : post('/api/rooms/' + encodeURIComponent(code) + '/join', { name: name });
  return promise.then(function (data) { acceptSession(data, data.code || code, name); })
    .catch(function (err) {
      if (err.message === 'network') showError('サーバーに接続できません。Worker の状態を確認して再試行してください。');
      else showError(errorMessage(err.status, err.code));
    });
}

function receiveState(next) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) return;
  app.state = Object.assign({}, next, {
    phase: next.phase && typeof next.phase === 'object' ? next.phase : null,
    me: next.me && typeof next.me === 'object' ? next.me : {},
    players: arrayOrEmpty(next.players),
    docs: arrayOrEmpty(next.docs),
    ballots: arrayOrEmpty(next.ballots)
  });
  if (Number.isFinite(next.serverTime)) app.clockOffset = next.serverTime - Date.now();
  app.uiError = '';
  setBanner('', false);
  render();
}

var connection = createSocket({
  getSession: function () { return app.session; },
  buildUrl: function (session) { return wsUrlFor(apiBase(), session); },
  onConnecting: function () { setBanner('サーバーに接続しています…', false); },
  onOpen: function () { setBanner('', false); render(); },
  onState: function (state) { receiveState(state); },
  onServerError: function (status, code) { showError(errorMessage(status, code)); },
  onSocketError: function () { setBanner('サーバーに接続できません。再接続を試みています…', true); },
  onAuthFailed: function () {
    setBanner('認証に失敗しました。部屋に入り直してください。', true);
    app.uiError = 'セッションの有効期限が切れています。';
    render();
  },
  onRoomGone: function () {
    clearSession();
    setBanner('', false);
    app.uiError = '部屋が見つかりませんでした。もう一度部屋を作るか参加してください。';
    render();
  },
  onReconnectScheduled: function (delayMs) {
    setBanner('接続が切れました。' + (delayMs / 1000) + '秒後に再接続します…', false);
  },
  onReconnectFailed: function () {
    setBanner('サーバーに接続できません。', true, true);
    render();
  },
  onSendFailed: function () {
    showError('サーバーに接続できません。接続が戻るまでお待ちください。');
  }
});

function showConfirm(message, onConfirm) {
  var modal = document.getElementById('confirm-modal');
  if (!modal) return;
  var handleKeydown = function (e) { if (e.key === 'Escape') handleCancel(); };
  var closeModal = function () {
    modal.hidden = true;
    document.removeEventListener('keydown', handleKeydown);
  };
  var handleConfirm = function () { closeModal(); onConfirm(); };
  var handleCancel = function () { closeModal(); };
  modal.innerHTML = '<div class="confirm-overlay" role="dialog" aria-modal="true"><div class="confirm-content"><div class="confirm-message">' + String(h`${message}`) + '</div><div class="confirm-actions"><button type="button" class="btn secondary" data-confirm-cancel>キャンセル</button><button type="button" class="btn" data-confirm-ok>OK</button></div></div></div>';
  modal.hidden = false;
  var okBtn = modal.querySelector('[data-confirm-ok]');
  var cancelBtn = modal.querySelector('[data-confirm-cancel]');
  var overlay = modal.querySelector('.confirm-overlay');
  if (okBtn) okBtn.addEventListener('click', handleConfirm);
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) handleCancel(); });
  document.addEventListener('keydown', handleKeydown);
}

function now() { return Date.now() + (Number.isFinite(app.clockOffset) ? app.clockOffset : 0); }
function phaseOf() { return app.state && app.state.phase && typeof app.state.phase === 'object' ? app.state.phase : null; }

function hasVoted(ballotId) {
  var votes = app.state && app.state.me && app.state.me.votes;
  var v = votes && typeof votes === 'object' ? votes[ballotId] : undefined;
  return v !== undefined && v !== null;
}

function recoveringView(session, uiError) {
  return h`<section class="card narrow"><h2>部屋に再接続しています</h2><p class="lead">部屋コード <strong>${session.code}</strong> の状態を復元しています。</p>${errorMarkup(uiError)}<div class="actions"><button class="btn" data-action="retry">再試行</button><button class="btn secondary" data-action="manual">手動進行モードへ</button><button class="btn secondary" data-action="leave">このセッションを破棄</button></div></section>`;
}

function updateHeader() {
  var title = app.scenario && app.scenario.title;
  document.getElementById('scenario-title').textContent = title || 'GMレス進行ツール';
  var sessionHud = document.getElementById('session-hud');
  if (sessionHud) sessionHud.hidden = !app.session;
  var chip = document.getElementById('room-chip');
  if (chip) {
    chip.hidden = !app.session;
    var roomCode = chip.querySelector('.room-code');
    if (roomCode) roomCode.textContent = app.session ? app.session.code : '';
    else chip.textContent = app.session ? '部屋 ' + app.session.code : '';
  }
  var myCharacterId = app.state && app.state.me && app.state.me.characterId;
  var characterChip = document.getElementById('character-chip');
  if (characterChip) {
    characterChip.hidden = !app.session;
    var roleName = characterChip.querySelector('.session-role');
    if (roleName) roleName.textContent = myCharacterId ? characterName(myCharacterId, app.scenario) : '役職未選択';
    else characterChip.textContent = myCharacterId ? 'あなたの役: ' + characterName(myCharacterId, app.scenario) : '';
  }
  var leaveButton = document.getElementById('leave-room-btn');
  if (leaveButton) leaveButton.hidden = !app.session;
}

function selectView() {
  if (app.manual && !app.manual.characterId) return manualSetupView(app.scenario, app.manualPreview, app.uiError);
  if (app.manual) return manualView(app.scenario, app.manual, app.uiError);
  if (!app.session) return homeView(app.scenario, app.uiError);
  if (!app.state) return recoveringView(app.session, app.uiError);
  if (!phaseOf()) {
    app.ackPhaseIndex = -1;
    return lobbyView(app.scenario, app.state, app.session, app.lobbyPreview, app.uiError);
  }
  var phase = phaseOf();
  var phaseKey = finiteNumber(phase.index, 0);
  if (app.ackPhaseIndex === null) app.ackPhaseIndex = phaseKey;
  if (phaseKey > app.ackPhaseIndex) return transitionView(phase, app.uiError);
  if (phase.kind === 'vote') {
    var ballots = arrayOrEmpty(phase.ballots && phase.ballots.length ? phase.ballots : app.state.ballots);
    var voteMsg = voteTimeUpMessage(ballots, hasVoted, finiteNumber(phase.endsAt, NaN), now());
    updateVoteTimeUp(voteMsg);
    return voteView(app.scenario, app.state, phase, now(), app.uiError);
  }
  if (phase.kind === 'result') return resultView(app.scenario, app.state, phase);
  return progressView(app.scenario, app.state, phase, now(), app.uiError);
}

function restartTimer() {
  if (app.timer) clearInterval(app.timer);
  app.timer = null;
  var phase = phaseOf();
  if (!phase || !Number.isFinite(finiteNumber(phase.endsAt, NaN))) return;
  app.timer = setInterval(tickTimer, 500);
}

function tickTimer() {
  var phase = phaseOf();
  if (!phase) return;
  var timerEl = document.querySelector('[data-timer]');
  var endsAt = finiteNumber(phase.endsAt, 0);
  var remaining = endsAt - now();
  if (timerEl) {
    timerEl.textContent = remaining > 0 ? formatTime(remaining) : '時間切れ';
    timerEl.classList.toggle('expired', remaining <= 0);
  }
  if (phase.kind === 'read' || phase.kind === 'discuss') {
    var players = arrayOrEmpty(app.state && app.state.players).filter(function (player) { return player && typeof player === 'object'; });
    var buttonState = nextButtonState(players, phase, now());
    var nextButton = document.querySelector('[data-action="next"]');
    if (nextButton) {
      if (buttonState.enabled) nextButton.removeAttribute('disabled');
      else nextButton.setAttribute('disabled', '');
      nextButton.textContent = buttonState.label;
    }
  } else if (phase.kind === 'vote') {
    var ballots = arrayOrEmpty(phase.ballots && phase.ballots.length ? phase.ballots : app.state && app.state.ballots);
    var message = voteTimeUpMessage(ballots, hasVoted, finiteNumber(phase.endsAt, NaN), now());
    updateVoteTimeUp(message);
  }
}

function render() {
  updateVoteTimeUp('');
  updateHeader();
  var markup = selectView();
  app.view.innerHTML = String(markup);
  restartTimer();
}

function requiredName(id) { var input = document.getElementById(id); return input && input.value.trim(); }

function handleClick(event) {
  var button = event.target.closest('[data-action]');
  if (!button) return;
  var action = button.dataset.action;
  if (action === 'create' || action === 'join') {
    // Disabled during development: blocks the multi-tab-one-browser testing
    // workflow. Must be re-enabled before release -- see docs/app_issues.md.
    // var existing = loadSession();
    // if (existing) {
    //   app.session = existing;
    //   app.uiError = 'このブラウザは既に別のセッションに参加しています。';
    //   render();
    //   connection.connect();
    //   return;
    // }
    var name = requiredName(action === 'create' ? 'create-name' : 'join-name');
    var code = requiredName('join-code');
    if (!name) { showError('名前を入力してください。'); return; }
    if (action === 'join' && (!code || !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/i.test(code))) { showError('6文字の部屋コードを入力してください。'); return; }
    button.disabled = true;
    enterRoom(code && code.toUpperCase(), name, action === 'create').finally(function () { button.disabled = false; });
  } else if (action === 'ack-phase') {
    app.ackPhaseIndex = finiteNumber(button.dataset.index, app.ackPhaseIndex);
    render();
  } else if (action === 'preview-character') { app.lobbyPreview = button.dataset.character || ''; render(); }
  else if (action === 'preview-manual-character') { app.manualPreview = button.dataset.character || ''; render(); }
  else if (action === 'pick') connection.send('pick', { characterId: button.dataset.character });
  else if (action === 'ready') connection.send('ready', { value: button.dataset.value === 'true' });
  else if (action === 'next' || action === 'back') {
    var confirmMessage;
    if (action === 'back' && phaseOf() && phaseOf().kind === 'vote') {
      confirmMessage = '投票をやり直しますか？（あなたの投票のみ取り消されます）';
    } else {
      confirmMessage = action === 'next' ? '次のフェーズへ進みますか？' : '前のフェーズへ戻りますか？';
    }
    showConfirm(confirmMessage, function () { connection.send(action); });
  } else if (action === 'release') {
    showConfirm('この参加者の席を解放しますか？', function () { connection.send('release', { playerId: button.dataset.player }); });
  } else if (action === 'override-secret') {
    var subject = button.dataset.subject;
    var voterId = button.dataset.voter;
    var correct = button.dataset.correct === 'true';
    showConfirm('この回答の判定を' + (correct ? '正解' : '不正解') + 'に変更しますか？', function () { connection.send('override_secret', { subject: subject, voterId: voterId, correct: correct }); });
  } else if (action === 'share_doc') {
    showConfirm('ログを公開すると取り下げできません。公開しますか？', function () { connection.send('share_doc', { doc: button.dataset.doc }); });
  } else if (action === 'manual') startManual();
  else if (action === 'manual-pick') {
    if (!app.manual) app.manual = { characterId: '', phaseIndex: 0 };
    app.manual.characterId = button.dataset.character || '';
    app.manual.phaseIndex = 0;
    saveManual(app.manual);
    render();
  } else if (action === 'manual-phase') {
    if (!app.manual) return;
    var phases = arrayOrEmpty(app.scenario && app.scenario.phases);
    var requested = finiteNumber(button.dataset.index, 0);
    app.manual.phaseIndex = Math.max(0, Math.min(Math.max(0, phases.length - 1), Math.floor(requested)));
    saveManual(app.manual);
    render();
  } else if (action === 'manual-next' || action === 'manual-back') {
    if (!app.manual) return;
    var delta = action === 'manual-next' ? 1 : -1;
    var phaseCount = arrayOrEmpty(app.scenario && app.scenario.phases).length;
    app.manual.phaseIndex = Math.max(0, Math.min(Math.max(0, phaseCount - 1), manualPhaseIndex(app.scenario, app.manual) + delta));
    saveManual(app.manual);
    render();
  } else if (action === 'manual-home') {
    var message = button.dataset.confirm || '本当に中止しますか？';
    showConfirm(message, function () { clearManual(); render(); });
  } else if (action === 'retry') connection.retryConnection();
  else if (action === 'reload') window.location.reload();
  else if (action === 'leave') {
    var leaveMessage = button.dataset.confirm || 'この端末のセッションを破棄しますか？';
    showConfirm(leaveMessage, function () { connection.close(); clearSession(); setBanner('', false); render(); });
  }
}

function handleSubmit(event) {
  if (event.target.id !== 'vote-form') return;
  event.preventDefault();
  var phase = phaseOf();
  var me = (app.state && app.state.me) || {};
  var players = arrayOrEmpty(app.state && app.state.players);
  var ballots = phase ? arrayOrEmpty(phase.ballots && phase.ballots.length ? phase.ballots : app.state && app.state.ballots).filter(function (ballot) { return ballot && typeof ballot === 'object' && ballot.id; }) : [];
  var valid = true;
  var pending = [];
  ballots.forEach(function (ballot) {
    if (!ballot || typeof ballot !== 'object' || !ballot.id || hasVoted(ballot.id)) return;
    var choice;
    if (ballot.mode === 'guess') {
      choice = {};
      subjectsFor(ballot, me.characterId, app.scenario, players).forEach(function (subject) {
        var inputs = Array.prototype.slice.call(event.target.querySelectorAll('input[type="text"][data-ballot][data-subject]'));
        var input = inputs.find(function (el) {
          return el.dataset.ballot === ballot.id && el.dataset.subject === subject;
        });
        var value = input ? input.value.trim() : '';
        choice[subject] = value;
      });
    } else {
      var selectedSingle = Array.prototype.slice.call(event.target.querySelectorAll('input[data-ballot]:checked')).find(function (input) {
        return input.dataset.ballot === ballot.id && !input.dataset.subject;
      });
      if (!selectedSingle) valid = false;
      else choice = selectedSingle.value;
    }
    // Validate every ballot before sending any of them.  Otherwise a
    // missing answer in the second ballot could still commit the first.
    if (choice !== undefined && valid) pending.push({ ballotId: ballot.id, choice: choice });
  });
  if (!valid) showInlineError('必須の設問に回答してから確定してください。');
  else if (!pending.length) showInlineError('この投票はすでに確定済みです。');
  else { showConfirm('本当に確定しますか？（あとで「投票をやり直す」から変更できます）', function () { pending.forEach(function (vote) { connection.send('vote', vote); }); }); }
}

function boot() {
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  fetch('scenario/mdms.json').then(function (response) {
    if (!response.ok) throw new Error('scenario');
    return response.json();
  }).then(function (scenario) {
    app.scenario = scenario;
    render();
    app.session = loadSession();
    app.manual = app.session ? null : loadManual();
    if (app.session) { render(); connection.connect(); }
    else render();
  }).catch(function () {
    app.uiError = 'シナリオ定義を読み込めません。ページを再読み込みしてください。';
    app.scenario = { title: 'GMレス進行ツール', characters: [] };
    app.session = loadSession();
    app.manual = app.session ? null : loadManual();
    render();
    if (app.session) connection.connect();
  });
}

window.MdmsApp = {
  state: app,
  render: render,
  connect: connection.connect,
  send: connection.send,
  formatTime: formatTime,
  errorMessage: errorMessage,
  clearSession: clearSession
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
