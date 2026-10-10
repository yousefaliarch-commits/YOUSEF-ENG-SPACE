// =====================================================================
//  Tool document store — the phone is the primary copy, the account keeps a backup (docs/TOOLS-BLUEPRINT.md §5c)
//  · Local: IndexedDB "engspace-tools-v1-<pid>" (docs + sync meta); an in-memory adapter where IndexedDB is missing (tests).
//  · Account: member_state rows toolIndex (tombstones) + toolShelfA…L (12 shards of whole documents, ≤ 900 KB each in the
//    server's own jsonb size). Pull reads stamps first and fetches only rows that changed; push re-reads its shard and
//    merges before writing, so another phone's documents are never overwritten.
//  · Merge per document (data/tool-docs.ts mergeDoc): one-sided edits win, both-sided edits keep a conflict copy,
//    tombstones keep deletions deleted. Nothing is sliced or dropped: a document that does not fit stays on the phone and
//    says so («على هذا الجهاز فقط»).
//  · Every public function resolves; none rejects (handlers always end in a toast, never an unhandled error).
// =====================================================================
import {
  DOC_GUARD, LOG_CAP, SHARDS, SHARD_GUARD, headerOf, jsonbBytes, mergeDoc, newDocId, shardOf,
  type ToolDoc, type ToolHeader, type ToolTomb,
} from "../data/tool-docs";

export interface ToolAdapter {
  all(): Promise<ToolDoc[]>;
  put(d: ToolDoc): Promise<void>;
  del(id: string): Promise<void>;
  getMeta<T>(k: string): Promise<T | undefined>;
  setMeta(k: string, v: unknown): Promise<void>;
  close(): void;
  destroy(): Promise<void>;
}

export type CloudPort = {
  stamps(): Promise<Record<string, string>>;
  rows(keys: string[]): Promise<{ key: string; value: any; updated_at: string }[]>;
  save(key: string, value: unknown): Promise<void>;
};

type SyncMeta = {
  base: Record<string, number>;        // last agreed `at` per document
  dirty: Record<string, true>;         // documents changed here since the last push
  tombs: ToolTomb[];
  stamps: Record<string, string>;      // row → updated_at we last read or wrote
  local: Record<string, true>;         // documents too big for the account copy
};

const emptyMeta = (): SyncMeta => ({ base: {}, dirty: {}, tombs: [], stamps: {}, local: {} });

// ---------------------------------------------------------------------
//  Adapters
// ---------------------------------------------------------------------
export function memoryAdapter(): ToolAdapter {
  const docs = new Map<string, ToolDoc>();
  const meta = new Map<string, unknown>();
  return {
    all: async () => [...docs.values()].map((d) => structuredClone(d)),
    put: async (d) => void docs.set(d.id, structuredClone(d)),
    del: async (id) => void docs.delete(id),
    getMeta: async <T,>(k: string) => structuredClone(meta.get(k)) as T | undefined,
    setMeta: async (k, v) => void meta.set(k, structuredClone(v)),
    close: () => {},
    destroy: async () => {
      docs.clear();
      meta.clear();
    },
  };
}

const req = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

export async function idbAdapter(name: string): Promise<ToolAdapter> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("docs")) d.createObjectStore("docs", { keyPath: "id" });
      if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error("blocked"));
  });
  const tx = (store: string, mode: IDBTransactionMode) => db.transaction(store, mode).objectStore(store);
  return {
    all: () => req(tx("docs", "readonly").getAll()) as Promise<ToolDoc[]>,
    put: async (d) => void (await req(tx("docs", "readwrite").put(d))),
    del: async (id) => void (await req(tx("docs", "readwrite").delete(id))),
    getMeta: <T,>(k: string) => req(tx("meta", "readonly").get(k)) as Promise<T | undefined>,
    setMeta: async (k, v) => void (await req(tx("meta", "readwrite").put(v, k))),
    close: () => db.close(),
    destroy: async () => {
      db.close();
      await new Promise<void>((res) => {
        const r = indexedDB.deleteDatabase(name);
        r.onsuccess = r.onerror = r.onblocked = () => res();
      });
    },
  };
}

// ---------------------------------------------------------------------
//  The store
// ---------------------------------------------------------------------
export type SaveResult = { status: "ok"; doc: ToolDoc } | { status: "tooBig"; doc: ToolDoc } | { status: "failed"; error: string };

export class ToolStore {
  private docs = new Map<string, ToolDoc>();
  private meta: SyncMeta = emptyMeta();
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private pending = new Set<string>();
  private pushing: Promise<void> | null = null;
  lastError = "";

  constructor(public readonly pid: string, private a: ToolAdapter, public cloud: CloudPort | null) {}

  static async open(pid: string, cloud: CloudPort | null, adapter?: ToolAdapter): Promise<ToolStore> {
    let a = adapter;
    if (!a) {
      try {
        a = typeof indexedDB !== "undefined" ? await idbAdapter(`engspace-tools-v1-${pid || "demo"}`) : memoryAdapter();
      } catch {
        a = memoryAdapter();
      }
    }
    const s = new ToolStore(pid, a, cloud);
    try {
      for (const d of await a.all()) s.docs.set(d.id, d);
      s.meta = { ...emptyMeta(), ...((await a.getMeta<SyncMeta>("sync")) || {}) };
    } catch (e) {
      s.lastError = String((e as any)?.message || e);
    }
    return s;
  }

  // ---- reading ----
  headers(kinds?: string[]): ToolHeader[] {
    const out: ToolHeader[] = [];
    for (const d of this.docs.values()) if (!kinds || kinds.includes(d.kind)) out.push(headerOf(d));
    return out.sort((x, y) => y.at - x.at);
  }
  get(id: string): ToolDoc | null {
    const d = this.docs.get(id);
    return d ? structuredClone(d) : null;
  }
  localOnly(id: string) {
    return !!this.meta.local[id];
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private notify() {
    this.listeners.forEach((f) => {
      try {
        f();
      } catch {
        /* a listener's problem is not the store's */
      }
    });
  }
  private async saveMeta() {
    try {
      await this.a.setMeta("sync", this.meta);
    } catch (e) {
      this.lastError = String((e as any)?.message || e);
    }
  }

  // ---- writing ----
  async save(doc: ToolDoc, what = "edit"): Promise<SaveResult> {
    try {
      const prev = this.docs.get(doc.id);
      const at = Math.max(Date.now(), (prev ? prev.at : 0) + 1);
      const log = what === "edit" && prev && prev.log.length && prev.log[prev.log.length - 1].what === "edit"
        ? doc.log
        : [...doc.log, { at, what }].slice(-LOG_CAP);
      const next: ToolDoc = { ...doc, at, log };
      this.docs.set(next.id, next);
      await this.a.put(next);
      this.meta.dirty[next.id] = true;
      const big = jsonbBytes(next) > DOC_GUARD;
      if (big) this.meta.local[next.id] = true;
      else delete this.meta.local[next.id];
      await this.saveMeta();
      this.notify();
      this.schedule(shardOf(next.id));
      return big ? { status: "tooBig", doc: next } : { status: "ok", doc: next };
    } catch (e) {
      return { status: "failed", error: String((e as any)?.message || e) };
    }
  }

  async remove(id: string): Promise<{ status: "ok" | "failed"; error?: string }> {
    try {
      const d = this.docs.get(id);
      if (!d) return { status: "ok" };
      this.docs.delete(id);
      await this.a.del(id);
      this.meta.tombs = [...this.meta.tombs.filter((t) => t.id !== id), { id, kind: d.kind, deleted: true as const, at: Math.max(Date.now(), d.at + 1) }].slice(-500);
      delete this.meta.dirty[id];
      delete this.meta.local[id];
      await this.saveMeta();
      this.notify();
      this.schedule(shardOf(id));
      return { status: "ok" };
    } catch (e) {
      return { status: "failed", error: String((e as any)?.message || e) };
    }
  }

  // ---- sync ----
  private schedule(shard: string, ms = 1500) {
    if (!this.cloud) return;
    this.pending.add(shard);
    clearTimeout(this.timers.get(shard));
    this.timers.set(shard, setTimeout(() => void this.flush(), ms));
  }

  // push every pending shard now (on pop, when the app is hidden, before sign-out)
  async flush(): Promise<void> {
    if (!this.cloud) return;
    if (this.pushing) return this.pushing;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    const shards = [...this.pending];
    this.pending.clear();
    if (!shards.length) return;
    this.pushing = (async () => {
      try {
        await this.sync(shards);
      } catch (e) {
        this.lastError = String((e as any)?.message || e);
        shards.forEach((s) => this.pending.add(s));
      } finally {
        this.pushing = null;
      }
    })();
    return this.pushing;
  }

  // pull everything that changed on the account (after sign-in, on resume)
  async pull(): Promise<{ status: "ok" | "failed"; error?: string }> {
    if (!this.cloud) return { status: "ok" };
    try {
      await this.sync([]);
      return { status: "ok" };
    } catch (e) {
      this.lastError = String((e as any)?.message || e);
      return { status: "failed", error: this.lastError };
    }
  }

  private applyRemote(rows: { key: string; value: any; updated_at: string }[]) {
    const index = rows.find((r) => r.key === "toolIndex");
    if (index && index.value && Array.isArray(index.value.tombs)) {
      const mine = new Map(this.meta.tombs.map((t) => [t.id, t]));
      for (const t of index.value.tombs as ToolTomb[]) {
        const m = mine.get(t.id);
        if (!m || t.at > m.at) mine.set(t.id, t);
      }
      this.meta.tombs = [...mine.values()].sort((x, y) => x.at - y.at).slice(-500);
    }
    const tombOf = new Map(this.meta.tombs.map((t) => [t.id, t]));
    const changed: ToolDoc[] = [];
    const gone: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.key === "toolIndex" || !r.value || !Array.isArray(r.value.docs)) continue;
      for (const rd of r.value.docs as ToolDoc[]) {
        seen.add(rd.id);
        const local = this.docs.get(rd.id) || null;
        const base = this.meta.base[rd.id] || 0;
        const out = mergeDoc(local, rd, this.meta.dirty[rd.id] ? base : Math.max(base, local ? local.at : 0), tombOf.get(rd.id) || null, newDocId);
        if (out.keep && (!local || out.keep !== local)) changed.push(out.keep);
        if (out.keep) this.meta.base[rd.id] = rd.at;
        if (out.keep && out.keep === rd) delete this.meta.dirty[rd.id];
        if (out.copy) {
          changed.push(out.copy);
          this.meta.dirty[out.copy.id] = true;
        }
        if (!out.keep && local) gone.push(rd.id);
      }
    }
    // local copies the account has deleted
    for (const t of tombOf.values()) {
      const d = this.docs.get(t.id);
      if (d && t.at >= d.at) gone.push(t.id);
    }
    return { changed, gone };
  }

  private async sync(shards: string[]) {
    const cloud = this.cloud!;
    const stamps = await cloud.stamps();
    const want = new Set<string>(shards);
    want.add("toolIndex");
    for (const [k, v] of Object.entries(stamps)) if (k === "toolIndex" || SHARDS.includes(k)) if (this.meta.stamps[k] !== v) want.add(k);
    const rows = await cloud.rows([...want].filter((k) => stamps[k]));
    const { changed, gone } = this.applyRemote(rows);
    for (const d of changed) {
      this.docs.set(d.id, d);
      await this.a.put(d);
    }
    for (const id of gone) {
      this.docs.delete(id);
      await this.a.del(id);
    }
    rows.forEach((r) => (this.meta.stamps[r.key] = r.updated_at));
    // shards with local changes (including conflict copies and deletions) go back up
    const up = new Set<string>(shards);
    Object.keys(this.meta.dirty).forEach((id) => up.add(shardOf(id)));
    if (up.size) {
      for (const shard of up) {
        const docs = [...this.docs.values()]
          .filter((d) => shardOf(d.id) === shard && !this.meta.local[d.id])
          .sort((x, y) => y.at - x.at);
        const fit: ToolDoc[] = [];
        let bytes = 20;
        for (const d of docs) {
          const b = jsonbBytes(d) + 2;
          if (bytes + b > SHARD_GUARD) {
            this.meta.local[d.id] = true;
            continue;
          }
          bytes += b;
          fit.push(d);
        }
        await cloud.save(shard, { v: 1, docs: fit });
        fit.forEach((d) => {
          this.meta.base[d.id] = d.at;
          delete this.meta.dirty[d.id];
        });
      }
      await cloud.save("toolIndex", { v: 1, tombs: this.meta.tombs });
      // our own writes are not news on the next pull
      const after = await cloud.stamps();
      for (const k of [...up, "toolIndex"]) if (after[k]) this.meta.stamps[k] = after[k];
    }
    await this.saveMeta();
    if (changed.length || gone.length) this.notify();
  }

  // ---- leaving ----
  async destroy() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.listeners.clear();
    try {
      await this.a.destroy();
    } catch {
      /* already gone */
    }
  }
  close() {
    this.timers.forEach((t) => clearTimeout(t));
    this.a.close();
  }
}

// ---------------------------------------------------------------------
//  One open store per signed-in member
// ---------------------------------------------------------------------
let current: { pid: string; store: Promise<ToolStore> } | null = null;

export function toolStore(pid: string, cloud: CloudPort | null): Promise<ToolStore> {
  if (current && current.pid === pid) {
    void current.store.then((s) => (s.cloud = cloud));
    return current.store;
  }
  if (current) void current.store.then((s) => s.close());
  current = { pid, store: ToolStore.open(pid, cloud) };
  return current.store;
}

export const currentToolStore = () => (current ? current.store : null);

// account deletion / «احذف بيانات الأدوات من هذا الجهاز»
export async function destroyToolStore(pid: string) {
  try {
    if (current && current.pid === pid) {
      const s = await current.store;
      current = null;
      await s.destroy();
      return;
    }
    if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase(`engspace-tools-v1-${pid || "demo"}`);
  } catch {
    /* nothing left to remove */
  }
}
