// =====================================================================
//  The interface style — «كلاسيك» (the flat look the app has always had) or «ناعم» (Soft UI: raised controls, inset fields).
//  It is one attribute on <html> (data-style="soft"); every rule lives in app.css under html[data-style="soft"], built on the
//  same theme tokens, so no screen needs code for it and «كلاسيك» stays byte-for-byte the old look.
//  The choice is per device (like light / dark). «ناعم» is the default for everyone since v0.41 (docs/SOFT-UI.md); a member who
//  prefers the old look picks «كلاسيك» in Settings → المظهر.
// =====================================================================
import { useSyncExternalStore } from "react";

export type UiStyle = "classic" | "soft";

const KEY = "engspace.style";
export const DEFAULT_STYLE: UiStyle = "soft";

// the base colour each style paints behind the app (status bar / theme-color), per mode
export const BASE_COLOR: Record<UiStyle, Record<"light" | "dark", string>> = {
  classic: { light: "#fafafa", dark: "#09090b" },
  soft: { light: "#e6e9f0", dark: "#23252d" },
};

export function readStyle(raw: string | null | undefined): UiStyle {
  return raw === "classic" || raw === "soft" ? raw : DEFAULT_STYLE;
}

function load(): UiStyle {
  try {
    return readStyle(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_STYLE;
  }
}

let current: UiStyle = load();
const listeners = new Set<() => void>();

function paint(s: UiStyle) {
  try {
    document.documentElement.dataset.style = s;
  } catch {
    /* no document (tests) */
  }
}

// the mode the app will settle on (the same rule as App.tsx: a saved light / dark, else «تلقائي» follows the host page or the
// device) — set on <html> before the first paint, so the page never opens on the dark default and then jumps to the right base
export function earlyMode(saved: string | null, hostTheme: string | undefined, prefersDark: boolean): "light" | "dark" {
  if (saved === "light" || saved === "dark") return saved;
  if (hostTheme === "light" || hostTheme === "dark") return hostTheme;
  return prefersDark ? "dark" : "light";
}

function paintEarly() {
  try {
    const root = document.documentElement;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("engspace.theme");
    } catch {
      saved = null;
    }
    const mode = earlyMode(saved, root.dataset.theme, matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.mode = mode;
    root.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", BASE_COLOR[current][mode]);
  } catch {
    /* no document (tests) */
  }
}

// on import, before the first render, so the app never flashes the other style or the other base colour
paint(current);
paintEarly();

export function uiStyle(): UiStyle {
  return current;
}

export function setUiStyle(s: UiStyle) {
  if (s === current) return;
  current = s;
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* private mode: the choice lasts this session */
  }
  paint(s);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useUiStyle(): UiStyle {
  return useSyncExternalStore(subscribe, uiStyle, uiStyle);
}
