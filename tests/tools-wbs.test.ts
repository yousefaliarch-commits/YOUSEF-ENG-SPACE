// W3: a project's documents filed by zone / building · level · element, and found again by the words a site engineer types.
import { describe, expect, it } from "vitest";
import { headerOf, mergeDoc, newDocId, wbsPath, type ToolDoc, type ToolHeader } from "../src/data/tool-docs";
import { haystack, normalise, searchDocs, zonesOf } from "../src/tools/doc-search";
import { blankProject } from "../src/data/tool-projects";
import { buildSpec } from "../src/features/tools/spec";
import { specXlsx } from "../src/doc/xlsx";
import { strFromU8, unzipSync } from "fflate";

const doc = (title: string, over: Partial<ToolDoc> = {}): ToolDoc => ({
  id: newDocId(), kind: "concrete", v: 1, at: 1, createdAt: 1, projectId: "p1", title, dateIso: "2026-10-10",
  docNo: null, rev: "00", status: "draft", profile: { id: "ecp203-site@1", edition: "2020", values: {}, overridden: [], unverified: [] },
  body: {}, photos: {}, log: [], ...over,
});

const list: ToolHeader[] = [
  headerOf(doc("صب سقف الدور الثاني", { wbs: { zone: "برج A", level: "الدور 02", element: "بلاطة S-04" } })),
  headerOf(doc("أعمدة الأرضي", { kind: "bbs", wbs: { zone: "برج A", level: "الأرضي", element: "أعمدة C1–C12" }, docNo: "TWR-BBS-0003" })),
  headerOf(doc("خزان المياه", { wbs: { zone: "المبنى الإداري", level: "السطح" } })),
  headerOf(doc("مستخلص رقم 4", { kind: "ipc", projectId: "p2" })),
  { ...headerOf(doc("محذوف", { wbs: { zone: "برج A" } })), deleted: true },
];

describe("the WBS path", () => {
  it("joins zone · level · element, skipping blanks and trimming", () => {
    expect(wbsPath({ zone: " برج A ", level: "الدور 02", element: "بلاطة S-04" })).toBe("برج A · الدور 02 · بلاطة S-04");
    expect(wbsPath({ zone: "برج A", element: "عمود C12" })).toBe("برج A · عمود C12");
    expect(wbsPath({ zone: "  " })).toBe("");
    expect(wbsPath(null)).toBe("");
    expect(wbsPath(undefined)).toBe("");
  });
  it("the index header carries the WBS only when there is one (no empty objects in every shard)", () => {
    expect(headerOf(doc("x", { wbs: { zone: "برج A" } })).wbs).toEqual({ zone: "برج A" });
    expect("wbs" in headerOf(doc("x"))).toBe(false);
    expect("wbs" in headerOf(doc("x", { wbs: { zone: " ", level: "" } }))).toBe(false);
  });
  it("survives the two-phone merge like any other field (the newer copy wins)", () => {
    const a = doc("x", { at: 5, wbs: { zone: "برج A" } });
    const b = { ...a, at: 9, wbs: { zone: "برج B", level: "01" } };
    expect(mergeDoc(a, b, 0, null, newDocId).keep?.wbs).toEqual({ zone: "برج B", level: "01" });
    expect(mergeDoc(b, a, 0, null, newDocId).keep?.wbs).toEqual({ zone: "برج B", level: "01" });
  });
});

describe("finding a saved document", () => {
  it("Arabic is matched the way people type it: hamza forms, taa marbuta, alef maqsura, tashkeel, kashida", () => {
    expect(normalise("الأرضيّ")).toBe(normalise("الارضي"));
    expect(normalise("إنشاءات")).toBe("انشاءات");
    expect(normalise("بلاطة")).toBe(normalise("بلاطه"));
    expect(normalise("مبنى")).toBe(normalise("مبني"));
    expect(normalise("خــرسانة")).toBe(normalise("خرسانه"));
    expect(normalise("  Tower   A ")).toBe("tower a");
  });
  it("every word must match — title, number, zone, level, element or the tool's name — in any order", () => {
    const t = (q: string) => searchDocs(list, q).map((h) => h.title);
    expect(t("برج a")).toEqual(["صب سقف الدور الثاني", "أعمدة الأرضي"]);
    expect(t("الدور 02 s-04")).toEqual(["صب سقف الدور الثاني"]);
    expect(t("s-04 الدور")).toEqual(["صب سقف الدور الثاني"]);
    expect(t("ارضي")).toEqual(["أعمدة الأرضي"]);
    expect(t("bbs-0003")).toEqual(["أعمدة الأرضي"]);
    expect(t("سطح")).toEqual(["خزان المياه"]);
    expect(t("برج z")).toEqual([]);
  });
  it("finds by the tool's name too, so «مستخلص» lists the certificates", () => {
    expect(haystack(list[3])).toContain(normalise("مستخلص"));
    expect(searchDocs(list, "مستخلص").map((h) => h.kind)).toEqual(["ipc"]);
  });
  it("a deleted document never comes back in a search", () => {
    expect(searchDocs(list, "محذوف")).toEqual([]);
    expect(searchDocs(list, "").length).toBe(4);
  });
  it("a zone narrows the list exactly (not by substring); kinds and project narrow too", () => {
    expect(searchDocs(list, "", { zone: "برج A" }).length).toBe(2);
    expect(searchDocs(list, "", { zone: "برج" }).length).toBe(0);
    expect(searchDocs(list, "أعمدة", { zone: "برج A" }).length).toBe(1);
    expect(searchDocs(list, "", { kinds: ["bbs"] }).map((h) => h.title)).toEqual(["أعمدة الأرضي"]);
    expect(searchDocs(list, "", { projectId: "p2" }).map((h) => h.kind)).toEqual(["ipc"]);
  });
  it("zone chips list the zones in use, most documents first", () => {
    expect(zonesOf(list.filter((h) => !h.deleted))).toEqual(["برج A", "المبنى الإداري"]);
    expect(zonesOf([])).toEqual([]);
  });
});

describe("the printed location", () => {
  const meta = { docType: "POUR", docTypeName: "طلب صب / Pour Request", discipline: "إنشائي", engine: "concrete@1" } as any;
  const project: any = {
    ...blankProject("p1"), code: "TWR", name: "أبراج النيل", contractNo: "C-77", contractor: { name: "شركة المقاولات" },
    location: { site: "قطعة 12", city: "القاهرة الجديدة", governorate: "القاهرة" },
  };
  it("the title block's location reads WBS — site, so a printed sheet says exactly where the work is", () => {
    const s = buildSpec({ doc: doc("صب", { wbs: { zone: "برج A", level: "الدور 02", element: "بلاطة S-04" } }), meta, project, sections: [] });
    expect(s.title.location).toBe("برج A · الدور 02 · بلاطة S-04 — قطعة 12 · القاهرة الجديدة · القاهرة");
    expect(buildSpec({ doc: doc("صب"), meta, project, sections: [] }).title.location).toBe("قطعة 12 · القاهرة الجديدة · القاهرة");
    expect(buildSpec({ doc: doc("صب", { wbs: { zone: "برج A" } }), meta, project: null, sections: [] }).title.location).toBe("برج A");
    expect(buildSpec({ doc: doc("صب"), meta, project: null, sections: [] }).title.location).toBe("—");
  });
  it("the Excel summary sheet carries the same location", () => {
    const s = buildSpec({ doc: doc("صب", { wbs: { zone: "برج A", level: "الدور 02" } }), meta, project, sections: [] });
    const zip = unzipSync(specXlsx(s, new Date("2026-10-31T00:00:00Z")));
    const sheets = Object.keys(zip).filter((k) => k.startsWith("xl/worksheets/sheet")).map((k) => strFromU8(zip[k])).join("");
    expect(sheets).toContain("برج A · الدور 02 — قطعة 12");
  });
});
