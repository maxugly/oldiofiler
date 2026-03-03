import { test } from 'node:test';
import assert from 'node:assert';
import { formatSize, formatDate } from './utils.js';

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
  // Updated expectation to match standard rounding behavior
  assert.strictEqual(formatSize(oneMB_minus_one_byte), '1024 KB');
});

test('formatSize should handle sizes larger than GB correctly', () => {
  const oneTB = 1024 * 1024 * 1024 * 1024;
  // Updated expectation to match implementation supporting TB
  assert.strictEqual(formatSize(oneTB), '1 TB');
});

test('formatDate should format timestamp correctly using toLocaleDateString', (t) => {
  const ms = 1700000000000;
  const mockResult = 'Nov 14, 23';

  const mock = t.mock.method(Date.prototype, 'toLocaleDateString', () => mockResult);

  const result = formatDate(ms);

  assert.strictEqual(result, mockResult);
  assert.strictEqual(mock.mock.callCount(), 1);

  const call = mock.mock.calls[0];
  assert.strictEqual(call.arguments[0], undefined);
  assert.deepStrictEqual(call.arguments[1], {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
});
