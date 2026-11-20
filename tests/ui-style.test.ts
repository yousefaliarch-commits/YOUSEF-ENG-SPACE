import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BASE_COLOR, DEFAULT_STYLE, earlyMode, readStyle } from "../src/ui/ui-style";

// split a selector list on its top-level commas only (not the ones inside :is(…) / :has(…))
function topLevel(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

describe("interface style (classic | soft)", () => {
  it("reads a saved choice and falls back to the default for anything else", () => {
    expect(readStyle("classic")).toBe("classic");
    expect(readStyle("soft")).toBe("soft");
    expect(readStyle(null)).toBe(DEFAULT_STYLE);
    expect(readStyle("neon")).toBe(DEFAULT_STYLE);
  });

  it("opens on the mode the app will settle on (saved choice, then the host page, then the device)", () => {
    expect(earlyMode("light", undefined, true)).toBe("light");
    expect(earlyMode("dark", "light", false)).toBe("dark");
    expect(earlyMode("system", "light", true)).toBe("light");
    expect(earlyMode(null, undefined, true)).toBe("dark");
    expect(earlyMode(null, undefined, false)).toBe("light");
  });

  it("paints a base colour for each style and mode", () => {
    expect(BASE_COLOR.classic).toEqual({ light: "#fafafa", dark: "#09090b" });
    expect(BASE_COLOR.soft.light).toMatch(/^#[0-9a-f]{6}$/);
    expect(BASE_COLOR.soft.dark).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("index.html's first-paint script uses the same default and base colours as ui-style.ts", () => {
    const html = readFileSync("index.html", "utf8");
    const script = html.slice(html.indexOf("first paint"), html.indexOf("</script>"));
    expect(script).toContain(`: "${DEFAULT_STYLE}"`);
    for (const st of ["classic", "soft"] as const) {
      for (const m of ["light", "dark"] as const) expect(script).toContain(`${m}: "${BASE_COLOR[st][m]}"`);
    }
    expect(script).toContain('"engspace.style"');
    expect(script).toContain('"engspace.theme"');
  });

  it("keeps every soft rule behind html[data-style=soft] and never animates a shadow", () => {
    const css = readFileSync("src/styles/app.css", "utf8");
    const start = css.indexOf("/* ---- «ناعم»");
    expect(start).toBeGreaterThan(0);
    // the block ends where the next commented section starts
    const end = css.indexOf("/* a pushed screen", start);
    const soft = css.slice(start, end > start ? end : undefined);
    const rules = soft.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((r) => r.trim()).filter((r) => r.includes("{"));
    for (const r of rules) {
      const selectors = r.slice(0, r.indexOf("{"));
      for (const sel of topLevel(selectors)) expect(sel.trim()).toMatch(/^html\[data-style="soft"\]/);
      expect(r).not.toMatch(/transition[^;]*box-shadow|animation/);
    }
  });
});
