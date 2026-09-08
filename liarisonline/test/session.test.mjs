import { test } from 'node:test';
import assert from 'node:assert';
import { saveSession, loadSession, removeSession, saveManual, loadManual, removeManual } from '../js/session.js';

test('loadSession returns null when localStorage is undefined', () => {
  assert.strictEqual(loadSession(), null);
});

test('loadManual returns null when localStorage is undefined', () => {
  assert.strictEqual(loadManual(), null);
});

test('saveSession does not throw when localStorage is undefined', () => {
  assert.doesNotThrow(() => {
    saveSession({ code: 'AB2345', playerId: 'player1', token: 'token1' });
  });
});

test('saveManual does not throw when localStorage is undefined', () => {
  assert.doesNotThrow(() => {
    saveManual({ characterId: 'char1', phaseIndex: 1 });
  });
});

test('removeSession does not throw when localStorage is undefined', () => {
  assert.doesNotThrow(() => {
    removeSession();
  });
});

test('removeManual does not throw when localStorage is undefined', () => {
  assert.doesNotThrow(() => {
    removeManual();
  });
});

test('saveSession and loadSession round-trip with valid session', () => {
  const mockStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const session = { code: 'ab2345', playerId: 'player1', token: 'token1' };
    saveSession(session);
    const loaded = loadSession();
    assert.deepStrictEqual(loaded, { code: 'AB2345', playerId: 'player1', token: 'token1' });
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadSession returns null for invalid JSON in storage', () => {
  const mockStorage = {
    _data: { 'mdms.session': 'invalid json {' },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadSession();
    assert.strictEqual(loaded, null);
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadSession returns null when code format is invalid', () => {
  const mockStorage = {
    _data: { 'mdms.session': JSON.stringify({ code: 'invalid', playerId: 'player1', token: 'token1' }) },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadSession();
    assert.strictEqual(loaded, null);
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadSession returns null when playerId is empty', () => {
  const mockStorage = {
    _data: { 'mdms.session': JSON.stringify({ code: 'AB2345', playerId: '', token: 'token1' }) },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadSession();
    assert.strictEqual(loaded, null);
  } finally {
    delete globalThis.localStorage;
  }
});

test('saveManual and loadManual round-trip with valid manual', () => {
  const mockStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const manual = { characterId: 'char1', phaseIndex: 2 };
    saveManual(manual);
    const loaded = loadManual();
    assert.deepStrictEqual(loaded, { characterId: 'char1', phaseIndex: 2 });
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadManual returns null for invalid JSON in storage', () => {
  const mockStorage = {
    _data: { 'mdms.manual': 'invalid json {' },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadManual();
    assert.strictEqual(loaded, null);
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadManual defaults phaseIndex to 0 when negative', () => {
  const mockStorage = {
    _data: { 'mdms.manual': JSON.stringify({ characterId: 'char1', phaseIndex: -1 }) },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadManual();
    assert.deepStrictEqual(loaded, { characterId: 'char1', phaseIndex: 0 });
  } finally {
    delete globalThis.localStorage;
  }
});

test('loadManual defaults phaseIndex to 0 when not an integer', () => {
  const mockStorage = {
    _data: { 'mdms.manual': JSON.stringify({ characterId: 'char1', phaseIndex: 'not a number' }) },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    const loaded = loadManual();
    assert.deepStrictEqual(loaded, { characterId: 'char1', phaseIndex: 0 });
  } finally {
    delete globalThis.localStorage;
  }
});

test('removeSession removes session from storage', () => {
  const mockStorage = {
    _data: { 'mdms.session': 'something' },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    removeSession();
    assert.strictEqual(mockStorage._data['mdms.session'], undefined);
  } finally {
    delete globalThis.localStorage;
  }
});

test('removeManual removes manual from storage', () => {
  const mockStorage = {
    _data: { 'mdms.manual': 'something' },
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
    removeItem(key) { delete this._data[key]; }
  };

  const originalLS = globalThis.localStorage;
  globalThis.localStorage = mockStorage;

  try {
    removeManual();
    assert.strictEqual(mockStorage._data['mdms.manual'], undefined);
  } finally {
    delete globalThis.localStorage;
  }
});
