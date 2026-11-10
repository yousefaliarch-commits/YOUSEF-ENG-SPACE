// =====================================================================
//  The command palette's host — always mounted with the member app, costs nothing until used:
//  · Ctrl K / ⌘K anywhere toggles it; the sidebar's «بحث وأوامر» button and `openPalette()` open it (an event, so any
//    screen can ask without a prop passed through the tree).
//  · The index (tools/palette.ts) is built at the moment it opens, from the role, the tabs, the document index and the
//    projects the app already holds; the dialog itself (palette-panel.tsx) is a chunk loaded on first use.
// =====================================================================
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { paletteItems, paletteKeys, type PaletteAction, type PaletteContext, type PaletteItem } from "../tools/palette";

const PalettePanel = lazy(() => import("./palette-panel").then((m) => ({ default: m.PalettePanel })));

const EVENT = "engspace:palette";
export const openPalette = () => {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* no window (tests): nothing to open */
  }
};

// the shortcut: Ctrl K or ⌘K, with no other modifier (Ctrl Shift K belongs to the browser)
export const isPaletteKey = (e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }) =>
  (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";

export const paletteHint = () => paletteKeys(typeof navigator !== "undefined" ? navigator.platform || navigator.userAgent || "" : "");

export function PaletteHost({ context, onRun }: { context: () => PaletteContext; onRun: (a: PaletteAction) => void }) {
  const [items, setItems] = useState<PaletteItem[] | null>(null);
  // the listeners are installed once; they read the app's latest state through this ref
  const latest = useRef({ context, onRun });
  latest.current = { context, onRun };
  useEffect(() => {
    const open = () => setItems(paletteItems(latest.current.context()));
    const key = (e: KeyboardEvent) => {
      if (!isPaletteKey(e)) return;
      e.preventDefault();
      setItems((cur) => (cur ? null : paletteItems(latest.current.context())));
    };
    window.addEventListener(EVENT, open);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener(EVENT, open);
      window.removeEventListener("keydown", key);
    };
  }, []);
  if (!items) return null;
  return (
    <Suspense fallback={null}>
      <PalettePanel items={items} keys={paletteHint()} onRun={(a) => latest.current.onRun(a)} onClose={() => setItems(null)} />
    </Suspense>
  );
}
