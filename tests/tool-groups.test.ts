// v0.40 — the tools are organised by professional discipline, the same way on the phone, on the desktop and on the public page.
import { describe, expect, it } from "vitest";
import { GROUPS, TOOL_REGISTRY } from "../src/tools/registry";
import { toolsForRole } from "../src/tools/gate";
import { TOOL_MODULES } from "../src/features/tools/module";

describe("every tool is in exactly one discipline", () => {
  it("the five working disciplines, then the salary tools", () => {
    expect(GROUPS.map((g) => g.id)).toEqual(["site", "office", "design", "hse", "management", "money"]);
    for (const g of GROUPS) expect(g.name && g.desc, g.id).toBeTruthy();
  });
  it("each tool names a known group, and only the salary tools are «money»", () => {
    const ids = new Set(GROUPS.map((g) => g.id));
    for (const t of TOOL_REGISTRY) {
      expect(ids.has(t.group), t.id).toBe(true);
      expect(t.group === "money", t.id).toBe(t.pack === "money" && t.money);
    }
  });
  it("the document tools sit where an engineer looks for them", () => {
    const g = (id: string) => TOOL_REGISTRY.find((t) => t.id === id)!.group;
    for (const id of ["tradeKit", "concrete", "bbs", "levelBook", "acInstall", "drainRun"]) expect(g(id), id).toBe("site");
    for (const id of ["qto", "ipc", "vo", "rfi", "submittal"]) expect(g(id), id).toBe("office");
    for (const id of ["rcSection", "ductSizer", "cableCheck", "sprinklerCheck"]) expect(g(id), id).toBe("design");
    for (const id of ["toolboxTalk", "workPermit", "checklists"]) expect(g(id), id).toBe("hse");
    for (const id of ["siteDiary", "custody"]) expect(g(id), id).toBe("management");
  });
  it("every document tool with an editor is grouped (a new tool without a group would fall to «management» silently — this says so)", () => {
    const explicit = new Set(["tradeKit", "concrete", "bbs", "levelBook", "units", "acInstall", "drainRun", "qto", "ipc", "vo", "rfi", "submittal", "rcSection", "ductSizer", "cableCheck", "sprinklerCheck", "toolboxTalk", "workPermit", "checklists", "siteDiary", "custody"]);
    for (const kind of Object.keys(TOOL_MODULES)) expect(explicit.has(kind), `${kind} needs a group in tools/registry.ts GROUP_OF`).toBe(true);
    for (const t of TOOL_REGISTRY.filter((x) => x.pack !== "money")) expect(explicit.has(t.id), t.id).toBe(true);
  });
  it("a supervisor's disciplines hold no money tool and an HR account's hold none at all", () => {
    expect(toolsForRole("supervisor").some((t) => t.money)).toBe(false);
    expect(toolsForRole("hr")).toEqual([]);
    const groups = new Set(toolsForRole("supervisor").map((t) => t.group));
    expect(groups.has("money")).toBe(false);
    // the technical office still opens for a supervisor, minus the certificate and the variation order
    expect(toolsForRole("supervisor").filter((t) => t.group === "office").map((t) => t.id).sort()).toEqual(["qto", "rfi", "submittal"]);
  });
});
