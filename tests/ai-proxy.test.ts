// «المهندس الذكي» — the ai-chat proxy with a fake database and a fake Gemini: auth, validation, quota, refunds, the key never in
// the response, SSE pass-through without the model's thoughts, and the salary privacy filter.
import { describe, expect, it } from "vitest";
import { handle } from "../supabase/functions/_shared/ai-handler";
import { LIMITS, geminiBody, marketOnly, parseSse, scrub, validate } from "../supabase/functions/_shared/ai";
import { PROMPTS } from "../supabase/functions/_shared/ai-prompts";

const KEY = "test-key-never-echoed";
const sseOf = (...objs: any[]) => objs.map((o) => `data: ${JSON.stringify(o)}\r\n\r\n`).join("");
const part = (text: string, extra: any = {}) => ({ candidates: [{ content: { parts: [{ text }] }, ...extra }] });

function fakeDb(o: { user?: boolean; take?: any; salary?: any } = {}) {
  const calls: { fn: string; args: any; as?: string }[] = [];
  return {
    calls,
    db: {
      user: async (jwt: string) => (o.user === false || !jwt ? null : { id: "u-1" }),
      rpc: async (fn: string, args: any) => {
        calls.push({ fn, args });
        if (fn === "ai_take") return { data: o.take ?? { ok: true, remaining: 24, limit: 25, model: "gemini-3.8-flash", model_light: "gemini-3.8-flash" }, error: null };
        return { data: null, error: null };
      },
      rpcAs: async (jwt: string, fn: string, args: any) => {
        calls.push({ fn, args, as: jwt });
        return { data: o.salary ?? null, error: null };
      },
    } as any,
  };
}

function fakeGemini(body: string, status = 200) {
  const seen: { url: string; init: any }[] = [];
  const f = async (url: string, init: any) => {
    seen.push({ url, init });
    if (status !== 200) return new Response("{}", { status });
    return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(body)); c.close(); } }), { status: 200 });
  };
  return { seen, f };
}

const post = (body: any, jwt = "jwt-1") =>
  new Request("http://x/ai-chat", { method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify(body) });

const events = async (r: Response) => (await r.text()).split("\n\n").filter(Boolean).map((b) => JSON.parse(b.replace(/^data: /, "")));

describe("ai-chat proxy", () => {
  it("refuses signed-out callers before anything else", async () => {
    const { db, calls } = fakeDb({ user: false });
    const r = await handle(post({ feature: "assistant", messages: [{ role: "user", text: "hi" }] }), { db, key: KEY });
    expect(r.status).toBe(401);
    expect((await r.json()).ar).toMatch(/سجّل الدخول/);
    expect(calls).toEqual([]);
  });

  it("validates shape and size before taking a quota unit", async () => {
    const { db, calls } = fakeDb();
    expect((await handle(post({ feature: "nope", messages: [{ role: "user", text: "x" }] }), { db, key: KEY })).status).toBe(400);
    expect((await handle(post({ feature: "assistant", messages: [{ role: "model", text: "x" }] }), { db, key: KEY })).status).toBe(400);
    expect((await handle(post({ feature: "assistant", messages: [{ role: "user", text: "x".repeat(LIMITS.assistant.chars + 1) }] }), { db, key: KEY })).status).toBe(413);
    expect((await handle(post({ feature: "form-fill", messages: [{ role: "user", text: "x" }], context: { form: "bogus" } }), { db, key: KEY })).status).toBe(400);
    expect(calls.filter((c) => c.fn === "ai_take")).toEqual([]);
  });

  it("without a key it says «not ready» and takes nothing", async () => {
    const { db, calls } = fakeDb();
    const r = await handle(post({ feature: "assistant", messages: [{ role: "user", text: "hi" }] }), { db });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe("not_ready");
    expect(calls).toEqual([]);
  });

  it("a spent day answers 429 in both languages without calling the model", async () => {
    const { db } = fakeDb({ take: { ok: false, reason: "quota", remaining: 0 } });
    const g = fakeGemini("");
    const r = await handle(post({ feature: "assistant", messages: [{ role: "user", text: "hi" }] }), { db, key: KEY, fetch: g.f });
    expect(r.status).toBe(429);
    const j = await r.json();
    expect(j.ar).toMatch(/رصيدك اليومي/);
    expect(j.en).toMatch(/allowance/);
    expect(g.seen).toEqual([]);
  });

  it("streams the text, never the model's thoughts, ends with the remaining allowance and records tokens", async () => {
    const { db, calls } = fakeDb();
    const body = sseOf(
      { candidates: [{ content: { parts: [{ text: "secret reasoning", thought: true }] } }] },
      part("أقل غطاء "),
      { ...part("50 مم."), usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 8, thoughtsTokenCount: 4 }, candidates: [{ content: { parts: [{ text: "50 مم." }] }, finishReason: "STOP" }] },
    );
    const g = fakeGemini(body);
    const r = await handle(post({ feature: "assistant", messages: [{ role: "user", text: "الغطاء الخرساني؟" }] }), { db, key: KEY, fetch: g.f });
    expect(r.headers.get("content-type")).toMatch(/text\/event-stream/);
    const ev = await events(r);
    expect(ev.filter((e) => e.t === "d").map((e) => e.x).join("")).toBe("أقل غطاء 50 مم.");
    expect(JSON.stringify(ev)).not.toMatch(/secret reasoning|test-key/);
    expect(ev[ev.length - 1]).toEqual({ t: "end", remaining: 24, finish: "STOP" });
    // the key went to Google in a header, never in the URL
    expect(g.seen[0].url).not.toMatch(/key=/);
    expect(g.seen[0].init.headers["x-goog-api-key"]).toBe(KEY);
    expect(calls.find((c) => c.fn === "ai_tokens")!.args).toMatchObject({ p_in: 30, p_out: 12 });
    expect(calls.some((c) => c.fn === "ai_refund")).toBe(false);
  });

  it("gives the unit back when Gemini is busy, with the Arabic busy message", async () => {
    const { db, calls } = fakeDb();
    const r = await handle(post({ feature: "assistant", messages: [{ role: "user", text: "hi" }] }), { db, key: KEY, fetch: fakeGemini("", 503).f });
    expect(r.status).toBe(503);
    expect((await r.json()).ar).toBe("الخدمة مشغولة حالياً، حاول بعد دقيقة");
    expect(calls.some((c) => c.fn === "ai_refund")).toBe(true);
  });

  it("an empty or blocked stream ends with an error event and a refund", async () => {
    const { db, calls } = fakeDb();
    const g = fakeGemini(sseOf({ promptFeedback: { blockReason: "SAFETY" } }));
    const ev = await events(await handle(post({ feature: "assistant", messages: [{ role: "user", text: "hi" }] }), { db, key: KEY, fetch: g.f }));
    expect(ev[ev.length - 1]).toMatchObject({ t: "err", code: "blocked" });
    expect(calls.some((c) => c.fn === "ai_refund")).toBe(true);
  });

  it("salary questions: the member's own aggregate view travels, never the company rows or another member's numbers", async () => {
    const { db, calls } = fakeDb({ salary: { access: "full", n: 47, p25: 14000, p50: 18000, p75: 24000, byTrack: [{ key: "tech", n: 12, p50: 21000 }, { key: "x", n: 3, p50: 1 }], byCompany: [{ key: "Orascom", n: 9, p50: 30000 }] } });
    const g = fakeGemini(sseOf(part("ok")));
    await events(await handle(post({ feature: "salary-insights", messages: [{ role: "user", text: "مرتبي 17000 كويس؟ تليفوني 01012345678" }], context: { disc: "civil", track: "site", years: 5, mySalary: 17000, name: "Ahmed" } }), { db, key: KEY, fetch: g.f }));
    // called as the member (their JWT), so salary_access() and the 5-report floor apply
    expect(calls.find((c) => c.fn === "salary_explorer")!.as).toBe("jwt-1");
    const sent = JSON.parse(g.seen[0].init.body).contents.map((c: any) => c.parts[0].text).join("\n");
    expect(sent).toMatch(/"n":47/);
    expect(sent).not.toMatch(/Orascom|byCompany|Ahmed|01012345678/);
    expect(sent).toMatch(/\{\{PHONE\}\}/);
    expect(sent).not.toMatch(/"key":"x"/);
  });

  it("field staff (no money access) are refused salary insights", async () => {
    const { db } = fakeDb({ salary: { access: "none" } });
    const r = await handle(post({ feature: "salary-insights", messages: [{ role: "user", text: "x" }], context: { disc: "civil" } }), { db, key: KEY, fetch: fakeGemini("").f });
    expect(r.status).toBe(422);
  });
});

describe("ai pieces", () => {
  it("scrub removes e-mails, Egyptian / Gulf phones and national IDs", () => {
    const t = scrub("me ahmed.m@gmail.com +20 100 123 4567 / 01012345678 / 0096650 123 4567 id 29601011234567");
    expect(t).not.toMatch(/gmail|1234567|29601011234567/);
    expect(t).toMatch(/\{\{EMAIL\}\}.*\{\{PHONE\}\}.*\{\{NATIONAL_ID\}\}/);
  });
  it("marketOnly keeps aggregates of 5+ only", () => {
    const m = marketOnly({ n: 7, p50: 1, byGov: [{ key: "cairo", n: 6, p50: 2 }, { key: "giza", n: 4, p50: 3 }], byCompany: [{ key: "X", n: 50 }], rows: [{ salary: 9 }] });
    expect(m).toEqual({ n: 7, p50: 1, byTrack: [], byGov: [{ key: "cairo", n: 6, p50: 2 }] });
  });
  it("structured features get a response schema, prose features don't", () => {
    const cv = geminiBody({ feature: "cv-review", messages: [{ role: "user", text: "cv" }], context: { uiLang: "ar" } });
    expect(cv.generationConfig.responseMimeType).toBe("application/json");
    expect(JSON.stringify(cv.generationConfig.responseSchema)).toMatch(/rebuilt/);
    expect(JSON.stringify(cv.contents)).toMatch(/uiLang/);
    const chat = geminiBody({ feature: "assistant", messages: [{ role: "user", text: "q" }], context: {} });
    expect((chat.generationConfig as any).responseSchema).toBeUndefined();
    expect(chat.systemInstruction.parts[0].text).toBe(PROMPTS.assistant);
  });
  it("the CV prompt carries the rubric and the regional rules", () => {
    const p = PROMPTS["cv-review"];
    for (const s of ["software (22)", "scope (28)", "track (15)", "codes (15)", "ats (20)", "NEVER deduct", "موقف التجنيد", "NATIONAL_ID", "NEVER invent a number"]) expect(p).toContain(s);
  });
  it("parseSse keeps an unfinished block for the next read", () => {
    const { chunks, rest } = parseSse(`data: ${JSON.stringify(part("a"))}\n\ndata: {"candi`);
    expect(chunks.map((c) => c.text)).toEqual(["a"]);
    expect(rest).toBe('data: {"candi');
  });
  it("validate keeps the last N turns and needs a user turn last", () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: `m${i}` }));
    msgs.push({ role: "user", text: "last" });
    const v = validate({ feature: "assistant", messages: msgs });
    expect(v.ok && v.req.messages.length).toBe(LIMITS.assistant.turns);
  });
});
