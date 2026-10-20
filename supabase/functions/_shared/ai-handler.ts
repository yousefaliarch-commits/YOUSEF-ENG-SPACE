// ai-chat request handling, independent of Deno so Vitest drives it with a fake database and a fake Gemini (tests/ai-proxy.test.ts).
//   POST (member JWT) { feature, messages: [{ role, text }], context? }
//   → 200 text/event-stream:  data: {"t":"d","x":"…text…"}  …  data: {"t":"end","remaining":N,"finish":"STOP"}
//                             or, mid-stream, data: {"t":"err","code":"busy","ar":"…","en":"…"}
//   → 4xx / 5xx JSON { error, ar, en } when nothing was streamed (auth, validation, quota, upstream refusal)
// The Gemini key never leaves this function; the quota unit is taken before the model call and given back if the model fails
// before answering; token totals are recorded after it (counts only, never text).
import { CORS, ERRORS, LIMITS, MAX_BODY, geminiBody, marketOnly, parseSse, upstreamError, validate } from "./ai.ts";
import type { AiRequest } from "./ai.ts";
import type { RestClient } from "./rest.ts";

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type AiDeps = { db: RestClient; key?: string; base?: string; fetch?: Fetch; timeoutMs?: number };

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const fail = (code: keyof typeof ERRORS, extra: Record<string, unknown> = {}) => {
  const e = ERRORS[code];
  return new Response(JSON.stringify({ error: code, ar: e.ar, en: e.en, ...extra }), { status: e.status, headers: { ...CORS, "content-type": "application/json" } });
};
const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

export async function handle(req: Request, deps: AiDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("bad_request");
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return fail("too_long");

  // ---- who is asking (every AI feature needs a signed-in member)
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await deps.db.user(jwt);
  if (!user) return fail("auth");

  let body: unknown = null;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return fail("too_long");
    body = JSON.parse(raw);
  } catch {
    return fail("bad_request");
  }
  const v = validate(body);
  if (v.ok === false) return fail(v.error as keyof typeof ERRORS);
  const ai: AiRequest = v.req;

  // ---- no key in this deployment: «not ready», and no unit taken
  if (!deps.key) return fail("not_ready");

  // ---- salary questions: the member's own view of the aggregates (salary_explorer applies the access rules and the 5-report floor)
  let market: unknown = undefined;
  if (ai.feature === "salary-insights") {
    const c = ai.context;
    const r = await deps.db.rpcAs<any>(jwt, "salary_explorer", {
      p_disc: String(c.disc || "civil"), p_track: c.track ? String(c.track) : null,
      p_years_min: Math.max(0, Math.floor(Number(c.yearsMin ?? 0)) || 0), p_years_max: Math.min(50, Math.floor(Number(c.yearsMax ?? 50)) || 50),
      p_gov: c.gov ? String(c.gov) : null,
    });
    if (r.error) return fail("server");
    if (r.data && r.data.access === "none") return fail("blocked");
    market = marketOnly(r.data);
    // only the member's own figure and the filters travel with the aggregates
    ai.context = { disc: c.disc, track: c.track, years: c.years, gov: c.gov, mySalary: Number(c.mySalary) > 0 ? Math.round(Number(c.mySalary)) : undefined };
  }

  // ---- one unit of today's allowance
  const take = await deps.db.rpc<any>("ai_take", { p_account: user.id, p_feature: ai.feature });
  if (take.error || !take.data) return fail("server");
  if (!take.data.ok) return fail(take.data.reason === "quota" ? "quota" : take.data.reason === "disabled" ? "disabled" : "feature", { remaining: 0 });
  const remaining = Number(take.data.remaining) || 0;
  const model = String((LIMITS[ai.feature].light ? take.data.model_light : take.data.model) || "gemini-3.8-flash").replace(/[^a-z0-9.-]/gi, "");
  const refund = () => deps.db.rpc("ai_refund", { p_account: user.id, p_feature: ai.feature });

  // ---- the model
  const f = deps.fetch || fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? (ai.feature === "cv-review" ? 150_000 : 75_000));
  let up: Response;
  try {
    up = await f(`${deps.base || GEMINI}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": deps.key },
      body: JSON.stringify(geminiBody(ai, { market })),
    });
  } catch {
    clearTimeout(timer);
    await refund();
    return fail("busy");
  }
  if (!up.ok || !up.body) {
    clearTimeout(timer);
    await refund();
    return fail(upstreamError(up.status));
  }

  // ---- stream the text through, nothing else
  const reader = up.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      let buf = "";
      let sent = 0;
      let usage = { in: 0, out: 0 };
      let finish = "";
      let blocked = false;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const { chunks, rest } = parseSse(buf);
          buf = rest;
          for (const c of chunks) {
            if (c.usage) usage = c.usage;
            if (c.finish) finish = c.finish;
            if (c.blocked) blocked = true;
            if (c.text) {
              sent += c.text.length;
              out.enqueue(enc.encode(sse({ t: "d", x: c.text })));
            }
          }
        }
        const tail = parseSse(buf + "\n\n").chunks;
        for (const c of tail) {
          if (c.usage) usage = c.usage;
          if (c.finish) finish = c.finish;
          if (c.blocked) blocked = true;
          if (c.text) {
            sent += c.text.length;
            out.enqueue(enc.encode(sse({ t: "d", x: c.text })));
          }
        }
        if (!sent) {
          await refund();
          const code = blocked ? "blocked" : "busy";
          out.enqueue(enc.encode(sse({ t: "err", code, ar: ERRORS[code].ar, en: ERRORS[code].en })));
        } else {
          out.enqueue(enc.encode(sse({ t: "end", remaining, finish: finish || "STOP" })));
        }
      } catch {
        if (!sent) await refund();
        out.enqueue(enc.encode(sse({ t: "err", code: "busy", ar: ERRORS.busy.ar, en: ERRORS.busy.en })));
      } finally {
        clearTimeout(timer);
        await deps.db.rpc("ai_tokens", { p_account: user.id, p_feature: ai.feature, p_in: usage.in, p_out: usage.out });
        out.close();
      }
    },
  });
  return new Response(stream, { headers: { ...CORS, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-ai-remaining": String(remaining) } });
}
