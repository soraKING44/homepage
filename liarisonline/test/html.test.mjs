import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { esc, h, raw, safeDocUrl } from '../js/html.js';

test('esc() escapes HTML special characters', () => {
  const result = esc('<b>&"\'');
  assert.equal(result, '&lt;b&gt;&amp;&quot;&#39;');
});

test('h template tag escapes script tags', () => {
  const result = h`<p>${'<script>'}</p>`;
  assert.equal(String(result), '<p>&lt;script&gt;</p>');
});

test('h template tag does not escape raw() wrapped values', () => {
  const result = h`<div>${raw('<b>ok</b>')}</div>`;
  assert.equal(String(result), '<div><b>ok</b></div>');
});

test('h template tag escapes arrays and handles raw() within arrays', () => {
  const result = h`<span>${['<', raw('<b>'), '>']}</span>`;
  assert.equal(String(result), '<span>&lt;<b>&gt;</span>');
});

test('safeDocUrl rejects javascript: protocol', () => {
  const result = safeDocUrl('javascript:alert(1)', 'https://example.com/');
  assert.equal(result, '');
});

test('safeDocUrl resolves relative paths', () => {
  const result = safeDocUrl('/foo.pdf', 'https://example.com/base/');
  assert.equal(result, 'https://example.com/foo.pdf');
});

test('safeDocUrl allows https URLs from other origins', () => {
  const result = safeDocUrl('https://other.example.com/x.pdf', 'https://example.com/');
  assert.equal(result, 'https://other.example.com/x.pdf');
});
