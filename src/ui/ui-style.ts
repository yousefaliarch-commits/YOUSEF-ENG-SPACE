// =====================================================================
//  The interface style — «كلاسيك» (the flat look the app has always had) or «ناعم» (Soft UI: raised controls, inset fields).
//  It is one attribute on <html> (data-style="soft"); every rule lives in app.css under html[data-style="soft"], built on the
//  same theme tokens, so no screen needs code for it and «كلاسيك» stays byte-for-byte the old look.
//  The choice is per device (like light / dark). The soft-ui preview build starts on «ناعم» so it can be judged on a phone;
//  the default for everyone is decided before this ships.
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

// on import, before the first render, so the app never flashes the other style
paint(current);

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
