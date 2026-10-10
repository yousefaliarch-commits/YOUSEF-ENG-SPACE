// The Tools document store (src/lib/tool-store.ts + data/tool-docs.ts): two phones on one account through a fake
// member_state — deletions stay deleted, parallel edits keep a conflict copy, edits to different documents both survive,
// shards respect the server's size, and every call resolves.
import { describe, expect, it } from "vitest";
import { ToolStore, memoryAdapter, type CloudPort } from "../src/lib/tool-store";
import { jsonbBytes, mergeDoc, newDocId, shardOf, SHARDS, type ToolDoc } from "../src/data/tool-docs";

function fakeCloud() {
  const rows = new Map<string, { value: any; updated_at: string }>();
  let clock = 0;
  const port: CloudPort = {
    stamps: async () => Object.fromEntries([...rows].map(([k, v]) => [k, v.updated_at])),
    rows: async (keys) => keys.filter((k) => rows.has(k)).map((k) => ({ key: k, value: structuredClone(rows.get(k)!.value), updated_at: rows.get(k)!.updated_at })),
    save: async (key, value) => {
      rows.set(key, { value: JSON.parse(JSON.stringify(value)), updated_at: String(++clock).padStart(8, "0") });
    },
  };
  return { port, rows };
}

const doc = (title: string, over: Partial<ToolDoc> = {}): ToolDoc => ({
  id: newDocId(), kind: "concrete", v: 1, at: 0, createdAt: Date.now(), projectId: null, title, dateIso: "2026-10-10",
  docNo: null, rev: "00", status: "draft", profile: { id: "ecp203-site@1", edition: "2020", values: {}, overridden: [], unverified: [] },
  body: { n: 1 }, photos: {}, log: [], ...over,
});

const phone = (cloud: CloudPort) => ToolStore.open("p1", cloud, memoryAdapter());

describe("ids and shards", () => {
  it("ids are d + 20 base-32 characters, and a document always maps to one of 12 shards", () => {
    const id = newDocId();
    expect(id).toMatch(/^d[a-z2-7]{20}$/);
    expect(SHARDS).toHaveLength(12);
    expect(shardOf(id)).toBe(shardOf(id));
    expect(SHARDS).toContain(shardOf(id));
  });
  it("jsonbBytes is never below the plain JSON size (the server prints ': ' and ', ')", () => {
    const v = { a: [1, 2, 3], b: "x,y:z", c: { d: "ب" } };
    expect(jsonbBytes(v)).toBeGreaterThanOrEqual(new TextEncoder().encode(JSON.stringify(v)).length);
    expect(jsonbBytes(v)).toBe(new TextEncoder().encode(JSON.stringify(v)).length + 8);
  });
});

describe("mergeDoc", () => {
  const a = doc("أ", { at: 100 });
  const idf = () => "dcopy";
  it("one-sided edits win; equal versions are the same", () => {
    expect(mergeDoc({ ...a, at: 200 }, { ...a, at: 100 }, 100, null, idf).keep!.at).toBe(200);
    expect(mergeDoc({ ...a, at: 100 }, { ...a, at: 300 }, 100, null, idf).keep!.at).toBe(300);
    expect(mergeDoc(a, a, 100, null, idf).copy).toBeNull();
  });
  it("both sides edited: the remote keeps the id, the local edit becomes a draft copy", () => {
    const out = mergeDoc({ ...a, at: 200, title: "محلي", docNo: "X-1", status: "issued" }, { ...a, at: 300 }, 100, null, idf);
    expect(out.keep!.at).toBe(300);
    expect(out.copy!.id).toBe("dcopy");
    expect(out.copy!.title).toContain("نسخة متعارضة");
    expect(out.copy!.status).toBe("draft");
    expect(out.copy!.docNo).toBeNull();
  });
  it("a tombstone beats every copy not edited after it", () => {
    const t = { id: a.id, kind: a.kind, deleted: true as const, at: 250 };
    expect(mergeDoc({ ...a, at: 200 }, { ...a, at: 240 }, 100, t, idf).keep).toBeNull();
    expect(mergeDoc({ ...a, at: 260 }, null, 100, t, idf).keep!.at).toBe(260);
  });
});

describe("two phones on one account", () => {
  it("a document saved on A reaches B", async () => {
    const { port } = fakeCloud();
    const A = await phone(port), B = await phone(port);
    const r = await A.save(doc("خطة صب السقف"));
    expect(r.status).toBe("ok");
    await A.flush();
    expect((await B.pull()).status).toBe("ok");
    expect(B.headers().map((h) => h.title)).toEqual(["خطة صب السقف"]);
  });

  it("a deletion on A is not resurrected by B", async () => {
    const { port } = fakeCloud();
    const A = await phone(port), B = await phone(port);
    const r = await A.save(doc("سيُحذف"));
    await A.flush();
    await B.pull();
    await A.remove(r.status === "ok" ? r.doc.id : "");
    await A.flush();
    // B writes something else to the same account and syncs
    await B.save(doc("مستند آخر"));
    await B.flush();
    await B.pull();
    await A.pull();
    expect(B.headers().map((h) => h.title)).toEqual(["مستند آخر"]);
    expect(A.headers().map((h) => h.title)).toEqual(["مستند آخر"]);
  });

  it("parallel edits to one draft keep both: the other phone's version and a conflict copy", async () => {
    const { port } = fakeCloud();
    const A = await phone(port), B = await phone(port);
    const r = await A.save(doc("مسودة"));
    const id = r.status === "ok" ? r.doc.id : "";
    await A.flush();
    await B.pull();
    await A.save({ ...A.get(id)!, body: { n: 2 } });
    await A.flush();
    await B.save({ ...B.get(id)!, body: { n: 3 } });
    await B.flush();
    await A.pull();
    const titles = A.headers().map((h) => h.title).sort();
    expect(titles).toEqual(["مسودة", "مسودة (نسخة متعارضة)"]);
    expect((A.get(id)!.body as any).n).toBe(2);
    const copy = A.headers().find((h) => h.id !== id)!;
    expect((A.get(copy.id)!.body as any).n).toBe(3);
  });

  it("edits to different documents both survive", async () => {
    const { port } = fakeCloud();
    const A = await phone(port), B = await phone(port);
    await A.save(doc("أ"));
    await B.save(doc("ب"));
    await A.flush();
    await B.flush();
    await A.pull();
    await B.pull();
    expect(A.headers().map((h) => h.title).sort()).toEqual(["أ", "ب"]);
    expect(B.headers().map((h) => h.title).sort()).toEqual(["أ", "ب"]);
  });

  it("a document too big for the account copy stays on the phone and says so", async () => {
    const { port, rows } = fakeCloud();
    const A = await phone(port);
    const r = await A.save(doc("كبير", { body: { blob: "x".repeat(210 * 1024) } }));
    expect(r.status).toBe("tooBig");
    await A.flush();
    expect(A.localOnly(r.status === "tooBig" ? r.doc.id : "")).toBe(true);
    const shard = rows.get(shardOf(r.status === "tooBig" ? r.doc.id : ""));
    expect(shard ? shard.value.docs.length : 0).toBe(0);
  });

  it("an unreachable account never throws out of the store", async () => {
    const broken: CloudPort = { stamps: async () => { throw new Error("offline"); }, rows: async () => [], save: async () => {} };
    const A = await phone(broken);
    expect((await A.save(doc("بلا شبكة"))).status).toBe("ok");
    await A.flush();
    expect((await A.pull()).status).toBe("failed");
    expect(A.headers()).toHaveLength(1);
  });
});
