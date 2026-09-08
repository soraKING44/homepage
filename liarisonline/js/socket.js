export function createSocket(options) {
  options = options || {};
  var getSession = options.getSession;
  var buildUrl = options.buildUrl;
  var onConnecting = options.onConnecting || function () {};
  var onOpen = options.onOpen || function () {};
  var onState = options.onState || function () {};
  var onServerError = options.onServerError || function () {};
  var onSocketError = options.onSocketError || function () {};
  var onAuthFailed = options.onAuthFailed || function () {};
  var onRoomGone = options.onRoomGone || function () {};
  var onReconnectScheduled = options.onReconnectScheduled || function () {};
  var onReconnectFailed = options.onReconnectFailed || function () {};
  var onSendFailed = options.onSendFailed || function () {};

  var MAX_RECONNECT = 5;
  var BACKOFF = [1000, 2000, 4000, 8000, 16000];
  var ws = null;
  var reconnectCount = 0;
  var reconnectTimer = null;

  function connect() {
    var session = getSession();
    if (!session) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    onConnecting();
    var socket;
    try { socket = new WebSocket(buildUrl(session)); } catch (_) { reconnect(); return; }
    ws = socket;
    socket.addEventListener('open', function () {
      reconnectCount = 0;
      onOpen();
    });
    socket.addEventListener('message', function (event) {
      var message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      if (!message || typeof message !== 'object') return;
      if (message.type === 'state') onState(message.state || message);
      else if (message.type === 'error') onServerError(message.status, message.code);
    });
    socket.addEventListener('error', function () { onSocketError(); });
    socket.addEventListener('close', function (event) {
      ws = null;
      if (event && event.code === 4004) {
        onRoomGone();
        return;
      }
      if (event && (event.code === 1008 || event.code === 4001)) {
        onAuthFailed();
        return;
      }
      reconnect();
    });
  }

  function reconnect() {
    var session = getSession();
    if (!session || reconnectTimer) return;
    if (reconnectCount >= MAX_RECONNECT) {
      onReconnectFailed();
      return;
    }
    var index = reconnectCount++;
    var delayMs = BACKOFF[index];
    onReconnectScheduled(delayMs);
    reconnectTimer = setTimeout(function () { reconnectTimer = null; connect(); }, delayMs);
  }

  function retryConnection() {
    reconnectCount = 0;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    connect();
  }

  function send(type, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      onSendFailed();
      return false;
    }
    try {
      ws.send(JSON.stringify(Object.assign({ type: type }, payload || {})));
      return true;
    } catch (_) {
      onSendFailed();
      return false;
    }
  }

  function close() {
    if (ws) { try { ws.close(); } catch (_) { /* ignore */ } }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  return { connect: connect, reconnect: reconnect, retryConnection: retryConnection, send: send, close: close };
}

export function wsUrlFor(apiBaseValue, session) {
  var base = apiBaseValue;
  if (!base) base = window.location.origin;
  base = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return base + '/api/rooms/' + encodeURIComponent(session.code) + '/ws?token=' + encodeURIComponent(session.token);
}
