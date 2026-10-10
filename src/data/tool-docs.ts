// =====================================================================
//  Tool documents — the envelope every saved tool document shares (pour plans, bar bending schedules, level books, diaries…)
//  · The phone is the primary copy (IndexedDB, src/lib/tool-store.ts); the account copy lives in member_state shards
//    (toolIndex + toolShelfA…X). Merge is per document: newest wins when one side changed, a conflict COPY when both did,
//    tombstones keep deletions deleted. Nothing is ever sliced or overwritten silently.
//  · Every document freezes the code-profile constants its engines used (ProfileSnap), so a reprint never changes.
//  · This file is pure: types, caps, merge, size guards, shard choice. See docs/TOOLS-BLUEPRINT.md §5c.
// =====================================================================
import type { PhotoRef } from "../doc/model";
import type { ProjectSnap } from "./tool-projects";

export type ToolKind = string;   // the tool id, or a sub-kind: "inspection" | "qcTemplate" | "crew" | "rebarStock" | "materialRequest"

export type ProfileSnap = {
  id: string;                                   // e.g. "ecp203-site@1"
  edition: string;
  values: Record<string, number | string>;      // every constant the engines read, frozen
  overridden: string[];
  unverified: string[];
};

export type ToolDocStatus = "draft" | "issued" | "superseded" | "void";

export type ToolDocLogEntry = { at: number; what: string; note?: string };

export type ToolDoc<B = unknown> = {
  id: string;                    // "d" + 20 random base-32 characters
  kind: ToolKind;
  v: number;                     // body schema version for that kind
  at: number;                    // last change (device time + measured server offset)
  createdAt: number;
  projectId: string | null;
  project?: ProjectSnap;         // frozen at issue
  title: string;
  dateIso: string;               // the document's working date (pour day, diary day…)
  docNo: string | null;
  rev: string;
  status: ToolDocStatus;
  issuedAt?: number;
  revOf?: string;
  supersededBy?: string;
  until?: string;                // e.g. permit expiry, for the Today strip
  profile: ProfileSnap;
  body: B;
  photos: Record<string, PhotoRef[]>;
  hash?: string;
  log: ToolDocLogEntry[];        // ≤ 50 entries
};

export type ToolTomb = { id: string; kind: ToolKind; deleted: true; at: number };

export type ToolHeader = Pick<ToolDoc, "id" | "kind" | "projectId" | "title" | "dateIso" | "docNo" | "rev" | "status" | "at" | "until">
  & { shard: string; bytes: number; deleted?: true };

// local-only sync state, never uploaded
export type ToolSyncState = { id: string; base: number; dirty: boolean; verify: boolean };

// ---------------------------------------------------------------------
//  Ids, shards, headers, size
// ---------------------------------------------------------------------
const B32 = "abcdefghijklmnopqrstuvwxyz234567";
export function newDocId(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return "d" + Array.from(rand(20), (b) => B32[b & 31]).join("");
}

// 12 account shards (toolShelfA … toolShelfL): a document always lives in the same one
export const SHARDS = "ABCDEFGHIJKL".split("").map((c) => `toolShelf${c}`);
export function shardOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SHARDS[h % SHARDS.length];
}

// the size Postgres stores (jsonb prints ": " and ", "), so a guard measured here holds on the server
export function jsonbBytes(v: unknown) {
  const s = JSON.stringify(v);
  let extra = 0, inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && inStr) { i++; continue; }
    if (c === '"') inStr = !inStr;
    else if (!inStr && (c === ":" || c === ",")) extra++;
  }
  return new TextEncoder().encode(s).length + extra;
}
export const SHARD_TARGET = 700 * 1024;
export const SHARD_GUARD = 900 * 1024;
export const DOC_GUARD = 200 * 1024;
export const LOG_CAP = 50;

export function headerOf(d: ToolDoc): ToolHeader {
  return {
    id: d.id, kind: d.kind, projectId: d.projectId, title: d.title, dateIso: d.dateIso, docNo: d.docNo, rev: d.rev, status: d.status,
    at: d.at, until: d.until, shard: shardOf(d.id), bytes: jsonbBytes(d),
  };
}

// ---------------------------------------------------------------------
//  Merge (one document at a time; nothing is sliced or overwritten silently)
//  · base = the version both sides last agreed on (ToolSyncState.base, 0 for never synced).
//  · Only one side changed → that side. Both changed → the remote keeps the id, the local edit becomes a conflict copy.
//  · A tombstone wins over any copy not edited after it.
// ---------------------------------------------------------------------
export type MergeOut = { keep: ToolDoc | null; copy: ToolDoc | null; tomb: ToolTomb | null };

export function mergeDoc(local: ToolDoc | null, remote: ToolDoc | null, base: number, tomb: ToolTomb | null, copyId: () => string): MergeOut {
  const alive = (d: ToolDoc | null) => (d && (!tomb || d.at > tomb.at) ? d : null);
  const l = alive(local), r = alive(remote);
  if (!l && !r) return { keep: null, copy: null, tomb: tomb || null };
  if (!l) return { keep: r, copy: null, tomb: null };
  if (!r) return { keep: l, copy: null, tomb: null };
  const same = l.title === r.title && l.status === r.status && JSON.stringify(l.body) === JSON.stringify(r.body);
  if (l.at === r.at && same) return { keep: r, copy: null, tomb: null };
  const lChanged = l.at > base, rChanged = r.at > base;
  if (lChanged && rChanged && !same) {
    const copy: ToolDoc = {
      ...l, id: copyId(), docNo: null, status: "draft", issuedAt: undefined, hash: undefined,
      title: `${l.title} (نسخة متعارضة)`,
      log: [...l.log, { at: l.at, what: "conflict", note: l.id }].slice(-LOG_CAP),
    };
    return { keep: r, copy, tomb: null };
  }
  return { keep: l.at > r.at ? l : r, copy: null, tomb: null };
}
