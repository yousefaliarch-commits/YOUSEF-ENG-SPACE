// =====================================================================
//  A template file from outside (a colleague's WhatsApp, an e-mail) is untrusted input. This is the only door:
//  size → JSON → the envelope's shape (zod: known fields, bounded lengths, everything else stripped) → the free-form body
//  bounded as plain JSON (data/tool-templates.ts safeJson). Nothing here trusts the file's own claims: the tool still has
//  to be one this member may open and has to build a document from the body before anything is saved.
//  Loaded only when a file is imported (zod never reaches the app's first load).
// =====================================================================
import * as z from "zod/mini";
import { REV_MAX_LEN, SIGN_MAX } from "./doc-controls";
import { TPL_FILE_MAX, TPL_FORMAT, TPL_NAME_MAX, safeJson, type TemplateFile } from "./tool-templates";

const text = (max: number) => z.string().check(z.maxLength(max));
const Sign = z.object({
  label: z.string().check(z.trim(), z.minLength(1), z.maxLength(60)),
  name: z.optional(text(80)),
  title: z.optional(text(80)),
});
const Envelope = z.object({
  format: z.literal(TPL_FORMAT),
  version: z.literal(1),
  kind: z.string().check(z.regex(/^[A-Za-z][A-Za-z0-9]{1,30}$/)),
  v: z.int().check(z.gte(1), z.lte(99)),
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(TPL_NAME_MAX)),
  rows: z.optional(z.boolean()),
  savedAt: z.optional(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))),
  body: z.unknown(),
  sign: z.optional(z.array(Sign).check(z.maxLength(SIGN_MAX))),
  tb: z.optional(z.object({ scale: z.optional(text(16)), reference: z.optional(text(60)) })),
  rev: z.optional(z.string().check(z.regex(/^[A-Za-z0-9.-]*$/), z.maxLength(REV_MAX_LEN))),
});

export type TemplateFileProblem = "tooBig" | "notJson" | "notTemplate" | "badBody";
export type ParsedTemplateFile = { ok: true; file: TemplateFile } | { ok: false; problem: TemplateFileProblem };

export function parseTemplateFile(raw: string): ParsedTemplateFile {
  if (typeof raw !== "string" || raw.length > TPL_FILE_MAX) return { ok: false, problem: "tooBig" };
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ""));
  } catch {
    return { ok: false, problem: "notJson" };
  }
  const env = Envelope.safeParse(data);
  if (!env.success) return { ok: false, problem: "notTemplate" };
  const e = env.data;
  if (e.body === null || typeof e.body !== "object" || Array.isArray(e.body)) return { ok: false, problem: "badBody" };
  const body = safeJson(e.body);
  if (!body.ok) return { ok: false, problem: "badBody" };
  return {
    ok: true,
    file: {
      format: TPL_FORMAT, version: 1, kind: e.kind, v: e.v, name: e.name, rows: e.rows !== false, savedAt: e.savedAt || "",
      body: body.value, ...(e.sign ? { sign: e.sign } : {}), ...(e.tb ? { tb: e.tb } : {}), ...(e.rev ? { rev: e.rev } : {}),
    },
  };
}

export const TEMPLATE_FILE_PROBLEM: Record<TemplateFileProblem, string> = {
  tooBig: "الملف أكبر من أن يكون قالبًا",
  notJson: "الملف ليس قالب EngSpace",
  notTemplate: "الملف ليس قالب EngSpace صالحًا",
  badBody: "محتوى القالب غير صالح",
};
