// =====================================================================
//  Tool registry types — pure data, no React, no lucide (icons are names, mapped in the Tools tab), so taxonomy.ts can
//  import the registry without a cycle. One explicit role allow-list per tool; money tools never open for supervisors.
//  See docs/TOOLS-BLUEPRINT.md §5e.
// =====================================================================

export type ToolPack =
  | "structural" | "rebar" | "survey" | "quantities" | "office" | "mechanical" | "electrical"
  | "architecture" | "hse" | "workforce" | "money";

export type ToolRole = "engineer" | "owner" | "supervisor" | "hr";

export type ToolDef = {
  id: string;                  // camelCase letters only
  pack: ToolPack;
  name: string;                // Arabic (English comes from the dictionary)
  desc: string;
  icon: string;                // lucide icon name
  keywords: string;            // Arabic + English search words
  roles: ToolRole[];           // explicit allow-list; "hr" appears only on cvreview
  money: boolean;              // true ⇒ never "supervisor" (a test enforces it)
  surface: "screen" | "sheet"; // the salary tools stay sheets; everything new is a pushed screen
  wave: 1 | 2 | 3;
  status: "live" | "beta" | "soon";
  docKinds?: string[];
  aliases?: string[];          // rebar → bbs, masonry → tradeKit
  disciplines?: string[];      // floats the pack up for members of that discipline
};
