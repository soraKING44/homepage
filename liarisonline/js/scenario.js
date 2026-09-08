function arrayOrEmpty(value) { return Array.isArray(value) ? value : []; }

export function handoutDocs(phases, docsDefinition, characterId, fromIndex, toIndex) {
  var list = Array.isArray(phases) ? phases : [];
  var seen = {};
  var docs = [];
  var start = Math.max(0, fromIndex);
  for (var i = start; i <= toIndex && i < list.length; i++) {
    var handouts = arrayOrEmpty(list[i] && list[i].handouts);
    handouts.forEach(function (handout) {
      if (!handout || typeof handout !== 'object' || !handout.doc) return;
      var recipients = Array.isArray(handout.to) ? handout.to : [handout.to];
      if (recipients.indexOf('all') < 0 && recipients.indexOf(characterId) < 0) return;
      if (seen[handout.doc]) return;
      var definition = docsDefinition && docsDefinition[handout.doc];
      if (!definition) return;
      seen[handout.doc] = true;
      docs.push({ id: handout.doc, title: definition.title, url: definition.url });
    });
  }
  return docs;
}

export function characterName(id, scenario) {
  var characters = arrayOrEmpty(scenario && scenario.characters);
  var found = characters.find(function (character) { return character && character.id === id; });
  return found ? (found.name || found.id) : id;
}

export function subjectsFor(ballot, meCharacterId, scenario, players) {
  var characterIds = arrayOrEmpty(scenario && scenario.characters)
    .map(function (character) { return character && character.id; })
    .filter(Boolean);
  if (Array.isArray(ballot.subjects)) {
    return ballot.subjects.filter(function (id) { return typeof id === 'string' && id && id !== meCharacterId; });
  }
  if (ballot.subjects && typeof ballot.subjects === 'object') return Object.keys(ballot.subjects);
  if (ballot.subjects === 'others') {
    return characterIds.filter(function (id) { return id && id !== meCharacterId; });
  }
  if (Array.isArray(players)) {
    return players
      .map(function (player) { return player && player.characterId; })
      .filter(function (id) { return typeof id === 'string' && id !== meCharacterId; });
  }
  return characterIds.filter(function (id) { return typeof id === 'string' && id && id !== meCharacterId; });
}

export function normalizeOptions(options, scenario) {
  if (options === 'characters') {
    options = arrayOrEmpty(scenario && scenario.characters).map(function (character) { return character.id; });
  }
  if (!Array.isArray(options)) return [];
  return options.map(function (option) {
    if (typeof option === 'string') return { id: option, label: characterName(option, scenario) };
    if (!option || typeof option !== 'object' || option.id === undefined || option.id === null) return null;
    return { id: String(option.id), label: option.label === undefined || option.label === null ? String(option.id) : String(option.label) };
  }).filter(Boolean);
}

export function nextButtonState(players, phase, now) {
  var list = arrayOrEmpty(players).filter(function (player) { return player && typeof player === 'object'; });
  var readyCount = list.filter(function (player) { return player.ready; }).length;
  var total = list.length;
  var allReady = total > 0 && readyCount === total;
  var endsAt = Number(phase && phase.endsAt);
  var timeExpired = Number.isFinite(endsAt) && (endsAt - now) <= 0;
  var enabled = allReady || timeExpired;
  var label = enabled ? '次のフェーズへ' : '次のフェーズへ（' + readyCount + ' / ' + total + '人が準備完了）';
  return { enabled: enabled, readyCount: readyCount, total: total, label: label };
}

export function voteTimeUpMessage(ballots, isVoted, endsAt, now) {
  var list = arrayOrEmpty(ballots).filter(function (ballot) { return ballot && typeof ballot === 'object' && ballot.id; });
  var remaining = Number.isFinite(endsAt) ? endsAt - now : 0;
  if (!Number.isFinite(endsAt) || remaining > 0) return '';
  var allVoted = list.length > 0 && list.every(function (ballot) { return isVoted(ballot.id); });
  return allVoted ? 'あなたの投票は完了しています。他のプレイヤーの投票をお待ちください。' : '時間です。投票してください。';
}
