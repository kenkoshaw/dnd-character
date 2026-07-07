// Per-tab identity + pure kick logic (node-testable, no Firebase).
// Roles are freely selectable — no claims or locks. sessionId only namespaces
// per-tab streams (in-flight drag rulers).
export const sessionId = crypto.randomUUID();

// Why a player must be sent back to the role popup.
export function kickReason(char) {
  if (!char) return 'deleted';
  if (char.hidden) return 'hidden';
  return null;
}
