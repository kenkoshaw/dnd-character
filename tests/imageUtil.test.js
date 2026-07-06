import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitDimensions, MAX_SOURCE_BYTES } from '../js/imageUtil.js';

test('fitDimensions caps the longest side, preserves aspect', () => {
  assert.deepEqual(fitDimensions(4000, 2000, 2000), { w: 2000, h: 1000 });
  assert.deepEqual(fitDimensions(1000, 3000, 1500), { w: 500, h: 1500 });
});

test('fitDimensions never upscales', () => {
  assert.deepEqual(fitDimensions(800, 600, 2000), { w: 800, h: 600 });
});

test('source size limit is 8 MB', () => {
  assert.equal(MAX_SOURCE_BYTES, 8 * 1024 * 1024);
});
