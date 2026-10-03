

// =====================================================================
//  Community cards
// =====================================================================
// Exactly three reactions — أوافق / لا أوافق / مفيد — on posts, comments and replies alike. Agree and disagree are mutually
// exclusive (one of the two at most); «مفيد» can stand alone or accompany either. The same rule object is used everywhere.
export const applyReaction = (mine?: any, k?: any) => { const m: any = { ...(mine || {}) }; if (k === "agree" || k === "disagree") { const on = !m[k]; m.agree = false; m.disagree = false; m[k] = on; } else m[k] = !m[k]; return m; };

export const countComments = (cs?: any) => cs.reduce((a, c) => a + 1 + countComments(c.replies || []), 0);

export const flatten = (cs?: any) => cs.flatMap((c) => [c, ...flatten(c.replies || [])]);

// The server's feed with the posts that exist only here: ones still being published and ones the server confirmed a moment ago
// (a read can start before the insert is visible). Server copies win; local ones go first, newest first.
export function mergeLocalPosts(server: any[], local: any[]) {
  const have = new Set(server.map((p) => p.id)); const mine = local.filter((p) => !have.has(p.id));
  return mine.length ? [...mine.sort((a, b) => (b.at || b.keptAt || 0) - (a.at || a.keptAt || 0)), ...server] : server;
}
