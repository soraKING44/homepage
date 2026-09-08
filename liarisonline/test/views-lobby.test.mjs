import test from 'node:test';
import assert from 'node:assert';
import { lobbyView } from '../js/views/lobby.js';

const scenario = {
  characters: [
    { id: 'alice', name: 'アリス', realName: 'Alice', catch: 'The main character' },
    { id: 'bob', name: 'ボブ', realName: 'Bob', catch: 'A secret keeper' },
    { id: 'charlie', name: 'チャーリー', catch: 'The suspicious one' },
  ],
  playerCount: 3,
};

test('Character taken badge and class shown when another player selects it', (t) => {
  const state = {
    me: { id: 'player1', characterId: 'alice' },
    players: [
      { id: 'player1', name: 'Player1', characterId: 'alice', connected: true },
      { id: 'player2', name: 'Player2', characterId: 'bob', connected: true },
    ],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenario, state, session, undefined, undefined));

  assert(html.includes('data-character="bob"'), 'Bob character button exists');
  assert(html.includes('class="character selected'), 'Selected character has selected class');
  assert(html.includes('class="character-taken-badge">選択済み</span>'), 'Taken badge is displayed for Bob');
  const bobButtonMatch = html.match(/<button[^>]*data-character="bob"[^>]*>/);
  assert(bobButtonMatch && bobButtonMatch[0].includes('character-taken'), 'Bob character button has character-taken class');
  assert(bobButtonMatch && bobButtonMatch[0].includes('data-action="preview-character"'), 'Bob character button can be previewed');
});

test('Preview character displays with confirmation button when not picked yet', (t) => {
  const state = {
    me: { id: 'player1' },
    players: [
      { id: 'player1', name: 'Player1', connected: true },
    ],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenario, state, session, 'charlie', undefined));

  assert(html.includes('チャーリー'), 'Preview character name is displayed');
  assert(html.includes('The suspicious one'), 'Character catch is displayed');
  assert(html.includes('このキャラクターに決定する'), 'Confirm button is displayed');
  assert(!html.includes('このキャラクターに決定済み'), 'Already picked message is not shown');
});

test('Disabled confirm button when character is already picked', (t) => {
  const state = {
    me: { id: 'player1', characterId: 'alice' },
    players: [
      { id: 'player1', name: 'Player1', characterId: 'alice', connected: true },
    ],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenario, state, session, 'alice', undefined));

  assert(html.includes('このキャラクターに決定済み'), 'Already picked message is shown');
  assert(html.includes('data-action="pick" data-character="alice" disabled'), 'Confirm button is disabled');
});

test('XSS protection: player name with script tag is escaped', (t) => {
  const state = {
    me: { id: 'player1' },
    players: [
      { id: 'player2', name: '<script>alert("xss")</script>', characterId: 'bob', connected: true },
    ],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenario, state, session, undefined, undefined));

  assert(!html.includes('<script>'), 'Script tag is not present in output');
  assert(html.includes('&lt;script&gt;'), 'Script tag is escaped');
});

test('XSS protection: character catch with script tag is escaped', (t) => {
  const scenarioWithXSS = {
    characters: [
      { id: 'hacker', name: 'Hacker', catch: '<img src=x onerror="alert(1)">' },
    ],
    playerCount: 1,
  };
  const state = {
    me: { id: 'player1' },
    players: [{ id: 'player1', connected: true }],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenarioWithXSS, state, session, 'hacker', undefined));

  assert(html.includes('&lt;img src=x onerror='), 'Dangerous tag is escaped');
  assert(!html.match(/<img[^>]*onerror/), 'No unescaped event handler present');
});

test('Use session.code when state.code is not available', (t) => {
  const state = {
    me: { id: 'player1' },
    players: [{ id: 'player1', connected: true }],
  };
  const session = { code: 'SESSION123' };

  const html = String(lobbyView(scenario, state, session, undefined, undefined));

  assert(html.includes('SESSION123'), 'Session code is displayed when state.code is missing');
  assert(!html.includes('undefined'), 'Undefined is not displayed');
});

test('Release button shown for disconnected other players but not for self', (t) => {
  const state = {
    me: { id: 'player1', characterId: 'alice' },
    players: [
      { id: 'player1', name: 'Me', characterId: 'alice', connected: false },
      { id: 'player2', name: 'Other', characterId: 'bob', connected: false },
    ],
    code: 'ABC123',
  };
  const session = { code: 'XYZ789' };

  const html = String(lobbyView(scenario, state, session, undefined, undefined));

  assert(html.includes('data-action="release" data-player="player2"'), 'Release button for other disconnected player');
  assert(!html.includes('data-action="release" data-player="player1"'), 'No release button for self');
});
