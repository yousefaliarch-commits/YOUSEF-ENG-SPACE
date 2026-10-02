import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

// =====================================================================
//  Live preview runtime
//  App state lives in small external stores kept on window.__LIVE, outside the React tree, so a hot
//  code update (re-running this whole script) remounts the UI while every device keeps its screen,
//  persona and data. The same stores let the two device mockups mirror each other: both subscribe
//  to the "shared" store, so a tap on the iPhone is a tap on the Pixel.
// =====================================================================
export const liveState = () => {
  const w: any = typeof window !== "undefined" ? window : {};
  if (!w.__LIVE) w.__LIVE = { stores: {}, root: null, src: null, draft: null, lastGood: null, updates: 0, log: [], panel: null, auto: true, mirror: true, zoom: "fit", devMode: { ios: "follow", android: "follow" }, design: null, startedAt: Date.now() };
  return w.__LIVE;
};

export function createStore() {
  const state = new Map(); const subs = new Set<() => void>(); let version = 0;
  const emit = () => { version++; subs.forEach((f) => { try { f(); } catch (e) {} }); };
  return {
    has: (k?: any) => state.has(k),
    get: (k?: any, init?: any) => { if (!state.has(k)) state.set(k, typeof init === "function" ? init() : init); return state.get(k); },
    set: (k?: any, v?: any) => { const prev = state.get(k); const next = typeof v === "function" ? v(prev) : v; if (Object.is(prev, next)) return; state.set(k, next); emit(); },
    subscribe: (f?: any) => { subs.add(f); return () => subs.delete(f); },
    snapshot: () => Object.fromEntries(state), load: (obj?: any) => { state.clear(); Object.entries(obj || {}).forEach(([k, v]: any) => state.set(k, v)); emit(); },
    reset: () => { state.clear(); emit(); }, get version() { return version; }, get size() { return state.size; },
  };
}

export const storeFor = (id?: any) => { const L = liveState(); if (!L.stores[id]) L.stores[id] = createStore(); return L.stores[id]; };

// Drop-in replacement for useState whose value lives in a store (falls back to a private store when none is given)
// read a store key without writing it (the top bar and the admin console watch the signed-in member this way)
export function usePeek(store?: any, key?: any, fallback?: any) { const get = () => (store.has(key) ? store.get(key) : fallback); return useSyncExternalStore(store.subscribe, get, get); }

export function useStore(store?: any, key?: any, init?: any) {
  const get = () => store.get(key, init);
  const value = useSyncExternalStore(store.subscribe, get, get);
  const set = useCallback((next) => store.set(key, next), [store, key]);
  return [value, set];
}

// Which device the app is rendered inside: "ios" | "android" | "web". A few chrome details adapt (back glyph, tab bar, sheets, switches).
export const PlatformCtx = createContext<any>("web");

// light / dark as the surrounding screen renders it (each phone in the device previews can differ from the page)
export const ModeCtx = createContext<any>("dark");

export const useMode = () => useContext(ModeCtx) || "dark";

export const usePlatform = () => useContext(PlatformCtx) || "web";


// ---- helpers ------------------------------------------------------------
export const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };


// ---- motion hooks ---------------------------------------------------------
export const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
