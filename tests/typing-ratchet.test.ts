// The typing ratchet (scripts/strict-check.mjs): strict TypeScript and no explicit `any` wherever the code is ready, and
// never less than before. The check itself runs in `npm run typecheck` (CI); this pins that it stays wired in and that
// the modules written strict stay out of the list of files still to clean.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies: Record<string, string> };
const base = JSON.parse(read("scripts/strict-baseline.json")) as { strict: Record<string, number>; any: Record<string, number> };

describe("the typing ratchet is part of the CI gate", () => {
  it("`npm run typecheck` (and so `npm run check`) runs it", () => {
    expect(pkg.scripts.typecheck).toContain("node scripts/strict-check.mjs");
    expect(pkg.scripts.check).toContain("npm run typecheck");
    expect(pkg.scripts["strict:update"]).toBe("node scripts/strict-check.mjs --update");
  });
  it("the baseline is a list of counts, sorted, with nothing at zero", () => {
    for (const kind of ["strict", "any"] as const) {
      const files = Object.keys(base[kind]);
      expect(files).toEqual([...files].sort());
      for (const f of files) {
        expect(f.startsWith("src/"), f).toBe(true);
        expect(base[kind][f], f).toBeGreaterThan(0);
      }
    }
  });
  it("a file missing from the baseline must be clean — the script says so, and fails the build otherwise", () => {
    const script = read("scripts/strict-check.mjs");
    expect(script).toContain("this file is not in the baseline, so it must have none");
    expect(script).toContain("process.exit(1)");
    expect(script).toContain('"--strict", "--noImplicitAny", "true", "--strictNullChecks", "true"');
    expect(script).toContain("TSAnyKeyword");
  });
});

describe("what is already strict stays strict", () => {
  const clean = (prefix: string) => Object.keys({ ...base.strict, ...base.any }).filter((f) => f.startsWith(prefix));
  it("the engines, the document kit, the tool registry and the phone glue have no strict-mode error", () => {
    for (const dir of ["src/domain/tools/", "src/doc/", "src/tools/", "src/native/"]) expect(Object.keys(base.strict).filter((f) => f.startsWith(dir)), dir).toEqual([]);
  });
  it("the workstation's modules are strict and free of `any`: none of them is in the baseline", () => {
    for (const f of [
      "src/ui/roll.tsx", "src/ui/drafting.tsx", "src/ui/draft-geometry.ts", "src/ui/portal.ts", "src/data/doc-controls.ts", "src/data/tool-templates.ts",
      "src/data/template-file.ts", "src/features/tools/doc-settings.tsx", "src/features/tools/templates.tsx", "src/tools/palette.ts", "src/app/palette.tsx",
      "src/app/palette-panel.tsx", "src/app/entry.ts",
    ]) {
      expect(base.strict[f], f).toBeUndefined();
      expect(base.any[f], f).toBeUndefined();
    }
    expect(clean("src/features/landing/")).toEqual([]);
  });
});

describe("dependencies", () => {
  it("validation of outside files is done by a pinned, maintained library — loaded only where a file is imported", () => {
    expect(pkg.dependencies.zod).toMatch(/^\d+\.\d+\.\d+$/);
    const users = ["src/data/template-file.ts"];
    for (const f of users) expect(read(f)).toContain('from "zod/mini"');
    // the importer reaches it through a dynamic import, so zod is not in the app's first load
    expect(read("src/features/tools/templates.tsx")).toContain('await import("../../data/template-file")');
    expect(read("src/features/tools/templates.tsx")).not.toMatch(/^import .* from "\.\.\/\.\.\/data\/template-file"/m);
  });
});
