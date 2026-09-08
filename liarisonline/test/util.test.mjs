import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { arrayOrEmpty, finiteNumber, formatTime } from '../js/util.js';

test('arrayOrEmpty returns array when given array', () => {
  assert.deepStrictEqual(arrayOrEmpty([1, 2]), [1, 2]);
});

test('arrayOrEmpty returns empty array when given null', () => {
  assert.deepStrictEqual(arrayOrEmpty(null), []);
});

test('arrayOrEmpty returns empty array when given undefined', () => {
  assert.deepStrictEqual(arrayOrEmpty(undefined), []);
});

test('arrayOrEmpty returns empty array when given non-array', () => {
  assert.deepStrictEqual(arrayOrEmpty('x'), []);
});

test('finiteNumber returns number when given string number', () => {
  assert.strictEqual(finiteNumber('5', 0), 5);
});

test('finiteNumber returns fallback when given undefined', () => {
  assert.strictEqual(finiteNumber(undefined, 10), 10);
});

test('finiteNumber returns fallback when given non-numeric string', () => {
  assert.strictEqual(finiteNumber('abc', 3), 3);
});

test('finiteNumber returns fallback when given null', () => {
  assert.strictEqual(finiteNumber(null, 7), 7);
});

test('formatTime returns 01:05 for 65000 milliseconds', () => {
  assert.strictEqual(formatTime(65000), '01:05');
});

test('formatTime returns 00:05 for 5000 milliseconds', () => {
  assert.strictEqual(formatTime(5000), '00:05');
});

test('formatTime returns 00:00 for 0 milliseconds', () => {
  assert.strictEqual(formatTime(0), '00:00');
});

test('formatTime returns 00:00 for negative milliseconds', () => {
  assert.strictEqual(formatTime(-1000), '00:00');
});

test('formatTime returns 10:00 for 600000 milliseconds', () => {
  assert.strictEqual(formatTime(600000), '10:00');
});
