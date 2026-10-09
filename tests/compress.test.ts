// The on-device compression loop (src/lib/compress.ts) and its agreement with the server's limits.
import { describe, expect, it } from "vitest";
import { PROFILES, fit, nextQuality } from "../src/lib/compress";
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
