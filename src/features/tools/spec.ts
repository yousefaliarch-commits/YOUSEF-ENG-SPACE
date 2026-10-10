// =====================================================================
//  Tool documents → DocSpec: the parts every tool's PDF shares (title block from the project, signatures, basis,
//  disclaimer, colophon), so a tool only writes its own sections.
//  · The title block belongs to the issuer (the project's issuing party); EngSpace signs only the footer line.
//  · Drafts print «مسودة» and no fingerprint; issued documents carry their number, revision and SHA-256.
// =====================================================================
import type { BasisRow, DocBlock, DocSection, DocSpec, SignParty, TitleParty, TraceStep } from "../../doc/model";
import type { ToolDoc } from "../../data/tool-docs";
import type { ProjectSnap, SignRole, ToolProject } from "../../data/tool-projects";

declare const __BUILD__: { version: string };
const APP_VERSION = typeof __BUILD__ !== "undefined" ? __BUILD__.version : "dev";

export type ToolModuleMeta = {
  kind: string;
  docType: string;          // "PP", "BBS", "LB", …
  docTypeName: string;      // «خطة صب · Pour plan»
  discipline: string;
  engine: string;           // "concrete@1.0.0"
};

const SIGN_LABEL: Record<SignRole, string> = {
  prepared: "أعدّ · Prepared by",
  checked: "راجع · Checked by",
  approved: "اعتمد · Approved by",
  contractorRep: "مندوب المقاول · Contractor",
  consultantRep: "مهندس الاستشاري · Consultant",
  siteEngineer: "مهندس الموقع · Site engineer",
  hseOfficer: "مسؤول السلامة · HSE officer",
};

export const snapOf = (p: ToolProject): ProjectSnap => ({
  code: p.code, name: p.name, nameEn: p.nameEn, client: p.client, consultant: p.consultant, contractor: p.contractor,
  subcontractor: p.subcontractor, issuerRole: p.issuerRole, location: p.location, contractNo: p.contractNo, signatories: p.signatories, at: p.at,
});

// the project as printed: frozen at issue, live while a draft
export const projectFor = (doc: ToolDoc, projects: ToolProject[]): ProjectSnap | null => {
  if (doc.project) return doc.project;
  const p = projects.find((x) => x.id === doc.projectId && !x.deleted);
  return p ? snapOf(p) : null;
};

export function titleParties(p: ProjectSnap | null, issuerName: string): TitleParty[] {
  if (!p) {
    return [
      { role: "client", name: "—" }, { role: "project", name: "—" },
      { role: "consultant", name: "—" }, { role: "contractor", name: issuerName || "—", issuer: true },
    ];
  }
  if (p.issuerRole === "subcontractor") {
    return [
      { role: "client", name: p.client.name, nameEn: p.client.nameEn, logo: p.client.logo },
      { role: "consultant", name: p.consultant.name, nameEn: p.consultant.nameEn, logo: p.consultant.logo },
      { role: "mainContractor", name: p.contractor.name, nameEn: p.contractor.nameEn, logo: p.contractor.logo },
      { role: "subcontractor", name: p.subcontractor?.name || "—", nameEn: p.subcontractor?.nameEn, logo: p.subcontractor?.logo, issuer: true },
    ];
  }
  return [
    { role: "client", name: p.client.name, nameEn: p.client.nameEn, logo: p.client.logo, issuer: p.issuerRole === "client" },
    { role: "project", name: p.name, nameEn: p.nameEn },
    { role: "consultant", name: p.consultant.name, nameEn: p.consultant.nameEn, logo: p.consultant.logo, issuer: p.issuerRole === "consultant" },
    { role: "contractor", name: p.contractor.name, nameEn: p.contractor.nameEn, logo: p.contractor.logo, issuer: p.issuerRole === "contractor" },
  ];
}

export const issuerName = (p: ProjectSnap | null) =>
  !p ? "" : p.issuerRole === "client" ? p.client.name : p.issuerRole === "consultant" ? p.consultant.name : p.issuerRole === "subcontractor" ? p.subcontractor?.name || p.contractor.name : p.contractor.name;

// the signature row: the project's signatories in the order given, or the three classic boxes
export function signatureBlock(p: ProjectSnap | null, roles: SignRole[] = ["prepared", "checked", "approved"], stamp = true): DocBlock {
  const parties: SignParty[] = roles.map((r) => {
    const s = p?.signatories.find((x) => x.role === r);
    return { role: SIGN_LABEL[r], name: s?.name, title: s?.title, syndicateNo: s?.syndicateNo };
  });
  return { k: "signatures", parties, stamp, statusBox: "ABC" };
}

export const DISCLAIMER =
  "حسابات تقديرية لمساعدة المهندس في الموقع والمكتب الفني؛ تُراجع على اللوحات والمواصفات المعتمدة وتعليمات الاستشاري قبل التنفيذ أو الطلب. القيم المعلَّمة ⚑ افتراضات قابلة للتعديل وتحتاج تحققًا.";

export function buildSpec(o: {
  doc: ToolDoc;
  meta: ToolModuleMeta;
  project: ProjectSnap | null;
  sections: DocSection[];
  basis?: { rows: BasisRow[]; formulas: TraceStep[] };
  signRoles?: SignRole[];
  reference?: string;
  lang?: "ar" | "en";
}): DocSpec {
  const { doc, meta, project } = o;
  const issuer = issuerName(project) || "—";
  const loc = project ? [project.location.site, project.location.city, project.location.governorate].filter(Boolean).join(" · ") : "";
  const tail: DocBlock[] = [];
  if (o.basis && (o.basis.rows.length || o.basis.formulas.length)) tail.push({ k: "basis", rows: o.basis.rows, formulas: o.basis.formulas });
  tail.push({ k: "disclaimer", text: DISCLAIMER });
  tail.push(signatureBlock(project, o.signRoles));
  const sections = o.sections.map((s, i) => (i === o.sections.length - 1 ? { ...s, blocks: [...s.blocks, ...tail] } : s));
  const unverified = o.basis ? o.basis.rows.filter((r) => r.flagged).length : doc.profile.unverified.length;
  return {
    meta: {
      docType: meta.docType, docTypeName: meta.docTypeName, docNo: doc.docNo, rev: doc.rev, status: doc.status, dateIso: doc.dateIso,
      lang: o.lang || "ar", issuer, issuerRole: project ? project.issuerRole : "contractor", appVersion: APP_VERSION,
      profileLabel: doc.profile.id, engines: [meta.engine], hash: doc.hash || "",
    },
    title: {
      parties: titleParties(project, issuer),
      title: doc.title,
      discipline: meta.discipline,
      location: loc || "—",
      reference: o.reference || project?.contractNo || "—",
    },
    revisions: [],
    sections,
    colophon: {
      generatedAt: new Date().toISOString(), appVersion: APP_VERSION, backend: "raster", profiles: [doc.profile.id],
      unverified, overridden: doc.profile.overridden, hash: doc.hash || "", disclaimer: DISCLAIMER,
    },
  };
}

// «7F3A…» numbering: <code>-<TYPE>-<NNNN> (GEN when the document has no project)
export function nextDocNo(project: ToolProject | null, docType: string) {
  const code = project ? project.code : "GEN";
  const n = (project?.numbering.counters[docType] || 0) + 1;
  return { docNo: `${code}-${docType}-${String(n).padStart(4, "0")}`, n };
}
