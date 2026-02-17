import { test } from 'node:test';
import assert from 'node:assert';
import { formatSize } from './utils.js';

test('formatSize should format 0 bytes correctly', () => {
  assert.strictEqual(formatSize(0), '0 B');
});

test('formatSize should format bytes (B) correctly', () => {
  assert.strictEqual(formatSize(500), '500 B');
  assert.strictEqual(formatSize(1023), '1023 B');
});

test('formatSize should format kilobytes (KB) correctly', () => {
  assert.strictEqual(formatSize(1024), '1 KB');
  assert.strictEqual(formatSize(1234), '1.2 KB');
  assert.strictEqual(formatSize(1280), '1.3 KB');
  assert.strictEqual(formatSize(1024 * 1023), '1023 KB');
});

test('formatSize should format megabytes (MB) correctly', () => {
  assert.strictEqual(formatSize(1024 * 1024), '1 MB');
  assert.strictEqual(formatSize(1024 * 1024 * 1.5), '1.5 MB');
});

test('formatSize should format gigabytes (GB) correctly', () => {
  assert.strictEqual(formatSize(1024 * 1024 * 1024), '1 GB');
  assert.strictEqual(formatSize(1024 * 1024 * 1024 * 2.7), '2.7 GB');
});
