// upload-media (Phase 1.3): the byte checks on real encoded files, and the request handling with a fake service client.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { KINDS, check, hasMetadata, inspect, jpegInfo, pathFor, stripJpeg, stripWebp, webpInfo } from "../supabase/functions/_shared/media";
import { handle, sweep } from "../supabase/functions/_shared/media-handler";

const EXIF = { IFD0: { Make: "PhoneCo", Model: "Camera 9" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "30/1 2/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "31/1 14/1 0/1" } };
const img = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 130, b: 140 } } });
const u8 = (b: Buffer) => new Uint8Array(b.buffer, b.byteOffset, b.length);
const has = (b: Uint8Array, s: string) => Buffer.from(b).includes(Buffer.from(s));

describe("reading the real format and size from the bytes", () => {
  it("JPEG and WebP (lossy and with an EXIF chunk) report their true dimensions", async () => {
    expect(jpegInfo(u8(await img(1600, 1200).jpeg().toBuffer()))).toEqual({ w: 1600, h: 1200 });
    expect(webpInfo(u8(await img(1200, 900).webp().toBuffer()))).toEqual({ w: 1200, h: 900 });
    expect(webpInfo(u8(await img(640, 480).webp().withMetadata({ exif: EXIF } as any).toBuffer()))).toEqual({ w: 640, h: 480 });
    expect(webpInfo(u8(await img(300, 200).webp({ lossless: true }).toBuffer()))).toEqual({ w: 300, h: 200 });
  });
  it("anything else is not an image here", async () => {
    expect(inspect(u8(await img(200, 200).png().toBuffer()))).toBeNull();
    expect(inspect(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(inspect(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe("metadata never survives", () => {
  it("a camera JPEG loses EXIF and GPS; the picture stays decodable and the same size", async () => {
    const raw = u8(await img(800, 600).jpeg().withMetadata({ exif: EXIF } as any).toBuffer());
    expect(has(raw, "PhoneCo") && hasMetadata(raw)).toBe(true);
    const out = stripJpeg(raw);
    expect(hasMetadata(out)).toBe(false); expect(has(out, "PhoneCo")).toBe(false); expect(has(out, "Exif")).toBe(false);
    expect((await sharp(Buffer.from(out)).metadata()).width).toBe(800);
  });
  it("a WebP loses its EXIF chunk and flag; it still decodes", async () => {
    const raw = u8(await img(640, 480).webp().withMetadata({ exif: EXIF } as any).toBuffer());
    expect(hasMetadata(raw)).toBe(true);
    const out = stripWebp(raw); const m = await sharp(Buffer.from(out)).metadata();
    expect(hasMetadata(out)).toBe(false); expect(has(out, "PhoneCo")).toBe(false); expect(m.width).toBe(640); expect(m.exif).toBeUndefined();
  });
});

describe("the limits of each kind", () => {
  it("public images get random names; private ones stay in the owner's folder", () => {
    expect(pathFor("post", "U", "id", "image/webp")).toBe("p/id.webp"); expect(pathFor("avatar", "U", "id", "image/jpeg")).toBe("a/id.jpg");
    expect(pathFor("support", "U", "id", "image/webp")).toBe("U/id.webp"); expect(pathFor("inspection", "U", "id", "image/webp")).toBe("U/id.webp");
    expect(KINDS.post.bucket).toBe("media"); expect(KINDS.inspection.bucket).toBe("inspections"); expect(KINDS.verification.bucket).toBe("verification");
  });
  it("too large, wrong format and wrong dimensions are refused with a reason", async () => {
    expect(check("post", new Uint8Array(KINDS.post.maxBytes + 1))).toMatchObject({ ok: false, status: 413, error: "too_big" });
    expect(check("post", u8(await img(200, 200).png().toBuffer()))).toMatchObject({ ok: false, status: 415 });
    expect(check("post", u8(await img(3000, 2000).webp({ quality: 5 }).toBuffer()))).toMatchObject({ ok: false, status: 422, error: "dimensions" });
    expect(check("avatar", u8(await img(800, 800).webp({ quality: 5 }).toBuffer()))).toMatchObject({ ok: false, status: 422 });
    expect(check("verification", u8(await img(200, 150).jpeg().toBuffer()))).toMatchObject({ ok: false, status: 422 });
    const good = check("post", u8(await img(1600, 1200).webp({ quality: 70 }).withMetadata({ exif: EXIF } as any).toBuffer()));
    expect(good.ok && good.info).toEqual({ mime: "image/webp", w: 1600, h: 1200 }); expect(good.ok && hasMetadata(good.bytes)).toBe(false);
  });
});

// ---------------------------------------------------------------- the handler, with a fake service client
function fakeDb(opts: { user?: string | null; register?: any; upload?: any; legacy?: string[]; orphans?: any[]; removable?: any[]; move?: any } = {}) {
  const calls: any[] = []; const uploads: any[] = []; const removed: any[] = [];
  const db: any = {
    user: async (jwt: string) => (jwt && opts.user !== null ? { id: opts.user || "U1" } : null),
    rpc: async (fn: string, args: any) => {
      calls.push([fn, args]);
      if (fn === "media_register") return opts.register || { data: null, error: null };
      if (fn === "media_legacy") return { data: (opts.legacy || []).map((path) => ({ path })), error: null };
      if (fn === "media_orphans") return { data: opts.orphans || [], error: null };
      if (fn === "media_removable") return { data: opts.removable || [], error: null };
      return { data: null, error: null };
    },
    upload: async (...a: any[]) => { uploads.push(a); return opts.upload || { data: {}, error: null }; },
    remove: async (bucket: string, paths: string[]) => { removed.push([bucket, paths]); return { data: [], error: null }; },
    move: async () => opts.move || { data: {}, error: null },
  };
  return { db, calls, uploads, removed };
}
const req = (body: any, headers: Record<string, string>) => new Request("http://x/upload-media", { method: "POST", body, headers });
const jpeg = async () => u8(await img(1600, 1200).jpeg({ quality: 70 }).withMetadata({ exif: EXIF } as any).toBuffer());

describe("upload-media requests", () => {
  it("stores a member's photo: checked, stripped, registered, then uploaded under a random name", async () => {
    const f = fakeDb(); const r = await handle(req(await jpeg(), { authorization: "Bearer jwt", "x-media-kind": "post" }), f.db, "s", () => "R1");
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ path: "p/R1.jpg", bucket: "media", w: 1600, h: 1200, mime: "image/jpeg" });
    expect(f.calls[0]).toEqual(["media_register", expect.objectContaining({ p_owner: "U1", p_kind: "post", p_path: "p/R1.jpg" })]);
    const stored = f.uploads[0][2] as Uint8Array; expect(hasMetadata(stored)).toBe(false); expect(has(stored, "PhoneCo")).toBe(false);
  });
  it("refuses without a member, without a kind, and passes the byte checks' reasons on", async () => {
    expect((await handle(req(await jpeg(), { "x-media-kind": "post" }), fakeDb().db, "s")).status).toBe(401);
    expect((await handle(req(await jpeg(), { authorization: "Bearer jwt", "x-media-kind": "logo" }), fakeDb().db, "s")).status).toBe(400);
    expect((await handle(req(u8(await img(100, 100).png().toBuffer()), { authorization: "Bearer jwt", "x-media-kind": "post" }), fakeDb().db, "s")).status).toBe(415);
    expect((await handle(req(new Uint8Array(10), { authorization: "Bearer jwt", "x-media-kind": "avatar", "content-length": String(10 ** 6) }), fakeDb().db, "s")).status).toBe(413);
  });
  it("the SQL quota and rate limit come back as 429; a storage failure frees the reserved path", async () => {
    const limited = fakeDb({ register: { data: null, error: { message: "media rate limited" } } });
    const r1 = await handle(req(await jpeg(), { authorization: "Bearer jwt", "x-media-kind": "post" }), limited.db, "s"); expect(r1.status).toBe(429); expect(await r1.json()).toEqual({ error: "rate_limited" });
    const quota = fakeDb({ register: { data: null, error: { message: "media quota" } } });
    expect(await (await handle(req(await jpeg(), { authorization: "Bearer jwt", "x-media-kind": "post" }), quota.db, "s")).json()).toEqual({ error: "quota" });
    expect(limited.uploads.length + quota.uploads.length).toBe(0);
    const broken = fakeDb({ upload: { data: null, error: { message: "boom" } } });
    expect((await handle(req(await jpeg(), { authorization: "Bearer jwt", "x-media-kind": "post" }), broken.db, "s", () => "R2")).status).toBe(502);
    expect(broken.calls.map((c) => c[0])).toEqual(["media_register", "media_unregister"]);
  });
  it("removes only what the server says the member owns", async () => {
    const f = fakeDb({ removable: [{ bucket: "inspections", path: "U1/a.webp" }] });
    const r = await handle(req(JSON.stringify({ paths: ["U1/a.webp", "U2/b.webp"] }), { authorization: "Bearer jwt", "x-media-action": "remove" }), f.db, "s");
    expect(await r.json()).toEqual({ removed: 1 }); expect(f.removed).toEqual([["inspections", ["U1/a.webp"]]]);
  });
  it("the janitor needs its secret; it renames old files and deletes orphans", async () => {
    expect((await handle(req(null, { "x-media-secret": "nope" }), fakeDb().db, "s")).status).toBe(403);
    expect((await handle(req(null, { "x-media-secret": "s" }), fakeDb().db, undefined)).status).toBe(403);
    const f = fakeDb({ legacy: ["U1/old.jpg"], orphans: [{ bucket: "media", path: "p/x.webp" }, { bucket: "inspections", path: "U9/y.webp" }] });
    expect(await sweep(f.db, () => "N1")).toEqual({ moved: 1, removed: 2 });
    expect(f.calls).toContainEqual(["media_rename", { p_old: "U1/old.jpg", p_new: "p/N1.jpg" }]);
    expect(f.removed).toEqual([["media", ["p/x.webp"]], ["inspections", ["U9/y.webp"]]]);
  });
});
