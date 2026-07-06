import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideClaim, kickReason } from '../js/session.js';

test('decideClaim: free slot or own slot claims; taken slot aborts', () => {
  assert.equal(decideClaim(null, 'me'), 'me');
  assert.equal(decideClaim(undefined, 'me'), 'me');
  assert.equal(decideClaim('me', 'me'), 'me');
  assert.equal(decideClaim('someone-else', 'me'), undefined); // undefined aborts the txn
});

test('kickReason detects delete / hide / lost claim', () => {
  assert.equal(kickReason(null, 's1'), 'deleted');
  assert.equal(kickReason({ hidden: true, claimedBy: 's1' }, 's1'), 'hidden');
  assert.equal(kickReason({ claimedBy: 's2' }, 's1'), 'lost-claim');
  assert.equal(kickReason({ claimedBy: 's1' }, 's1'), null);
});
