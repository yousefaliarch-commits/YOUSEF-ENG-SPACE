// «المهندس الذكي» — the proxy's pure pieces (no Deno, no network), tested by tests/ai-proxy.test.ts:
// feature limits, request validation, the server-side PII guard, the Gemini request body, the SSE parser and error mapping.
import { FORM_KINDS, PROMPTS } from "./ai-prompts.ts";
import { CV_REVIEW_SCHEMA, FORM_SCHEMAS } from "./ai-schemas.ts";

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};

export type Feature = "assistant" | "cv-review" | "form-fill" | "salary-insights" | "tool-tip";
export type Msg = { role: "user" | "model"; text: string };
export type AiRequest = { feature: Feature; messages: Msg[]; context: Record<string, any> };

// per feature: how much may go in, how much may come out, JSON or prose, how hard the model thinks
export const LIMITS: Record<Feature, { turns: number; chars: number; maxOut: number; json: boolean; thinking: "minimal" | "low" | "medium"; temperature: number; light?: boolean }> = {
  assistant: { turns: 20, chars: 24_000, maxOut: 2_048, json: false, thinking: "low", temperature: 0.4 },
  "cv-review": { turns: 1, chars: 40_000, maxOut: 16_384, json: true, thinking: "low", temperature: 0.2 },
  "form-fill": { turns: 1, chars: 4_000, maxOut: 3_072, json: true, thinking: "low", temperature: 0.2 },
  "salary-insights": { turns: 6, chars: 6_000, maxOut: 1_200, json: false, thinking: "low", temperature: 0.3 },
  "tool-tip": { turns: 1, chars: 8_000, maxOut: 500, json: false, thinking: "minimal", temperature: 0.3, light: true },
};
export const MAX_BODY = 120_000; // bytes

export const isFeature = (f: unknown): f is Feature => typeof f === "string" && f in LIMITS;

// the shape check: anything unexpected is refused before a model or a quota unit is touched
export function validate(body: any): { ok: true; req: AiRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_request" };
  if (!isFeature(body.feature)) return { ok: false, error: "feature" };
  const lim = LIMITS[body.feature as Feature];
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = raw
    .filter((m: any) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string" && m.text.trim())
    .slice(-lim.turns)
    .map((m: any) => ({ role: m.role, text: String(m.text) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return { ok: false, error: "bad_request" };
  const chars = messages.reduce((a, m) => a + m.text.length, 0);
  if (chars > lim.chars) return { ok: false, error: "too_long" };
  const context = body.context && typeof body.context === "object" && !Array.isArray(body.context) ? body.context : {};
  if (JSON.stringify(context).length > 20_000) return { ok: false, error: "too_long" };
  if (body.feature === "form-fill" && !FORM_KINDS.includes(context.form)) return { ok: false, error: "bad_request" };
  return { ok: true, req: { feature: body.feature, messages, context } };
}

// defence in depth: the app already strips identifiers (src/services/ai-redact.ts); the proxy strips what still looks like one
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const NATIONAL_ID = /\b[23]\d{13}\b/g;
const PHONE = /(?:\+|00)?(?:20|966|971|965|974|973|968)?[\s-]?\(?0?1[0125]\)?[\s-]?\d{3,4}[\s-]?\d{4}\b|(?:\+|00)9\d{2}[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{4}\b/g;
export function scrub(text: string): string {
  return String(text || "").replace(EMAIL, "{{EMAIL}}").replace(NATIONAL_ID, "{{NATIONAL_ID}}").replace(PHONE, "{{PHONE}}");
}

// salary questions: only aggregate keys may travel; the company breakdown and anything individual are dropped
export function marketOnly(m: any) {
  if (!m || typeof m !== "object") return { n: 0 };
  const keep = ["n", "min", "p10", "p25", "p50", "p75", "p90", "access", "platform"];
  const pick = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => (keep.includes(k) || k === "key") && (typeof v === "number" || typeof v === "string")));
  return {
    ...pick(m),
    byTrack: Array.isArray(m.byTrack) ? m.byTrack.map(pick).filter((r: any) => (r.n || 0) >= 5) : [],
    byGov: Array.isArray(m.byGov) ? m.byGov.map(pick).filter((r: any) => (r.n || 0) >= 5) : [],
  };
}

// the request Gemini receives
export function geminiBody(req: AiRequest, extra?: { market?: unknown }) {
  const lim = LIMITS[req.feature];
  const last = req.messages.length - 1;
  const contents = req.messages.map((m, i) => {
    let text = req.feature === "cv-review" ? m.text : scrub(m.text);
    // the context rides on the last user turn as a fenced JSON block the prompt refers to
    if (i === last) {
      const ctx: Record<string, unknown> = { ...req.context };
      if (extra && extra.market) ctx.market = extra.market;
      if (Object.keys(ctx).length) text = `${text}\n\n\`\`\`json\n${JSON.stringify(ctx)}\n\`\`\``;
    }
    return { role: m.role, parts: [{ text }] };
  });
  const schema = req.feature === "cv-review" ? CV_REVIEW_SCHEMA : req.feature === "form-fill" ? FORM_SCHEMAS[String(req.context.form)] : null;
  return {
    systemInstruction: { parts: [{ text: PROMPTS[req.feature] }] },
    contents,
    generationConfig: {
      maxOutputTokens: lim.maxOut,
      temperature: lim.temperature,
      thinkingConfig: { thinkingLevel: lim.thinking },
      ...(lim.json && schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
    },
  };
}

// Gemini's SSE: «data: {json}» blocks → text deltas, the final usage and why it stopped
export type Chunk = { text: string; usage?: { in: number; out: number }; finish?: string; blocked?: boolean };
export function parseSse(buffer: string): { chunks: Chunk[]; rest: string } {
  const chunks: Chunk[] = [];
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() || "";
  for (const block of parts) {
    const data = block.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
    if (!data || data === "[DONE]") continue;
    try {
      const j = JSON.parse(data);
      const c = j.candidates && j.candidates[0];
      // thought parts are the model's private reasoning — never forwarded
      const text = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter((p: any) => !p.thought && typeof p.text === "string").map((p: any) => p.text).join("") : "";
      const u = j.usageMetadata;
      chunks.push({
        text,
        usage: u ? { in: u.promptTokenCount || 0, out: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) } : undefined,
        finish: c && c.finishReason,
        blocked: !!(j.promptFeedback && j.promptFeedback.blockReason) || (c && c.finishReason === "SAFETY"),
      });
    } catch {
      /* a partial or foreign line — skip it */
    }
  }
  return { chunks, rest };
}

// one message per failure, in both languages — the app shows the one that matches its interface
export const ERRORS: Record<string, { ar: string; en: string; status: number }> = {
  auth: { ar: "سجّل الدخول لاستخدام المهندس الذكي", en: "Sign in to use the Smart Engineer", status: 401 },
  feature: { ar: "طلب غير معروف", en: "Unknown request", status: 400 },
  bad_request: { ar: "طلب غير صالح", en: "Invalid request", status: 400 },
  too_long: { ar: "النص أطول من المسموح — اختصره ثم أعد المحاولة", en: "The text is too long — shorten it and try again", status: 413 },
  quota: { ar: "انتهى رصيدك اليومي من المهندس الذكي — يتجدد غدًا", en: "You've used today's Smart Engineer allowance — it renews tomorrow", status: 429 },
  disabled: { ar: "المهندس الذكي متوقف مؤقتًا للصيانة", en: "The Smart Engineer is paused for maintenance", status: 503 },
  not_ready: { ar: "المهندس الذكي غير مفعّل في هذه النسخة بعد", en: "The Smart Engineer isn't enabled in this build yet", status: 503 },
  busy: { ar: "الخدمة مشغولة حالياً، حاول بعد دقيقة", en: "The service is busy right now — try again in a minute", status: 503 },
  blocked: { ar: "لا أستطيع المساعدة في هذا الطلب", en: "I can't help with that request", status: 422 },
  server: { ar: "حدث خطأ غير متوقع — حاول مرة أخرى", en: "Something went wrong — try again", status: 500 },
};

export function upstreamError(status: number): keyof typeof ERRORS {
  if (status === 429 || status === 503 || status === 500 || status === 504) return "busy";
  if (status === 400) return "bad_request";
  if (status === 401 || status === 403) return "not_ready";
  return "server";
}
