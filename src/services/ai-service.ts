// =====================================================================
//  «المهندس الذكي» — the one client door to the AI (docs/AI.md)
//  · Every feature calls ask(): the member's session token goes to the ai-chat Edge Function, which holds the Gemini key,
//    takes a unit of the daily allowance and streams the answer back (SSE). Nothing here ever sees a key.
//  · One retry with back-off when the network fails before the first word; offline is detected up front; every failure is a
//    bilingual message, never an exception the screen has to catch.
//  · The remaining allowance is kept in a tiny store the quota chip reads.
//  · Dev / e2e: window.__engspaceAi.fake = (req) => string | { error } replaces the network (never in production builds).
// =====================================================================
import { SUPABASE_KEY, SUPABASE_URL, isCloud } from "../backend/config";
import { supabase } from "../backend/client";

export type AiFeature = "assistant" | "cv-review" | "form-fill" | "salary-insights" | "tool-tip";
export type AiMsg = { role: "user" | "model"; text: string };
export type AiAsk = { feature: AiFeature; messages: AiMsg[]; context?: Record<string, unknown>; signal?: AbortSignal; onDelta?: (text: string, all: string) => void };
export type AiError = { code: string; ar: string; en: string };
export type AiResult = { ok: true; text: string; remaining: number | null } | { ok: false; error: AiError; text: string };

const MSG: Record<string, AiError> = {
  offline: { code: "offline", ar: "لا يوجد اتصال بالإنترنت — المهندس الذكي يحتاج اتصالًا", en: "You're offline — the Smart Engineer needs a connection" },
  signin: { code: "auth", ar: "سجّل الدخول لاستخدام المهندس الذكي", en: "Sign in to use the Smart Engineer" },
  demo: { code: "not_ready", ar: "المهندس الذكي متاح في النسخة المتصلة بالخادم فقط", en: "The Smart Engineer is available in the connected app only" },
  busy: { code: "busy", ar: "الخدمة مشغولة حالياً، حاول بعد دقيقة", en: "The service is busy right now — try again in a minute" },
  timeout: { code: "timeout", ar: "استغرق الرد وقتًا أطول من المعتاد — حاول مرة أخرى", en: "The answer took too long — try again" },
  cancelled: { code: "cancelled", ar: "أُلغي الطلب", en: "Request cancelled" },
};

// ---------------------------------------------------------------- the allowance chip's store
type Quota = { remaining: number | null; limit: number | null };
let quota: Quota = { remaining: null, limit: null };
const subs = new Set<(q: Quota) => void>();
const setQuota = (q: Partial<Quota>) => {
  quota = { ...quota, ...q };
  subs.forEach((f) => f(quota));
};
export const quotaNow = () => quota;
export const onQuota = (f: (q: Quota) => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

const fake = () => (import.meta.env.DEV || import.meta.env.MODE === "test" ? (globalThis as any).__engspaceAi : null);

// is AI usable here at all (connected build, or the dev fake)
export const aiAvailable = () => isCloud() || !!(fake() && fake().fake);

export async function refreshQuota(): Promise<Quota> {
  const f = fake();
  if (f && f.fake) {
    setQuota({ remaining: f.remaining ?? 25, limit: 25 });
    return quota;
  }
  if (!isCloud()) return quota;
  try {
    const db = await supabase();
    const { data } = await db.rpc("ai_quota");
    if (data) setQuota({ remaining: Number((data as any).remaining), limit: Number((data as any).limit) });
  } catch {
    /* the chip just stays as it was */
  }
  return quota;
}

export async function rateAnswer(feature: AiFeature, rating: 1 | -1, reason?: string) {
  if (!isCloud()) return;
  try {
    const db = await supabase();
    await db.rpc("ai_rate", { p_feature: feature, p_rating: rating, p_reason: reason || null });
  } catch {
    /* a rating is never worth an error */
  }
}

// ---------------------------------------------------------------- SSE from the proxy
async function* events(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const p of parts) {
      const line = p.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(5).trim());
      } catch {
        /* skip */
      }
    }
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ask(q: AiAsk): Promise<AiResult> {
  // the dev / e2e fake: a scripted answer streamed word by word
  const f = fake();
  if (f && f.fake) {
    const out = await f.fake(q);
    if (out && typeof out === "object" && out.error) return { ok: false, error: { code: out.error, ar: out.ar || MSG.busy.ar, en: out.en || MSG.busy.en }, text: "" };
    const text = String(out || "");
    let all = "";
    for (const w of text.match(/\S+\s*|\s+/g) || []) {
      all += w;
      q.onDelta && q.onDelta(w, all);
      if (f.delay) await wait(f.delay);
    }
    setQuota({ remaining: Math.max(0, (quota.remaining ?? 25) - 1), limit: 25 });
    return { ok: true, text: all, remaining: quota.remaining };
  }
  if (!isCloud()) return { ok: false, error: MSG.demo, text: "" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, error: MSG.offline, text: "" };
  const db = await supabase();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return { ok: false, error: MSG.signin, text: "" };

  let all = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let r: Response;
    try {
      r = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        signal: q.signal,
        headers: { authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "content-type": "application/json" },
        body: JSON.stringify({ feature: q.feature, messages: q.messages, context: q.context || {} }),
      });
    } catch (e: any) {
      if (e && e.name === "AbortError") return { ok: false, error: MSG.cancelled, text: all };
      // the network failed before anything came back: one more try after a short back-off
      if (attempt === 0) {
        await wait(900);
        continue;
      }
      return { ok: false, error: navigator.onLine === false ? MSG.offline : MSG.busy, text: "" };
    }
    if (!r.ok || !r.body) {
      const j: any = await r.json().catch(() => ({}));
      if (j && j.error === "quota") setQuota({ remaining: 0 });
      if (r.status === 503 && j.error === "busy" && attempt === 0) {
        await wait(1500);
        continue;
      }
      return { ok: false, error: { code: j.error || "server", ar: j.ar || MSG.busy.ar, en: j.en || MSG.busy.en }, text: "" };
    }
    try {
      for await (const ev of events(r.body)) {
        if (ev.t === "d") {
          all += ev.x;
          q.onDelta && q.onDelta(ev.x, all);
        } else if (ev.t === "end") {
          setQuota({ remaining: Number(ev.remaining) });
          return { ok: true, text: all, remaining: Number(ev.remaining) };
        } else if (ev.t === "err") {
          return { ok: false, error: { code: ev.code, ar: ev.ar, en: ev.en }, text: all };
        }
      }
      // the stream closed without an end mark: keep what arrived
      return all ? { ok: true, text: all, remaining: quota.remaining } : { ok: false, error: MSG.busy, text: "" };
    } catch (e: any) {
      if (e && e.name === "AbortError") return { ok: false, error: MSG.cancelled, text: all };
      return all ? { ok: false, error: MSG.timeout, text: all } : { ok: false, error: MSG.busy, text: "" };
    }
  }
  return { ok: false, error: MSG.busy, text: "" };
}

// a structured answer (cv-review, form-fill): the JSON text parsed, or the error
export async function askJson<T = any>(q: AiAsk): Promise<{ ok: true; data: T } | { ok: false; error: AiError }> {
  const r = await ask(q);
  if (r.ok === false) return { ok: false, error: r.error };
  const text = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: { code: "parse", ar: "وصل رد غير مكتمل — حاول مرة أخرى", en: "The answer arrived incomplete — try again" } };
  }
}
