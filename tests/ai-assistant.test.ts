// «المهندس الذكي» — the assistant tab's pure parts: the Markdown subset answers render with (streaming-safe, no HTML), the turns
// that travel with a question, and the tools an answer names becoming chips (only those the member's role may open).
import { describe, expect, it } from "vitest";
import { inline, parseMd } from "../src/ui/markdown";
import { toolsNamed, turnsFor } from "../src/features/ai/AssistantScreen";

describe("answers as rich text", () => {
  it("headings, lists, tables, code, warnings and paragraphs", () => {
    const md = [
      "## الغطاء الخرساني",
      "أقل غطاء حسب **ECP 203**:",
      "",
      "| العنصر | الغطاء |",
      "|---|---|",
      "| القواعد | 50 مم |",
      "| الأعمدة | 25 مم |",
      "",
      "- راجع الجدول",
      "- استخدم `بسكوت` بالسمك الصحيح",
      "1. اربط الحديد",
      "2. ركّب البسكوت",
      "⚠️ لا تصب قبل استلام الاستشاري",
      "```",
      "As = M / (0.87·fy·z)",
      "```",
    ].join("\n");
    const b = parseMd(md);
    expect(b.map((x) => x.t)).toEqual(["h", "p", "table", "ul", "ol", "warn", "code"]);
    expect(b[2]).toMatchObject({ head: ["العنصر", "الغطاء"], rows: [["القواعد", "50 مم"], ["الأعمدة", "25 مم"]] });
    expect((b[4] as any).items).toEqual(["اربط الحديد", "ركّب البسكوت"]);
    expect((b[6] as any).text).toBe("As = M / (0.87·fy·z)");
  });
  it("an unfinished stream still renders (open code fence, table without rows)", () => {
    expect(parseMd("```\nfcu = 30")).toEqual([{ t: "code", text: "fcu = 30" }]);
    expect(parseMd("| a | b |\n|---|---|")[0]).toMatchObject({ t: "table", head: ["a", "b"], rows: [] });
  });
  it("HTML the model writes stays text — nothing is injected", () => {
    const parts = inline("<img src=x onerror=alert(1)> **bold**");
    expect(parts[0]).toBe("<img src=x onerror=alert(1)> ");
    expect(parseMd("<script>alert(1)</script>")).toEqual([{ t: "p", text: "<script>alert(1)</script>" }]);
  });
});

describe("what travels with a question", () => {
  const m = (role: "user" | "model", text: string, error?: any) => ({ id: Math.random().toString(), role, text, at: 0, error });
  it("the latest turns, starting with a question, failed answers left out", () => {
    const list = [m("model", "orphan"), m("user", "q1"), m("model", "a1"), m("user", "q2"), m("model", "", { code: "busy" }), m("user", "q3")];
    expect(turnsFor(list)).toEqual([{ role: "user", text: "q1" }, { role: "model", text: "a1" }, { role: "user", text: "q2" }, { role: "user", text: "q3" }]);
  });
  it("never more than 12 turns or ~18k characters", () => {
    const long = Array.from({ length: 30 }, (_, i) => m(i % 2 ? "model" : "user", "x".repeat(3000)));
    const t = turnsFor([...long, m("user", "last")]);
    expect(t.length).toBeLessThanOrEqual(12);
    expect(t.reduce((a, x) => a + x.text.length, 0)).toBeLessThanOrEqual(18_000 + 3000);
    expect(t[0].role).toBe("user");
    expect(t[t.length - 1].text).toBe("last");
  });
});

describe("tools named in an answer", () => {
  const ans = "تقدر تحسبها من أداة حصر وصب الخرسانة، ولو عندك عرض شغل استخدم تقييم عرض عمل.";
  it("an engineer gets both chips", () => {
    expect(toolsNamed(ans, "engineer").map((t) => t.id)).toEqual(["concrete", "offer"]);
  });
  it("a site supervisor never gets a money tool", () => {
    expect(toolsNamed(ans, "supervisor").map((t) => t.id)).toEqual(["concrete"]);
  });
  it("HR gets none of the field tools", () => {
    expect(toolsNamed(ans, "hr")).toEqual([]);
  });
});
