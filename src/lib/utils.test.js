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

test('formatSize should not round up to the next unit boundary', () => {
  const oneMB_minus_one_byte = 1024 * 1024 - 1;
  // This test will fail with the current implementation, which returns '1024 KB'.
  assert.strictEqual(formatSize(oneMB_minus_one_byte), '1023.9 KB');
});

test('formatSize should handle sizes larger than GB correctly', () => {
  const oneTB = 1024 * 1024 * 1024 * 1024;
  // This test will fail with the current implementation, which returns '1 undefined'.
  assert.strictEqual(formatSize(oneTB), '1024 GB');
});
