// Migrated from the prototype part(s): app_2b_onboarding, app_3b_stack


// =====================================================================
//  Community cards
// =====================================================================
// Exactly three reactions — أوافق / لا أوافق / مفيد — on posts, comments and replies alike. Agree and disagree are mutually
// exclusive (one of the two at most); «مفيد» can stand alone or accompany either. The same rule object is used everywhere.
export const applyReaction = (mine, k) => { const m = { ...(mine || {}) }; if (k === "agree" || k === "disagree") { const on = !m[k]; m.agree = false; m.disagree = false; m[k] = on; } else m[k] = !m[k]; return m; };

export const countComments = (cs) => cs.reduce((a, c) => a + 1 + countComments(c.replies || []), 0);

export const flatten = (cs) => cs.flatMap((c) => [c, ...flatten(c.replies || [])]);
