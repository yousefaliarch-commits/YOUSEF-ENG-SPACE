// Per-account copies on this device for private member data that must work without signal (salary history…).
// Keyed by account, so a shared phone never shows one member's data to another.
const KEY = (name: string, owner?: any) => `engspace.${name}.v1${owner ? "." + owner : ""}`;
export const loadDevice = (name: string, owner?: any, fallback: any = null) => { try { const v = localStorage.getItem(KEY(name, owner)); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
export const storeDevice = (name: string, owner: any, value: any) => { try { localStorage.setItem(KEY(name, owner), JSON.stringify(value)); } catch (e) { /* storage full or blocked: the in-memory copy still works */ } };
