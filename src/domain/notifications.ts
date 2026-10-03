// Notification categories and preferences — the client side of private.notif_category / private.notif_pref
// (supabase/migrations/…_push_notifications.sql; a test pins both lists to the SQL).
export const NOTIF_CATEGORIES = [["jobs", "الوظائف"], ["community", "المجتمع"], ["support", "الدعم"], ["system", "النظام"]] as const;
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number][0];

const JOBS = ["match", "job", "contact"], COMMUNITY = ["reply", "mention", "reaction", "message", "saved", "ama", "company"], SUPPORT = ["support", "team"];
export const notifCategory = (kind?: string): NotifCategory => (JOBS.includes(kind as string) ? "jobs" : COMMUNITY.includes(kind as string) ? "community" : SUPPORT.includes(kind as string) ? "support" : "system");

// the preference that governs a kind (null = always delivered: account, moderation and verification notices)
export const notifPref = (kind?: string): "jobs" | "replies" | "messages" | "salary" | "support" | null =>
  kind === "match" ? "jobs" : kind === "reply" || kind === "mention" || kind === "reaction" ? "replies" : kind === "message" ? "messages" : kind === "salary" || kind === "inflation" ? "salary" : kind === "support" || kind === "team" ? "support" : null;

// what a tapped notification (or push) may open: a stack screen by id, or one of the member's tabs. Anything else is ignored.
export const OPEN_TYPES = ["job", "post", "chat", "ticket", "company", "room"];
export function openTarget(t: any): { stack?: { type: string; id: string }; tab?: "market" | "inbox" | "home" } | null {
  if (!t || typeof t.type !== "string") return null;
  if (t.type === "market") return { tab: "market" };
  if (t.type === "notifications") return { tab: "inbox" };
  const id = t.id == null ? "" : String(t.id);
  return OPEN_TYPES.includes(t.type) && /^[A-Za-z0-9][\w.-]{0,79}$/.test(id) ? { stack: { type: t.type, id } } : null;
}

export const DEFAULT_PREFS = { notify: true, jobs: true, replies: true, messages: true, salary: true, support: true };
