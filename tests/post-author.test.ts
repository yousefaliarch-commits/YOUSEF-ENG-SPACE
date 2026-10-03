// Author controls on a post: the server's edit count reaches the app, the «معدّل» badge says how many times, and the SQL keeps the rules.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { postOf } from "../src/backend/map";
import { EditedBadge, editedWord } from "../src/ui/feed";

const sql = readFileSync(new URL("../supabase/migrations/20261013000021_post_author_controls.sql", import.meta.url), "utf8");
const row = (extra: any = {}) => ({ id: "p1", room: "general", type: "question", body: "نص", data: {}, author: { as: "anon", anon: "ab12cd", gender: "male" }, created_at: new Date().toISOString(), reactions: { agree: 0, disagree: 0, useful: 0 }, tally: {}, ...extra });
const flat = (n: any): string => (typeof n === "string" ? n : typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(flat).join("") : n && n.props ? flat(n.props.children) : "");

describe("the edit count reaches the app", () => {
  it("a post that was never edited has edits 0 and no edit time", () => { const p = postOf(row()); expect(p.edits).toBe(0); expect(p.editedAt).toBeNull(); });
  it("an edited post carries the server's count and time", () => { const t = "2026-10-03T10:00:00Z"; const p = postOf(row({ edit_count: 2, edited_at: t })); expect(p.edits).toBe(2); expect(p.editedAt).toBe(Date.parse(t)); });
});

describe("the edited badge", () => {
  it("shows nothing for an unedited post", () => { expect(EditedBadge({ n: 0 })).toBeNull(); expect(EditedBadge({ n: undefined })).toBeNull(); });
  it("says once / twice / N times", () => {
    expect(flat(EditedBadge({ n: 1 }))).toBe("معدّل · مرة"); expect(flat(EditedBadge({ n: 2 }))).toBe("معدّل · مرتان");
    expect(flat(EditedBadge({ n: 3 }))).toBe("معدّل · 3 مرات"); expect(flat(EditedBadge({ n: 7 }))).toBe("معدّل · 7 مرات");
  });
  it("carries the number for tests and assistive tech", () => { expect(EditedBadge({ n: 4 }).props["data-edited"]).toBe(4); expect(editedWord(1)).toBe("مرة"); expect(editedWord(5)).toBeNull(); });
});

describe("the SQL keeps the rules (pinned; the behaviour is in 16_post_author_controls.test.sql)", () => {
  it("the counter is server-side only: a column the client never gets an update grant on", () => { expect(sql).toMatch(/add column edit_count int not null default 0/); expect(sql).not.toMatch(/grant update/i); });
  it("edit and delete are author-only security-definer functions with a fixed search_path, granted to members only", () => {
    for (const fn of ["edit_my_post(uuid, text)", "delete_my_post(uuid)", "my_posts()"]) {
      expect(sql).toContain(`revoke execute on function public.${fn} from public, anon;`); expect(sql).toContain(`grant execute on function public.${fn} to authenticated;`);
    }
    expect(sql.match(/security definer set search_path = ''/g)!.length).toBeGreaterThanOrEqual(4);
    expect(sql.match(/public\.is_mine\('posts'/g)!.length).toBe(2);
  });
  it("only a real change counts, hidden posts and suspended accounts cannot edit", () => { expect(sql).toMatch(/if nb <> cur\.body then/); expect(sql).toMatch(/if cur\.hidden then raise/); expect(sql).toMatch(/suspended_forever or p\.suspended_until > now\(\)/); });
  it("delete removes replies' and the post's reactions and authorship, and returns the image to remove", () => { expect(sql).toMatch(/delete from public\.reactions/); expect(sql).toMatch(/delete from private\.authorship/); expect(sql).toMatch(/jsonb_build_object\('image', img\)/); });
  it("the feed hears an edit by id only", () => { expect(sql).toMatch(/private\.broadcast\('feed', 'edit', jsonb_build_object\('id', new\.id\)\)/); });
});
