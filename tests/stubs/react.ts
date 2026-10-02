// A render-free React for logic tests: components are plain functions called directly, hooks return their initial values,
// and elements are inspectable objects { $el, type, props: { children: [...] } } — the shape the suites read.
export const Fragment = Symbol("Fragment");
export const createElement = (type, props, ...kids) => {
  if (type == null) throw new Error(`createElement got ${type} (props ${JSON.stringify(props)})`);
  return { $el: true, type, props: { ...(props || {}), children: kids } };
};
export const useState = (i) => [typeof i === "function" ? i() : i, () => {}];
export const useEffect = () => {};
export const useLayoutEffect = () => {};
export const useRef = (v) => ({ current: v });
export const useMemo = (f) => f();
export const useCallback = (f) => f;
export const useContext = (c) => (c ? c._v : undefined);
export const createContext = (d) => { const c: any = { _v: d }; c.Provider = ({ children }) => children; return c; };
export const useSyncExternalStore = (_s, get) => get();
let ids = 0;
export const useId = () => `:r${ids++}:`;
export const forwardRef = (render) => { const C = (props) => render(props, null); C.displayName = render.displayName || render.name; return C; };
export const memo = (c) => c;
export const startTransition = (f) => f();
// lazy components render nothing until loaded; the smoke test loads them all first (__preloadLazy) so it reaches every screen
const lazies: (() => Promise<unknown>)[] = [];
export const lazy = (load) => { let C = null; const L: any = (props) => (C ? { $el: true, type: C, props } : null); L.preload = () => load().then((m) => (C = m.default)); lazies.push(L.preload); return L; };
export const __preloadLazy = () => Promise.all(lazies.map((f) => f()));
export const Suspense = ({ children }) => children;
export class Component { props: any; state: any; constructor(p) { this.props = p; this.state = {}; } setState() {} }
const React = { Fragment, createElement, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, createContext, useSyncExternalStore, useId, forwardRef, memo, startTransition, lazy, Suspense, Component };
export default React;
