// Sharing a post, a job, a company or a room: the link it carries and the short preview next to it.
// The link opens the item in the app (web: the hash route; the phone app: app.engspace://open/<type>/<id>, handled by
// native.ts). Set VITE_PUBLIC_URL to the web address of the app and every share carries that tappable https link instead.
export const SHAREABLE = ["post", "job", "company", "room"] as const;
export type Shareable = (typeof SHAREABLE)[number];

const SAFE_ID = /^[A-Za-z0-9][\w.-]{0,79}$/;

// where a shared item lives. native = the phone app; page = the web address this page runs at (origin + path, no hash)
export function linkFor(type: Shareable, id: string, opts: { native?: boolean; publicUrl?: string; page?: string } = {}) {
  if (opts.publicUrl) return `${opts.publicUrl.replace(/\/+$/, "")}/#app/${type}/${encodeURIComponent(id)}`;
  if (opts.native || !opts.page) return `app.engspace://open/${type}/${encodeURIComponent(id)}`;
  return `${opts.page}#app/${type}/${encodeURIComponent(id)}`;
}

// an incoming link → the screen to open. Accepts the app link and the web hash form; anything else is ignored.
export function parseOpenLink(url?: string | null): { type: Shareable; id: string } | null {
  if (!url) return null;
  const m = /^app\.engspace:\/\/open\/([a-z]+)\/([^/?#]+)/.exec(url) || /#app\/([a-z]+)\/([^/?#]+)/.exec(url); if (!m) return null;
  let id = m[2]; try { id = decodeURIComponent(id); } catch (e) { return null; }
  return (SHAREABLE as readonly string[]).includes(m[1]) && SAFE_ID.test(id) ? { type: m[1] as Shareable, id } : null;
}

// the first words of a text, whole words, one line
export function snippet(text?: any, max = 140) {
  const t = String(text == null ? "" : text).replace(/\s+/g, " ").trim(); if (t.length <= max) return t;
  const cut = t.slice(0, max); const sp = cut.lastIndexOf(" "); return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.،؛:\-–—]+$/, "") + "…";
}
