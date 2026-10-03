// The update banner: only when a downloaded update is ready; «تحديث الآن» applies it after about a second; ✕ hides it for the session.
import { afterEach, describe, expect, it, vi } from "vitest";

let current: any; const apply = vi.fn();
vi.mock("../src/native/updater", () => ({ otaState: () => current, onOtaState: () => () => {}, applyUpdateNow: () => apply() }));
const { UpdateBanner } = await import("../src/ui/update-banner");

const flat = (n: any): string => (typeof n === "string" ? n : typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(flat).join("") : n && n.props ? flat(n.props.children) : "");
const find = (n: any, pred: (x: any) => boolean, out: any[] = []): any[] => { if (Array.isArray(n)) n.forEach((c) => find(c, pred, out)); else if (n && typeof n === "object") { if (pred(n)) out.push(n); if (n.props) find(n.props.children, pred, out); } return out; };
const ready = { supported: true, bundle: "0.25.0", builtin: true, native: "1.1", running: 1, status: "ready", pending: { id: "b1", version: "0.25.0-9" } };
afterEach(() => { vi.useRealTimers(); apply.mockReset(); });

describe("UpdateBanner", () => {
  it("shows nothing unless an update is downloaded and ready", () => { for (const status of ["idle", "checking", "downloading", "current", "failed", "incompatible"]) { current = { ...ready, status }; expect(UpdateBanner()).toBeNull(); } current = { ...ready, pending: undefined }; expect(UpdateBanner()).toBeNull(); });
  it("says what the owner asked, with an update button and a dismiss button", () => {
    current = ready; const b = UpdateBanner(); expect(flat(b)).toContain("يتوفر تحديث جديد للمنصة لتحسين الأداء"); expect(flat(b)).toContain("تحديث الآن");
    expect(find(b, (x) => x.props && x.props["aria-label"] === "إغلاق")).toHaveLength(1); expect(b.props["data-update-banner"]).toBeDefined();
  });
  it("«تحديث الآن» applies the bundle after under a second and a half — not before", () => {
    vi.useFakeTimers(); current = ready; const b = UpdateBanner(); const btn = find(b, (x) => x.type === "button" && flat(x.props.children) === "تحديث الآن")[0];
    btn.props.onClick(); vi.advanceTimersByTime(500); expect(apply).not.toHaveBeenCalled(); vi.advanceTimersByTime(1000); expect(apply).toHaveBeenCalledTimes(1);
  });
  it("does not block: no overlay, no dialog role, a status region only", () => { current = ready; const b = UpdateBanner(); expect(b.props.role).toBe("status"); expect(find(b, (x) => x.props && x.props.role === "dialog")).toHaveLength(0); });
});
