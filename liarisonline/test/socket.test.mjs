import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSocket } from '../js/socket.js';

// Setup minimal fake WebSocket class
globalThis.WebSocket = class {
  static CONNECTING = 0;
  static OPEN = 1;

  constructor(url) {
    this.url = url;
    this.readyState = this.constructor.CONNECTING;
    this.listeners = {};
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    const index = this.listeners[event].indexOf(handler);
    if (index >= 0) this.listeners[event].splice(index, 1);
  }

  send(data) {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }

  // Helper to trigger close event for testing
  _triggerClose(code, reason) {
    if (this.listeners.close) {
      this.listeners.close.forEach(handler => {
        handler({ code: code, reason: reason });
      });
    }
  }
};

test('socket: correct handlers called for code 4004', function (t) {
  return new Promise((resolve) => {
    let socketInstance;
    const originalWebSocket = globalThis.WebSocket;

    // Override WebSocket constructor to capture instance
    globalThis.WebSocket = class extends originalWebSocket {
      constructor(url) {
        super(url);
        socketInstance = this;
      }
    };

    let onRoomGoneCalled = false;
    let onAuthFailedCalled = false;
    let onReconnectScheduledCalled = false;

    const connection = createSocket({
      getSession: () => ({ code: 'TEST01', token: 'token' }),
      buildUrl: (session) => 'ws://test/api/rooms/TEST01/ws?token=token',
      onRoomGone: () => { onRoomGoneCalled = true; },
      onAuthFailed: () => { onAuthFailedCalled = true; },
      onReconnectScheduled: () => { onReconnectScheduledCalled = true; }
    });

    connection.connect();

    // Simulate close with code 4004
    if (socketInstance) {
      socketInstance._triggerClose(4004, 'room_not_found');

      assert.equal(onRoomGoneCalled, true, 'onRoomGone should be called');
      assert.equal(onAuthFailedCalled, false, 'onAuthFailed should not be called');
      assert.equal(onReconnectScheduledCalled, false, 'onReconnectScheduled should not be called');
    }

    globalThis.WebSocket = originalWebSocket;
    resolve();
  });
});

test('socket: onAuthFailed called for code 1008', function (t) {
  return new Promise((resolve) => {
    let socketInstance;
    const originalWebSocket = globalThis.WebSocket;

    globalThis.WebSocket = class extends originalWebSocket {
      constructor(url) {
        super(url);
        socketInstance = this;
      }
    };

    let onRoomGoneCalled = false;
    let onAuthFailedCalled = false;
    let onReconnectScheduledCalled = false;

    const connection = createSocket({
      getSession: () => ({ code: 'TEST01', token: 'token' }),
      buildUrl: (session) => 'ws://test/api/rooms/TEST01/ws?token=token',
      onRoomGone: () => { onRoomGoneCalled = true; },
      onAuthFailed: () => { onAuthFailedCalled = true; },
      onReconnectScheduled: () => { onReconnectScheduledCalled = true; }
    });

    connection.connect();

    if (socketInstance) {
      socketInstance._triggerClose(1008, '');

      assert.equal(onRoomGoneCalled, false, 'onRoomGone should not be called');
      assert.equal(onAuthFailedCalled, true, 'onAuthFailed should be called');
      assert.equal(onReconnectScheduledCalled, false, 'onReconnectScheduled should not be called');
    }

    globalThis.WebSocket = originalWebSocket;
    resolve();
  });
});

test('socket: onAuthFailed called for code 4001', function (t) {
  return new Promise((resolve) => {
    let socketInstance;
    const originalWebSocket = globalThis.WebSocket;

    globalThis.WebSocket = class extends originalWebSocket {
      constructor(url) {
        super(url);
        socketInstance = this;
      }
    };

    let onRoomGoneCalled = false;
    let onAuthFailedCalled = false;
    let onReconnectScheduledCalled = false;

    const connection = createSocket({
      getSession: () => ({ code: 'TEST01', token: 'token' }),
      buildUrl: (session) => 'ws://test/api/rooms/TEST01/ws?token=token',
      onRoomGone: () => { onRoomGoneCalled = true; },
      onAuthFailed: () => { onAuthFailedCalled = true; },
      onReconnectScheduled: () => { onReconnectScheduledCalled = true; }
    });

    connection.connect();

    if (socketInstance) {
      socketInstance._triggerClose(4001, '');

      assert.equal(onRoomGoneCalled, false, 'onRoomGone should not be called');
      assert.equal(onAuthFailedCalled, true, 'onAuthFailed should be called');
      assert.equal(onReconnectScheduledCalled, false, 'onReconnectScheduled should not be called');
    }

    globalThis.WebSocket = originalWebSocket;
    resolve();
  });
});

test('socket: onReconnectScheduled called for unknown code', function (t) {
  return new Promise((resolve) => {
    let socketInstance;
    const originalWebSocket = globalThis.WebSocket;

    globalThis.WebSocket = class extends originalWebSocket {
      constructor(url) {
        super(url);
        socketInstance = this;
      }
    };

    let onRoomGoneCalled = false;
    let onAuthFailedCalled = false;
    let onReconnectScheduledCalled = false;

    const connection = createSocket({
      getSession: () => ({ code: 'TEST01', token: 'token' }),
      buildUrl: (session) => 'ws://test/api/rooms/TEST01/ws?token=token',
      onRoomGone: () => { onRoomGoneCalled = true; },
      onAuthFailed: () => { onAuthFailedCalled = true; },
      onReconnectScheduled: () => { onReconnectScheduledCalled = true; }
    });

    connection.connect();

    if (socketInstance) {
      socketInstance._triggerClose(1006, '');

      assert.equal(onRoomGoneCalled, false, 'onRoomGone should not be called');
      assert.equal(onAuthFailedCalled, false, 'onAuthFailed should not be called');
      assert.equal(onReconnectScheduledCalled, true, 'onReconnectScheduled should be called');
    }

    globalThis.WebSocket = originalWebSocket;
    resolve();
  });
});
