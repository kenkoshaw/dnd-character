// Escape user-sourced strings before interpolating into innerHTML templates.
// Convention: every ${...} of stored user data (names, labels) goes through esc().
export const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
