import { h } from '../html.js';
import { arrayOrEmpty } from '../util.js';
import { errorMarkup } from './shared.js';
import { characterName } from '../scenario.js';

export function lobbyView(scenario, state, session, lobbyPreview, uiError) {
  var me = state && state.me && typeof state.me === 'object' ? state.me : {};
  var players = arrayOrEmpty(state && state.players).filter(function (player) { return player && typeof player === 'object'; });
  var picked = me.characterId;
  var previewId = lobbyPreview || picked;
  var taken = {};
  players.forEach(function (player) { if (player.characterId) taken[player.characterId] = player.id; });
  var chars = arrayOrEmpty(scenario && scenario.characters).filter(function (character) { return character && typeof character === 'object' && character.id; });

  var characterItems = chars.map(function (character) {
    var owner = taken[character.id];
    var disabled = owner && owner !== me.id;
    var selectedClass = previewId === character.id ? ' selected' : '';
    var takenClass = disabled ? ' character-taken' : '';
    var badge = disabled ? h`<span class="character-taken-badge">選択済み</span>` : '';
    return h`<button type="button" class="character${selectedClass}${takenClass}" data-action="preview-character" data-character="${character.id}"><img class="character-face" src="img/characters/face/${character.id}.png" alt="" aria-hidden="true"><strong>${character.name || character.id}${badge}</strong></button>`;
  });

  var previewCharacter = chars.find(function (character) { return character.id === previewId; });

  var confirmButtonHtml = '';
  if (previewCharacter) {
    var previewedId = previewCharacter.id;
    var owner2 = taken[previewedId];
    var isTakenByOther = owner2 && owner2 !== me.id;
    var isAlreadyPicked = picked === previewedId;
    if (isTakenByOther) confirmButtonHtml = '';
    else if (isAlreadyPicked) confirmButtonHtml = h`<button type="button" class="btn" data-action="pick" data-character="${previewedId}" disabled>このキャラクターに決定済み</button>`;
    else confirmButtonHtml = h`<button type="button" class="btn" data-action="pick" data-character="${previewedId}">このキャラクターに決定する</button>`;
  }

  var characterDetailHtml = previewCharacter
    ? h`<div class="character-detail"><img class="character-detail-image" src="img/characters/full/${previewCharacter.id}.png" alt="${previewCharacter.name || previewCharacter.id}"><div class="character-detail-body"><h4>${previewCharacter.name || previewCharacter.id}${previewCharacter.realName ? h`<span class="character-detail-realname">（${previewCharacter.realName}）</span>` : ''}</h4><p>${previewCharacter.catch || ''}</p>${confirmButtonHtml}</div></div>`
    : h`<div class="character-detail character-detail-empty"><p class="muted">キャラクターを選ぶと、ここに全身イラストと説明が表示されます。</p></div>`;

  var playersHtml = players.map(function (player) {
    var own = player.id === me.id;
    var release = !own && !player.connected ? h`<button type="button" class="btn link" data-action="release" data-player="${player.id}">席を解放</button>` : '';
    var statusClass = player.connected ? 'online' : '';
    return h`<li class="player"><div class="player-main"><span class="player-name">${player.name || '参加者'}${own ? '（あなた）' : ''}</span><span class="player-meta">${player.characterId ? characterName(player.characterId, scenario) : 'キャラクター未選択'}</span></div><span class="status ${statusClass}">${player.connected ? '接続中' : '離脱中'}</span>${release}</li>`;
  });

  var playerCount = (scenario && scenario.playerCount) || players.length;
  var roomCode = (state && state.code) || (session && session.code) || '';

  return h`<section class="card"><div class="top-actions"><div><p class="eyebrow">LOBBY</p><h2>参加者を待っています</h2></div><div class="code" aria-label="部屋コード">部屋コード：${roomCode}</div></div><p class="lead">部屋コードを一緒に遊ぶ人へ共有してください。全員がキャラクターを選ぶとゲームが始まります。</p><h3>キャラクターを選ぶ</h3><div class="character-picker"><div class="character-grid">${characterItems}</div>${characterDetailHtml}</div><div class="section"><h3>参加者 <span class="muted">(${players.length}/${playerCount})</span></h3><ul class="player-list">${playersHtml}</ul></div>${errorMarkup(uiError)}<div class="actions end"><button class="btn secondary" data-action="leave">部屋を退出</button></div></section>`;
}
