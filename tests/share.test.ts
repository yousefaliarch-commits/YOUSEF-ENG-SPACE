// Sharing: the link, the preview text, and the chain share sheet → browser share → clipboard.
import { afterEach, describe, expect, it, vi } from "vitest";
import { linkFor, parseOpenLink, snippet } from "../src/lib/share";
import { shareContent } from "../src/native/native";

describe("share links", () => {
  it("web: the page address with the hash route", () => {
    expect(linkFor("post", "p1", { page: "https://x.test/app/" })).toBe("https://x.test/app/#app/post/p1");
  });
  it("phone app without a public address: the app link", () => {
    expect(linkFor("job", "j-9", { native: true, page: "https://localhost/" })).toBe("app.engspace://open/job/j-9");
  });
  it("a public address wins everywhere", () => {
    expect(linkFor("company", "ab c", { native: true, publicUrl: "https://engspace.example/" })).toBe("https://engspace.example/#app/company/ab%20c");
  });
  it("round trip, and nothing else opens", () => {
    for (const url of [linkFor("post", "7c19818f-1f8e-4f16", { native: true }), linkFor("room", "tech", { page: "https://x.test/" })]) expect(parseOpenLink(url)).not.toBeNull();
    expect(parseOpenLink("app.engspace://open/post/7c19818f-1f8e-4f16")).toEqual({ type: "post", id: "7c19818f-1f8e-4f16" });
    expect(parseOpenLink("app.engspace://auth-callback#access_token=x")).toBeNull();
    expect(parseOpenLink("app.engspace://open/admin/1")).toBeNull();
    expect(parseOpenLink("app.engspace://open/post/../../x")).toBeNull();
    expect(parseOpenLink("app.engspace://open/post/%3Cscript%3E")).toBeNull();
    expect(parseOpenLink(null)).toBeNull();
  });
  it("preview text: one line, whole words, short", () => {
    expect(snippet("  سطر\n\nثانٍ  ")).toBe("سطر ثانٍ");
    const long = "كلمة ".repeat(60); const s = snippet(long, 50); expect(s.length).toBeLessThanOrEqual(51); expect(s.endsWith("…")).toBe(true);
  });
});

describe("share chain", () => {
  const c = { title: "منشور على EngSpace", text: "نص", url: "app.engspace://open/post/p1" };
  afterEach(() => vi.unstubAllGlobals());
  it("uses the browser's share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined); vi.stubGlobal("navigator", { share });
    expect(await shareContent(c)).toBe("shared"); expect(share).toHaveBeenCalledWith({ title: c.title, text: c.text, url: c.url });
  });
  it("closing the sheet is not an error and does not copy", async () => {
    const writeText = vi.fn(); vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" })), clipboard: { writeText } });
    expect(await shareContent(c)).toBe("cancelled"); expect(writeText).not.toHaveBeenCalled();
  });
  it("copies the link when no share sheet exists", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareContent(c)).toBe("copied"); expect(writeText).toHaveBeenCalledWith(c.url);
  });
  it("copies when the share sheet fails for another reason", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new Error("NotAllowedError")), clipboard: { writeText } });
    expect(await shareContent(c)).toBe("copied");
  });
  it("says so when nothing works", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    expect(await shareContent(c)).toBe("failed");
  });
});
