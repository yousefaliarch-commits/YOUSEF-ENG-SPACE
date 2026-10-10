// =====================================================================
//  Projects — one profile per project, typed once, reused by every tool's title block (خرطوشة)
//  · No money field by design: contract sums and rates live only in money-tool documents, so site supervisors can create
//    and edit projects freely.
//  · Issuing a document freezes a ProjectSnap into it: editing the project later never changes an issued PDF.
//  · member_state key "toolProjects". See docs/TOOLS-BLUEPRINT.md §5b.
// =====================================================================
import type { LogoRef } from "../doc/model";

export type ToolParty = { name: string; nameEn?: string; rep?: string; logo?: LogoRef };

export type SignRole = "prepared" | "checked" | "approved" | "contractorRep" | "consultantRep" | "siteEngineer" | "hseOfficer";

export type ToolProject = {
  id: string;
  at: number;
  deleted?: true;
  archived?: boolean;
  code: string;                 // 2–8 chars [A-Z0-9], used in document numbers
  name: string;
  nameEn?: string;
  client: ToolParty;
  consultant: ToolParty;
  contractor: ToolParty;
  subcontractor?: ToolParty;
  issuerRole: "contractor" | "consultant" | "client" | "subcontractor";
  location: { governorate?: string; city?: string; site: string; plot?: string };
  contractNo?: string;
  discipline?: string;
  signatories: { role: SignRole; name: string; title?: string; syndicateNo?: string }[];
  numbering: { scheme: "simple" | "iso19650"; originator?: string; counters: Record<string, number> };
  profiles: Record<string, string>;   // family → default profile id
  overrides: { key: string; value: number | string; reason: string; at: number }[];
  crewId?: string;
  remnantStoreId?: string;
};

export type ProjectSnap = Pick<ToolProject,
  "code" | "name" | "nameEn" | "client" | "consultant" | "contractor" | "subcontractor" | "issuerRole" | "location" | "contractNo" | "signatories"
> & { at: number };
