// Back navigation stays instant (v0.1.14): the structure that makes it so is pinned here; e2e/nav-perf.spec.ts measures it (E2E_PERF=1).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const view = readFileSync(new URL("../src/app/AppView.tsx", import.meta.url), "utf8"), css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");

describe("a pushed screen is a layer over the tab", () => {
  it("the tab pane stays laid out under it (covered, not hidden) and the screen has its own scroller layer", () => {
    expect(view).toMatch(/<TabPane key=\{id\} id=\{id\} active=\{id === curTab\} covered=\{!!top\}/); expect(view).toMatch(/data-screen-layer className=\{`pushed screen-layer absolute inset-0/);
  });
  it("«back» never runs a View Transition or a synchronous layout: the layer fades out on the compositor", () => {
    const pop = view.slice(view.indexOf("pop: () => {"), view.indexOf("pop: () => {") + 900);
    expect(pop).not.toMatch(/startViewTransition|nav\("pop"|flushSync|scrollTop/); expect(pop).toMatch(/classList\.add\("is-leaving"\)/);
    expect(css).toMatch(/\.screen-layer\.is-leaving \{ animation: layer-out/); expect(css).toMatch(/@keyframes layer-out \{ to \{ opacity: 0; transform: translate3d/);
  });
  it("returning to the tab restores no scroll position (it never moved) and reads no layout for the header shadow", () => {
    expect(view).toMatch(/back to the tab under the layer: it never moved/); expect(view).toMatch(/reading scrollTop here would force a synchronous layout/);
  });
  it("a tab pane re-renders only when the data it shows changed (store values compared by reference)", () => {
    expect(view).toMatch(/const PaneBody = memo\(.*\(a: any, b: any\) => !b\.active \|\| sameSig\(b\.seen\.current, b\.sig\)\)/);
    for (const k of ["posts", "jobs", "threads", "notifs", "profile", "saved", "mod", "inspections"]) expect(view).toMatch(new RegExp(`PANE_KEYS = \\[[^\\]]*"${k}"`));
  });
  it("swipe-back follows the finger with inline transforms, never React state per move", () => {
    const move = view.slice(view.indexOf("const onTouchMove"), view.indexOf("const onTouchEnd"));
    expect(move).toMatch(/el\.style\.transform = `translate3d\(/); expect(move).not.toMatch(/set[A-Z][a-zA-Z]*\(/);
  });
  it("reduced motion: no layer animation", () => { expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.screen-layer, \.screen-layer\.is-leaving \{ animation: none/); });
});
