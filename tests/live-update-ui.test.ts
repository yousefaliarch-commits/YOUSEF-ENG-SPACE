// Settings → التحديثات الفورية: what the member sees for each updater state (rendered through the stub React).
import { describe, expect, it, vi } from "vitest";

let current: any;
vi.mock("../src/native/updater", () => ({ otaState: () => current, onOtaState: () => () => {}, checkForUpdate: vi.fn(), applyUpdateNow: vi.fn() }));
const { LiveUpdate } = await import("../src/features/settings/settings");

const flat = (n: any): string => (typeof n === "string" ? n : typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(flat).join("") : n && n.props ? flat(n.props.children) : "");
const find = (n: any, pred: (x: any) => boolean, out: any[] = []): any[] => { if (Array.isArray(n)) n.forEach((c) => find(c, pred, out)); else if (n && typeof n === "object") { if (pred(n)) out.push(n); if (n.props) find(n.props.children, pred, out); } return out; };
const base = { supported: true, bundle: "0.25.0", builtin: true, native: "1.9", running: 1, status: "idle" };

describe("LiveUpdate (Settings)", () => {
  it("shows nothing on the web (no updater)", () => { current = { ...base, supported: false }; expect(LiveUpdate()).toBeNull(); });
  it("shows the bundle version and that it is built in", () => { current = base; const t = flat(LiveUpdate()); expect(t).toContain("0.25.0"); expect(t).toContain("مدمجة في التطبيق"); expect(t).toContain("لم يُفحص بعد"); });
  it("a downloaded bundle is called updated over the internet", () => { current = { ...base, builtin: false, bundle: "0.25.0-2000", status: "current" }; const t = flat(LiveUpdate()); expect(t).toContain("0.25.0-2000"); expect(t).toContain("محدَّثة عبر الإنترنت"); expect(t).toContain("أنت على أحدث إصدار بالفعل"); });
  it("a ready update offers «apply now»; otherwise only the check button", () => {
    current = { ...base, status: "ready", pending: { id: "b1", version: "0.25.0-3000" } }; let t = flat(LiveUpdate()); expect(t).toContain("طبّق الآن"); expect(t).toContain("0.25.0-3000");
    current = base; t = flat(LiveUpdate()); expect(t).not.toContain("طبّق الآن"); expect(t).toContain("تحقّق من التحديث");
  });
  it("the check button is disabled while a check or download runs", () => {
    for (const status of ["checking", "downloading"]) { current = { ...base, status }; const b = find(LiveUpdate(), (x) => x.props && x.props.disabled !== undefined && flat(x.props.children).includes("تحقّق")); expect(b[0].props.disabled).toBe(true); }
    current = base; expect(find(LiveUpdate(), (x) => x.props && x.props.disabled !== undefined && flat(x.props.children).includes("تحقّق"))[0].props.disabled).toBe(false);
  });
  it("says so when the plugin rolled a bundle back", () => { current = { ...base, rolledBack: "0.25.0-1" }; const t = flat(LiveUpdate()); expect(t).toContain("تراجع التطبيق تلقائيًا"); expect(t).toContain("0.25.0-1"); });
  it("says a new install is needed when the bundle is for another native line", () => { current = { ...base, status: "incompatible" }; expect(flat(LiveUpdate())).toContain("يلزم تثبيت نسخة جديدة"); });
});

describe("LiveUpdate diagnostics line", () => {
  it("shows the shell version and whether the native updater is linked", () => {
    current = { ...base, native: "1.13", plugin: true }; expect(flat(LiveUpdate())).toContain("shell 1.13 · updater linked");
    current = { ...base, native: "1.13", plugin: false }; expect(flat(LiveUpdate())).toContain("updater missing");
  });
});
