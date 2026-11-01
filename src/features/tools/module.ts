// =====================================================================
//  What a document tool provides to the host screens (features/tools/host.tsx), and where each one is loaded from.
//  Every tool is its own lazy chunk: opening the Tools tab downloads none of them.
// =====================================================================
import type { DocSpec } from "../../doc/model";
import type { Workbook } from "../../doc/xlsx";
import type { ProfileSnap, ToolDoc } from "../../data/tool-docs";
import type { ProjectSnap, ToolProject } from "../../data/tool-projects";
import type { ToolRole } from "../../tools/types";
import type { ToolModuleMeta } from "./spec";

// `fill`: a smart form's AI answer replaces the body and (when it brings one) the title in one change
// `spawn`: a new document of the same kind in the same project, opened at once (the next payment certificate…)
export type ToolCtx = {
  app: any; project: ToolProject | null; role: ToolRole; readOnly: boolean;
  fill?: (body: any, title?: string) => void;
  spawn?: (body: any, title: string) => Promise<void>;
};

export type ToolModule<B = any> = ToolModuleMeta & {
  v: number;
  profile: ProfileSnap;
  blank(): B;
  defaultTitle(body: B): string;
  Editor: (p: { body: B; set: (b: B) => void; ctx: ToolCtx }) => any;
  build(doc: ToolDoc<B>, project: ProjectSnap | null): DocSpec;
  summary(doc: ToolDoc<B>): string;
  // a tool-specific Excel workbook (parameter cells, cross-row formulas); without it the export uses the generic specWorkbook
  workbook?(doc: ToolDoc<B>, project: ProjectSnap | null): Workbook;
};

export const TOOL_MODULES: Record<string, () => Promise<ToolModule>> = {
  concrete: () => import("./concrete/concrete").then((m) => m.module),
  bbs: () => import("./rebar/bbs").then((m) => m.module),
  tradeKit: () => import("./trade/trade").then((m) => m.module),
  levelBook: () => import("./survey/level-book").then((m) => m.module),
  siteDiary: () => import("./site/diary").then((m) => m.module),
  toolboxTalk: () => import("./site/toolbox").then((m) => m.module),
  workPermit: () => import("./site/permit").then((m) => m.module),
  acInstall: () => import("./mep/ac-install").then((m) => m.module),
  drainRun: () => import("./mep/drain-run").then((m) => m.module),
  sprinklerCheck: () => import("./mep/sprinkler").then((m) => m.module),
  cableCheck: () => import("./elec/cable").then((m) => m.module),
  rfi: () => import("./office/rfi").then((m) => m.module),
  submittal: () => import("./office/submittal").then((m) => m.module),
  custody: () => import("./office/custody").then((m) => m.module),
  qto: () => import("./office/qto").then((m) => m.module),
  ipc: () => import("./office/ipc").then((m) => m.module),
  rcSection: () => import("./design/rc-section").then((m) => m.module),
  ductSizer: () => import("./mep/duct").then((m) => m.module),
  vo: () => import("./office/vo").then((m) => m.module),
};
