// The on-device compression loop (src/lib/compress.ts) and its agreement with the server's limits.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { PROFILES, fit, headerSize, nextQuality, readHeader, shownSize } from "../src/lib/compress";
import { KINDS } from "../supabase/functions/_shared/media";
import { mediaUrl } from "../src/backend/config";

// a stand-in encoder: size grows with pixels and quality (roughly what WebP does on a photo)
const model = (pixels: number, k = 1) => async (scale: number, q: number) => new Blob([new Uint8Array(Math.round(pixels * scale * scale * Math.pow(q, 1.5) * k))]);

describe("fitting a photo into its target", () => {
  it("a typical 1600 px photo fits by tuning quality alone", async () => {
    const tries: number[] = []; const r = await fit(PROFILES.photo, 1600, async (s, q) => { tries.push(q); return model(1600 * 1200, 0.22)(s, q); });
    expect(r.blob.size).toBeLessThanOrEqual(PROFILES.photo.target); expect(r.scale).toBe(1); expect(tries.length).toBeLessThanOrEqual(4);
  });
  it("a detailed photo steps down in resolution, never below the profile's floor", async () => {
    const r = await fit(PROFILES.photo, 1600, model(1600 * 1200, 0.9));
    expect(r.blob.size).toBeLessThanOrEqual(PROFILES.photo.target); expect(1600 * r.scale).toBeGreaterThanOrEqual(PROFILES.photo.minLong);
  });
  it("a document keeps more resolution than a photo", async () => {
    const r = await fit(PROFILES.document, 1600, model(1600 * 1200, 0.9)); expect(1600 * r.scale).toBeGreaterThanOrEqual(PROFILES.document.minLong);
  });
  it("what cannot fit even the hard ceiling is refused", async () => {
    await expect(fit(PROFILES.avatar, 256, async () => new Blob([new Uint8Array(PROFILES.avatar.hardCap + 1)]))).rejects.toThrow("big");
  });
  it("each retry lowers the quality, never under the profile's minimum", () => {
    expect(nextQuality(0.82, 400_000, 250_000, 0.5)).toBeLessThan(0.82); expect(nextQuality(0.52, 5_000_000, 250_000, 0.5)).toBe(0.5);
  });
});

describe("the phone and the server agree", () => {
  it("every profile's ceiling and size are inside what upload-media accepts for its kind", () => {
    const pairs: [keyof typeof PROFILES, keyof typeof KINDS][] = [["photo", "post"], ["photo", "support"], ["photo", "inspection"], ["document", "verification"], ["avatar", "avatar"]];
    for (const [p, k] of pairs) { expect(PROFILES[p].hardCap, `${p} → ${k}`).toBeLessThanOrEqual(KINDS[k].maxBytes); expect(PROFILES[p].max, `${p} → ${k}`).toBeLessThanOrEqual(KINDS[k].maxSide); }
    expect(PROFILES.photo.target).toBeLessThanOrEqual(250 * 1024); expect(PROFILES.photo.max).toBe(1600);
  });
  it("a media path becomes its public URL; previews and full URLs pass through", () => {
    expect(mediaUrl("p/x.webp")).toMatch(/\/storage\/v1\/object\/public\/media\/p\/x\.webp$/);
    expect(mediaUrl("data:image/webp;base64,AA")).toBe("data:image/webp;base64,AA"); expect(mediaUrl("https://e/x.png")).toBe("https://e/x.png"); expect(mediaUrl(null)).toBe("");
  });
});

// ---------------------------------------------------------------- the size from the header (no decoding)
// compressImage asks the decoder for the scaled picture directly, so a 50-megapixel photo never sits in the web view's memory
// at full size (the page-process crash on smaller Android phones). These are real encoded files.
const u8 = (b: Buffer) => new Uint8Array(b.buffer, b.byteOffset, b.length);
const pic = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 90, g: 100, b: 110 } } });

describe("reading a photo's size from its header", () => {
  it("JPEG, PNG, GIF and every WebP flavour report their stored size", async () => {
    expect(readHeader(u8(await pic(4000, 3000).jpeg().toBuffer()))).toEqual({ w: 4000, h: 3000, orientation: 1 });
    expect(readHeader(u8(await pic(1234, 567).jpeg({ progressive: true }).toBuffer()))).toMatchObject({ w: 1234, h: 567 });
    expect(readHeader(u8(await pic(800, 600).png().toBuffer()))).toMatchObject({ w: 800, h: 600 });
    expect(readHeader(u8(await pic(321, 123).gif().toBuffer()))).toMatchObject({ w: 321, h: 123 });
    expect(readHeader(u8(await pic(1600, 1200).webp().toBuffer()))).toMatchObject({ w: 1600, h: 1200 });
    expect(readHeader(u8(await pic(300, 200).webp({ lossless: true }).toBuffer()))).toMatchObject({ w: 300, h: 200 });
    expect(readHeader(u8(await pic(640, 480).webp().withMetadata({ exif: { IFD0: { Make: "PhoneCo" } } } as any).toBuffer()))).toMatchObject({ w: 640, h: 480 });
  });
  it("a phone photo held sideways: stored landscape, EXIF orientation 6 → shown portrait", async () => {
    const d = readHeader(u8(await pic(4000, 3000).jpeg().withMetadata({ orientation: 6, exif: { IFD0: { Make: "PhoneCo", Model: "Camera 9" } } } as any).toBuffer()))!;
    expect(d).toEqual({ w: 4000, h: 3000, orientation: 6 }); expect(shownSize(d)).toEqual({ w: 3000, h: 4000 });
    const le = readHeader(u8(await pic(400, 300).jpeg().withMetadata({ orientation: 8 }).toBuffer()))!; expect(le.orientation).toBe(8);
  });
  it("only the first 512 KB is read, and anything unknown is null (the decoder then works it out itself)", async () => {
    const big = await pic(6000, 4500).jpeg({ quality: 100 }).toBuffer();
    expect(await headerSize(new Blob([big as unknown as BlobPart]))).toMatchObject({ w: 6000, h: 4500 });
    expect(readHeader(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/> and some padding to be long enough"))).toBeNull();
    expect(readHeader(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(readHeader(u8(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(64, 0x00)])))).toBeNull();
  });
});
