// =====================================================================
//  The omnisearch's dialog (loaded on first use — app/palette.tsx owns the shortcut and the open state).
//  · One text field, one list: ↑ ↓ move, Enter opens, Esc closes, Tab / Shift Tab move between the category tabs (الكل · الأدوات ·
//    المستندات · المجتمع · الوظائف · الشركات — each shows how many matches it holds); the pointer and touch work the same list.
//  · A combobox over a listbox (aria-activedescendant): focus never leaves the field, so a screen reader hears the
//    highlighted option and Tab cannot wander into the page behind.
//  · Tool names are interface text (English comes from the dictionary); document and project titles are the member's
//    own words and are shown as typed.
// =====================================================================
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Briefcase, Building2, CornerDownLeft, FilePlus2, FileText, FolderOpen, MessageSquare, Search, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PALETTE_CATEGORIES, PALETTE_GROUPS, categoryCounts, searchPalette, type PaletteAction, type PaletteCategory, type PaletteGroup, type PaletteItem } from "../tools/palette";
import { TOOL_ICONS } from "../features/tools/icons";
import { portalHost } from "../ui/portal";

type Icon = LucideIcon;
const GROUP_ICON: Record<PaletteGroup, Icon> = {
  recent: FileText, tools: SlidersHorizontal, new: FilePlus2, docs: FileText, posts: MessageSquare, jobs: Briefcase, companies: Building2,
  go: ArrowLeftRight, projects: FolderOpen, actions: SlidersHorizontal,
};
const iconOf = (item: PaletteItem): Icon => {
  if (item.group === "new") return FilePlus2;
  const named = item.icon ? (TOOL_ICONS[item.icon] as Icon | undefined) : undefined;
  return (item.group === "tools" && named) || GROUP_ICON[item.group];
};

export function PalettePanel({ items, keys, onRun, onClose }: { items: PaletteItem[]; keys: string; onRun: (a: PaletteAction) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState<PaletteCategory>("all");
  const input = useRef<HTMLInputElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const results = useMemo(() => searchPalette(items, q, 40, category), [items, q, category]);
  const counts = useMemo(() => categoryCounts(items, q), [items, q]);
  // only the tabs that have something in them for this member (a supervisor has no jobs or companies)
  const tabs = PALETTE_CATEGORIES.filter((c) => c.id === "all" || items.some((i) => c.groups.includes(i.group)));
  const pick = (id: PaletteCategory) => {
    setCategory(id);
    setActive(0);
  };
  const at = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    input.current?.focus();
    // closing hands the focus back to whatever opened the palette
    return () => {
      try {
        before?.focus?.();
      } catch {
        /* the opener is gone: nothing to return to */
      }
    };
  }, []);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-palette-index="${at}"]`)?.scrollIntoView({ block: "nearest" });
  }, [at, results]);

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    onRun(item.run);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(n ? (at + 1) % n : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(n ? (at - 1 + n) % n : 0);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, n - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[at]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // the field is the one control; Tab walks the category tabs instead of leaving the dialog
      e.preventDefault();
      const at = tabs.findIndex((c) => c.id === category);
      pick(tabs[(at + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length].id);
    }
  };

  const node = (
    <div className="palette-scrim fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[max(4.5rem,10vh)] bg-black/45" data-palette onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="بحث وأوامر" className="palette-in w-full max-w-[640px] overflow-hidden rounded-2xl bg-elevated border border-line-2 shadow-float">
        <label className="flex items-center gap-3 h-14 px-4 border-b border-line">
          <Search size={18} className="shrink-0 text-ink-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[at] ? `palette-opt-${at}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            dir="auto"
            placeholder="ابحث عن أداة أو مستند أو مشروع…"
            className="w-full min-w-0 bg-transparent text-[16px] text-ink placeholder:text-ink-4 focus:outline-none"
            data-palette-input
          />
          <kbd className="shrink-0 hidden sm:inline-flex h-6 px-1.5 items-center rounded-md border border-line-2 font-grotesk text-[11px] text-ink-3" dir="ltr">Esc</kbd>
        </label>
        <div role="tablist" aria-label="أقسام النتائج" className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-line" data-palette-tabs>
          {tabs.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              tabIndex={-1}
              aria-selected={category === c.id}
              data-palette-tab={c.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[12.5px] transition-colors ${category === c.id ? "bg-wash border-accent/40 text-ink" : "bg-surface border-line-2 text-ink-2 hover:text-ink"}`}
            >
              {c.label}
              {q.trim() && <span className="font-grotesk text-[11px] text-ink-3" dir="ltr">{counts[c.id]}</span>}
            </button>
          ))}
        </div>
        <div ref={list} id="palette-list" role="listbox" aria-label="النتائج" className="max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain p-2">
          {!results.length && <p className="px-3 py-8 text-center text-[13px] text-ink-3" data-palette-empty>لا نتيجة — جرّب اسم الأداة أو رقم المستند أو المبنى.</p>}
          {results.map((item, i) => {
            const Icon = iconOf(item);
            const head = i === 0 || results[i - 1].group !== item.group;
            return (
              <div key={item.id}>
                {head && <p className="px-3 pt-2.5 pb-1 text-[11px] text-ink-3" role="presentation">{PALETTE_GROUPS[item.group]}</p>}
                <div
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === at}
                  data-palette-index={i}
                  data-palette-item={item.id}
                  onMouseMove={() => i !== at && setActive(i)}
                  onClick={() => run(item)}
                  className={`flex items-center gap-3 min-h-12 px-3 py-1.5 rounded-xl cursor-pointer ${i === at ? "bg-wash" : ""}`}
                >
                  <span className={`grid place-items-center w-9 h-9 shrink-0 rounded-lg ${i === at ? "bg-accent text-on-accent" : "bg-surface text-ink-2"}`}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] leading-snug" {...(item.ugc ? { translate: "no", dir: "auto" } : {})}>{item.title}</span>
                    {item.sub && <span className="block truncate text-[11.5px] text-ink-3" {...(item.ugc ? {} : { dir: "auto" })}>{item.sub}</span>}
                  </span>
                  <span className="shrink-0 flex flex-col items-end gap-1">
                    {item.badge && <span className="h-5 px-2 inline-flex items-center rounded-full bg-surface border border-line-2 text-[10.5px] text-ink-2" data-palette-badge>{item.badge}</span>}
                    {item.when && <span className="text-[10.5px] text-ink-3" dir="auto">{item.when}</span>}
                  </span>
                  {i === at && <CornerDownLeft size={15} className="shrink-0 text-ink-3 rtl:-scale-x-100" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 h-10 px-4 border-t border-line text-[11px] text-ink-3">
          <span><kbd className="font-grotesk" dir="ltr">↑ ↓</kbd> للتنقل</span>
          <span><kbd className="font-grotesk" dir="ltr">Enter</kbd> للفتح</span>
          <span><kbd className="font-grotesk" dir="ltr">Tab</kbd> للأقسام</span>
          <span className="ms-auto"><kbd className="font-grotesk" dir="ltr">{keys}</kbd> في أي وقت</span>
        </div>
      </div>
    </div>
  );
  const host = portalHost();
  return host ? createPortal(node, host) : node;
}
