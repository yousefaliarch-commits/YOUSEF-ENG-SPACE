// A refresh that lands while a post is being published (or just after) must not make it vanish; text with numbers keeps its numbers.
import { describe, expect, it } from "vitest";
import { mergeLocalPosts } from "../src/lib/posts";
import { bidi } from "../src/ui/bidi";

const P = (id: string, at: number, extra: any = {}) => ({ id, at, body: id, ...extra });

describe("mergeLocalPosts", () => {
  it("keeps a post still being published when the server's list does not have it yet", () => {
    const out = mergeLocalPosts([P("a", 10), P("b", 5)], [P("u1", 20, { mine: true })]);
    expect(out.map((p) => p.id)).toEqual(["u1", "a", "b"]);
  });
  it("the server's copy wins once it has the post", () => {
    const out = mergeLocalPosts([P("s1", 20, { body: "from server" })], [P("s1", 20, { body: "local", keptAt: 1 })]);
    expect(out).toHaveLength(1); expect(out[0].body).toBe("from server");
  });
  it("local posts go first, newest first; an empty local list returns the server's list untouched", () => {
    const server = [P("a", 10)]; expect(mergeLocalPosts(server, [])).toBe(server);
    expect(mergeLocalPosts(server, [P("x", 12), P("y", 30)]).map((p) => p.id)).toEqual(["y", "x", "a"]);
  });
});

describe("bidi(): numbers are isolated, words are not touched", () => {
  const flat = (n: any): string => (typeof n === "string" ? n : Array.isArray(n) ? n.map(flat).join("") : n && n.props ? flat(n.props.children) : "");
  const numbers = (n: any): string[] => (Array.isArray(n) ? n.flatMap(numbers) : n && n.type === "bdi" ? [flat(n.props.children)] : []);
  it("Western digits with separators and a percent sign", () => { const r = bidi("راتب 17,000 جنيه وزيادة 15% وخبرة 3-5 سنوات"); expect(numbers(r)).toEqual(["17,000", "15%", "3-5"]); expect(flat(r)).toBe("راتب 17,000 جنيه وزيادة 15% وخبرة 3-5 سنوات"); });
  it("Eastern Arabic digits too, and mixed", () => { const r = bidi("٣٠٠٠ مشروع و 12.5 مليون و٢٠٢٦/١٠"); expect(numbers(r)).toEqual(["٣٠٠٠", "12.5", "٢٠٢٦/١٠"]); });
  it("every number is an LTR isolate", () => { const r = bidi("عندي 5 سنين"); const b = r.find((x: any) => x && x.type === "bdi"); expect(b.props.dir).toBe("ltr"); });
  it("text without numbers, and non-strings, come back as they are", () => { expect(bidi("بدون أرقام")).toBe("بدون أرقام"); expect(bidi(null)).toBeNull(); const el = {}; expect(bidi(el)).toBe(el); });
  it("a number at the very start or end", () => { expect(flat(bidi("17 جنيه"))).toBe("17 جنيه"); expect(flat(bidi("جنيه 17"))).toBe("جنيه 17"); });
});
