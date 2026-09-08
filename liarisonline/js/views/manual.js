import { h } from '../html.js';
import { arrayOrEmpty, finiteNumber } from '../util.js';
import { KIND_LABELS, conversationNote, docsMarkup, errorMarkup } from './shared.js';
import { handoutDocs, characterName, subjectsFor, normalizeOptions } from '../scenario.js';

export function manualSetupView(scenario, manualPreview, uiError) {
  var chars = arrayOrEmpty(scenario && scenario.characters).filter(function (character) {
    return character && typeof character === 'object' && character.id;
  });
  var previewId = manualPreview || '';
  var characterItems = chars.map(function (character) {
    var selectedClass = previewId === character.id ? ' selected' : '';
    return h`<button type="button" class="character${selectedClass}" data-action="preview-manual-character" data-character="${character.id}"><img class="character-face" src="img/characters/face/${character.id}.png" alt="" aria-hidden="true"><strong>${character.name || character.id}</strong></button>`;
  });
  var grid = characterItems.length ? characterItems : h`<p class="muted">キャラクター定義がありません。</p>`;

  var previewCharacter = chars.find(function (character) { return character.id === previewId; });

  var confirmButtonHtml = '';
  if (previewCharacter) {
    confirmButtonHtml = h`<button type="button" class="btn" data-action="manual-pick" data-character="${previewCharacter.id}">このキャラクターで開始する</button>`;
  }

  var characterDetailHtml = previewCharacter
    ? h`<div class="character-detail"><img class="character-detail-image" src="img/characters/full/${previewCharacter.id}.png" alt="${previewCharacter.name || previewCharacter.id}"><div class="character-detail-body"><h4>${previewCharacter.name || previewCharacter.id}${previewCharacter.realName ? h`<span class="character-detail-realname">（${previewCharacter.realName}）</span>` : ''}</h4><p>${previewCharacter.catch || ''}</p>${confirmButtonHtml}</div></div>`
    : h`<div class="character-detail character-detail-empty"><p class="muted">キャラクターを選ぶと、ここに全身イラストと説明が表示されます。</p></div>`;

  return h`<section class="card"><p class="eyebrow">MANUAL MODE</p><h2>手動進行モード</h2><p class="lead">Workerを使わず、資料を開きながらこの端末だけで進行します。担当キャラクターを選ぶと、自分に配られる資料だけが表示されます。</p><h3>担当キャラクターを選ぶ</h3><div class="character-picker"><div class="character-grid manual-character-grid">${grid}</div>${characterDetailHtml}</div>${errorMarkup(uiError)}<div class="actions end"><button class="btn secondary" type="button" data-action="manual-home">中止する</button></div></section>`;
}

export function manualPhaseIndex(scenario, manual) {
  var phases = arrayOrEmpty(scenario && scenario.phases);
  var index = finiteNumber(manual && manual.phaseIndex, 0);
  if (!Number.isInteger(index)) index = Math.floor(index);
  return Math.max(0, Math.min(Math.max(0, phases.length - 1), index));
}

function manualCharacter(scenario, characterId) {
  var characters = arrayOrEmpty(scenario && scenario.characters);
  return characters.find(function (character) { return character && character.id === characterId; }) || null;
}

export function manualView(scenario, manual, uiError) {
  var phases = arrayOrEmpty(scenario && scenario.phases);
  if (!phases.length) {
    return h`${errorMarkup(uiError)}<section class="card narrow"><h2>手動進行モード</h2><p class="muted">シナリオにフェーズがありません。</p><div class="actions"><button class="btn secondary" data-action="manual-home">中止する</button></div></section>`;
  }
  var index = manualPhaseIndex(scenario, manual);
  var phase = phases[index] || {};
  var character = manualCharacter(scenario, manual.characterId);
  var currentDocs = handoutDocs(phases, scenario && scenario.docs, manual.characterId, index, index);
  var allDocs = handoutDocs(phases, scenario && scenario.docs, manual.characterId, 0, index);
  var currentDocIds = {};
  currentDocs.forEach(function (doc) { currentDocIds[doc.id] = true; });
  var pastDocs = allDocs.filter(function (doc) { return !currentDocIds[doc.id]; });

  var phaseButtons = phases.map(function (item, itemIndex) {
    var active = itemIndex === index;
    return h`<li><span class="manual-phase${active ? ' active' : ''}"${active ? ' aria-current="step"' : ''}><span>${itemIndex + 1}</span><strong>${item.title || 'フェーズ' + (itemIndex + 1)}</strong></span></li>`;
  });

  var timerHtml = phase.minutes ? h`<div class="manual-timer">制限時間: ${phase.minutes}分</div>` : '';

  var voteContent = '';
  if (phase.kind === 'vote' && phase.ballots) {
    var ballots = arrayOrEmpty(phase.ballots);
    var voteItems = ballots.map(function (ballot) {
      if (!ballot || typeof ballot !== 'object') return '';
      var intro = ballot.mode === 'guess'
        ? h`<p class="muted">各自、他の人に見せずに、自分以外の4人それぞれの秘密を自由記述で書いておいてください。制限時間になったら、全員同時に公開してください。</p>`
        : h`<p class="muted">各自、他の人に見せずに『犯人だと思うキャラクター』を決めて紙かチャットに書いておいてください。制限時間になったら、host（進行役）の合図で全員同時に公開してください。</p>`;
      var body = '';
      if (ballot.mode === 'guess') {
        body = subjectsFor(ballot, manual.characterId, scenario, null).map(function (subject) {
          return h`<fieldset class="guess-subject"><legend>${characterName(subject, scenario)} の秘密</legend><p class="muted">自由記述で回答してください。</p></fieldset>`;
        });
      } else {
        var options = normalizeOptions(ballot.options || arrayOrEmpty(scenario && scenario.characters).map(function (character2) { return character2.id; }), scenario);
        body = h`<div class="choice-list">${options.map(function (option) { return h`<span class="choice-display"><span>${option.label || option.id}</span></span>`; })}</div>`;
      }
      return h`<fieldset class="vote-block"><legend><strong>${ballot.title || ballot.id}</strong></legend>${intro}${body}</fieldset>`;
    });
    voteContent = h`<section class="section"><h3>投票対象と選択肢</h3>${voteItems}</section>`;
  }

  var resultContent = '';
  var allDocsSection = '';
  if (phase.kind === 'result') {
    if (phase.branches) {
      var branches = arrayOrEmpty(phase.branches);
      var branchItems = branches.map(function (branch) {
        if (!branch || typeof branch !== 'object') return '';
        var condition;
        if (branch.default) {
          condition = 'それ以外の場合';
        } else if (branch.when && typeof branch.when === 'object') {
          var whenClause = branch.when;
          condition = (whenClause.ballot && whenClause.topIs) ? (characterName(whenClause.topIs, scenario) + ' が最多得票の場合') : '条件に一致した場合';
        } else {
          return '';
        }
        var docDef = scenario && scenario.docs && scenario.docs[branch.doc];
        var docTitle = docDef ? docDef.title : branch.doc;
        return h`<div class="manual-branch"><strong>${condition}</strong><span class="manual-branch-result">→ ${docTitle}</span></div>`;
      }).filter(function (item) { return String(item) !== ''; });
      resultContent = branchItems.length ? h`<section class="section"><h3>エンディング分岐条件</h3>${branchItems}</section>` : '';
    }
    var allScenarioDocs = arrayOrEmpty(scenario && scenario.docs && Object.values(scenario.docs)).map(function (doc) { return { id: doc.id, title: doc.title, url: doc.url }; });
    allDocsSection = allScenarioDocs.length ? h`<section class="section"><h3>全ての資料（感想戦用）</h3>${docsMarkup(allScenarioDocs, scenario && scenario.docs)}</section>` : '';
  }

  var endIndex = phases.length - 1;
  var toolbar = index === endIndex ? '' : h`<button class="btn secondary" type="button" data-action="manual-home">中止する</button>`;
  var endingButton = index === endIndex ? h`<div class="actions end"><button class="btn" type="button" data-action="manual-home" data-confirm="終了しますか？">終了する</button></div>` : '';
  var manualReadyMessage = phase.kind === 'read'
    ? (phase.minutes > 0 ? '全員が資料を読み終わるか、制限時間（' + phase.minutes + '分）を過ぎたら、「次のフェーズへ」を押してください。' : '全員が資料を読み終えたら、「次のフェーズへ」を押してください。')
    : phase.kind === 'discuss'
      ? (phase.minutes > 0 ? '議論が終わるか、制限時間（' + phase.minutes + '分）を過ぎたら、「次のフェーズへ」を押してください。' : '議論が終わったら、「次のフェーズへ」を押してください。')
      : phase.kind === 'vote'
        ? (phase.minutes > 0 ? '全員の投票が終わるか、制限時間（' + phase.minutes + '分）を過ぎたら、「次のフェーズへ」を押してください。' : '全員の投票が終わったら、「次のフェーズへ」を押してください。')
        : '';
  var manualReadyHtml = manualReadyMessage ? h`<p class="muted manual-ready-note">${manualReadyMessage}</p>` : '';
  var actions = h`<div class="actions end"><button class="btn secondary" type="button" data-action="manual-phase" data-index="0">最初へ</button>${index > 0 ? h`<button class="btn secondary" type="button" data-action="manual-back">前のフェーズへ</button>` : ''}${index < endIndex ? h`<button class="btn" type="button" data-action="manual-next">次のフェーズへ</button>` : ''}</div>`;

  var kindLabel = KIND_LABELS[phase.kind] || phase.kind || '';
  var noteHtml = (phase.manualNote || phase.note) ? h`<p class="note">${phase.manualNote || phase.note}</p>` : '';
  var voteGuide = phase.kind === 'vote' ? h`<div class="alert info manual-guide"><strong>投票フェーズ</strong><br>投票は各自が制限時間内に他人に見せず回答を用意し、制限時間になったらhostの合図で全員同時に公開してください。同じ場にいない場合はチャットなどを使い、時間になったら一斉に送信・公開してください。</div>` : '';
  var pastDocsSection = pastDocs.length ? h`<section class="section"><h3>これまでの配布資料</h3>${docsMarkup(pastDocs, scenario && scenario.docs)}</section>` : '';

  return h`<section class="card manual-card"><div class="manual-toolbar"><div><p class="eyebrow">MANUAL MODE</p><h2>手動進行</h2><p class="muted">担当：<strong>${character ? (character.name || character.id) : manual.characterId}</strong></p></div>${toolbar}</div><nav class="manual-nav" aria-label="シナリオのフェーズ"><ol>${phaseButtons}</ol></nav><div class="phase-head"><div><p class="phase-kind">PHASE ${index + 1} / ${phases.length} · ${kindLabel}</p><h3>${phase.title || ''}</h3></div>${timerHtml}</div><div class="progress-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${phases.length}" aria-valuenow="${index + 1}" aria-label="進行状況"><span style="width:${((index + 1) / phases.length) * 100}%"></span></div>${noteHtml}${conversationNote(phase.kind)}${voteGuide}${voteContent}${resultContent}<section class="section"><h3>このフェーズの資料</h3>${docsMarkup(currentDocs, scenario && scenario.docs)}</section>${pastDocsSection}${allDocsSection}${errorMarkup(uiError)}${manualReadyHtml}${actions}${endingButton}</section>`;
}
