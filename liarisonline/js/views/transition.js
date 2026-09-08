import { h } from '../html.js';
import { finiteNumber } from '../util.js';
import { KIND_LABELS, conversationNote, errorMarkup } from './shared.js';

export function transitionView(phase, uiError) {
  var index = finiteNumber(phase.index, 0);
  var total = Math.max(1, finiteNumber(phase.total, 1));
  var ctaLabel = phase.kind === 'vote' ? '投票を始める' : phase.kind === 'result' ? '結果を見る' : phase.kind === 'discuss' ? '議論を始める' : '読み始める';
  var kindLabel = KIND_LABELS[phase.kind] || phase.kind || '';
  var noteHtml = phase.note ? h`<p class="lead">${phase.note}</p>` : '';
  return h`<section class="card narrow phase-transition"><p class="eyebrow">PHASE ${index + 1} / ${total} · ${kindLabel}</p><h2>${phase.title || ''}</h2>${noteHtml}${conversationNote(phase.kind)}${errorMarkup(uiError)}<div class="actions end"><button class="btn" type="button" data-action="ack-phase" data-index="${index}">${ctaLabel}</button></div></section>`;
}
