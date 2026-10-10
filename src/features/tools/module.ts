// =====================================================================
//  What a document tool provides to the host screens (features/tools/host.tsx), and where each one is loaded from.
//  Every tool is its own lazy chunk: opening the Tools tab downloads none of them.
// =====================================================================
import type { DocSpec } from "../../doc/model";
import type { ProfileSnap, ToolDoc } from "../../data/tool-docs";
import type { ProjectSnap, ToolProject } from "../../data/tool-projects";
import type { ToolRole } from "../../tools/types";
import type { ToolModuleMeta } from "./spec";

export type ToolCtx = { app: any; project: ToolProject | null; role: ToolRole; readOnly: boolean };

export type ToolModule<B = any> = ToolModuleMeta & {
  v: number;
  profile: ProfileSnap;
  blank(): B;
  defaultTitle(body: B): string;
  Editor: (p: { body: B; set: (b: B) => void; ctx: ToolCtx }) => any;
  build(doc: ToolDoc<B>, project: ProjectSnap | null): DocSpec;
  summary(doc: ToolDoc<B>): string;
};

export const TOOL_MODULES: Record<string, () => Promise<ToolModule>> = {
  concrete: () => import("./concrete/concrete").then((m) => m.module),
  bbs: () => import("./rebar/bbs").then((m) => m.module),
  tradeKit: () => import("./trade/trade").then((m) => m.module),
  levelBook: () => import("./survey/level-book").then((m) => m.module),
};
