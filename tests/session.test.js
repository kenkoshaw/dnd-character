import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kickReason } from '../js/session.js';

test('kickReason detects delete / hide; healthy character stays', () => {
  assert.equal(kickReason(null), 'deleted');
  assert.equal(kickReason(undefined), 'deleted');
  assert.equal(kickReason({ hidden: true, name: 'Seth' }), 'hidden');
  assert.equal(kickReason({ name: 'Seth', speed: 30 }), null);
});
