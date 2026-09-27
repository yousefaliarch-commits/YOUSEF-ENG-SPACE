// Page globals for logic tests (Node has no window/document). Storage is a plain object the suites can inspect; it lives on
// globalThis so the setup file and the harness share one instance.
const g: any = globalThis;
export const store: Record<string, string> = g.__testStore || (g.__testStore = {});
export const localStorage = { getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: unknown) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; } };
const matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const define = (name: string, value: unknown) => Object.defineProperty(g, name, { value, configurable: true, writable: true });
define("localStorage", localStorage);
define("window", { addEventListener() {}, removeEventListener() {}, matchMedia, innerWidth: 390, innerHeight: 844 });
define("document", { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: { setProperty() {} }, lang: "ar", dir: "rtl" }, baseURI: "http://localhost/" });
define("location", { hash: "", search: "", href: "http://localhost/", origin: "http://localhost", reload() {} });
define("history", { replaceState() {} });
define("navigator", { clipboard: { writeText: async () => {} }, userAgent: "node", language: "ar-EG" });
define("matchMedia", matchMedia);
define("innerWidth", 390); define("innerHeight", 844);
define("requestAnimationFrame", () => 0); define("cancelAnimationFrame", () => {});
