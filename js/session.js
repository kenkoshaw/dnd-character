// Per-tab identity + pure claim/kick decision logic (node-testable, no Firebase).
export const sessionId = crypto.randomUUID();

// Transaction callback logic: returning undefined aborts the transaction.
export function decideClaim(current, me) {
  return current === null || current === undefined || current === me ? me : undefined;
}

// Why a claimed character's player must be sent back to the role popup.
export function kickReason(char, mySession) {
  if (!char) return 'deleted';
  if (char.hidden) return 'hidden';
  if (char.claimedBy !== mySession) return 'lost-claim';
  return null;
}
