import { h, raw, esc, safeDocUrl } from '../html.js';
import { arrayOrEmpty } from '../util.js';

export var KIND_LABELS = { read: '読む', discuss: '話し合う', vote: '投票', result: '結果' };

export function docsMarkup(docs, scenarioDocs) {
  var list = arrayOrEmpty(docs);
  var empty = raw('<p class="muted">このフェーズで配布される資料はありません。</p>');
  if (!list.length) return empty;
  var items = list.map(function (doc) {
    if (!doc || typeof doc !== 'object') return raw('');
    var definition = scenarioDocs && scenarioDocs[doc.id || doc.doc];
    var url = safeDocUrl(doc.url || (definition && definition.url) || '');
    var title = doc.title || (definition && definition.title) || doc.id || doc.doc || '資料';
    if (!url) return h`<li><span class="doc-unavailable">📄 ${title}（資料を開けません）</span></li>`;
    return h`<li><a href="${url}" target="_blank" rel="noopener noreferrer">📄 ${title}<span class="sr-only">（新しいタブで開く）</span></a></li>`;
  }).filter(function (item) { return String(item) !== ''; });
  if (!items.length) return empty;
  return h`<ul class="docs">${items}</ul>`;
}

export function conversationNote(kind) {
  if (kind === 'discuss') return raw('<p class="alert info">この時間は自由に話し合ってください。</p>');
  if (kind === 'result') return raw('<p class="alert info">台本を声に出して読み合わせてください。自分の担当キャラクターのセリフは自分で読み、ナレーションの部分は誰か一人が代わりに読んでください。読み終えたらマーダーミステリーは終わりです。自由に感想戦をお楽しみください。</p>');
  return raw('<p class="alert">この時間はプレイヤー同士の相談はできません。会話が許されるのは議論フェーズのみです。</p>');
}

export function errorMarkup(uiError) {
  if (!uiError) return raw('');
  return h`<div class="alert error" role="alert"><span>${uiError}</span> <button type="button" class="btn link" data-action="reload">再試行</button></div>`;
}
