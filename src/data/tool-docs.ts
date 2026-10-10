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
