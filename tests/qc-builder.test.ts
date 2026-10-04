// QA/QC v0.1.14: checklists built from scratch, and the executive report's fixed parts.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CATEGORIES, TEMPLATES, categoryOf, cleanTemplate, itemCount, mergeTemplates, newInspection, newTemplate, resolveTemplate, tally, templateError } from "../src/data/checklists";
import { REPORT_PROMO } from "../src/lib/report-pdf";

describe("a checklist from scratch", () => {
  it("starts blank with one empty section, marked as the member's own", () => { const t = newTemplate(); expect(t).toMatchObject({ title: "", category: "", custom: true }); expect(t.id).toMatch(/^u-/); expect(t.sections).toEqual([["البنود", [""]]]); });
  it("a copy of a ready template is independent of it (editing the copy never changes the template)", () => {
    const src = TEMPLATES[0]; const t = newTemplate(src); expect(t.title).toBe(`${src.title} — نسختي`); expect(t.category).toBe("إنشائي");
    t.sections[0][1][0] = "تعديل"; t.sections[0][0] = "قسم آخر"; expect(src.sections[0][1][0]).not.toBe("تعديل"); expect(src.sections[0][0]).not.toBe("قسم آخر");
  });
  it("saving trims, caps and drops empty items and empty sections", () => {
    const t = { ...newTemplate(), title: "  عزل الأسطح  ", category: " إنشائي ", sections: [["  المواد ", ["  بند 1 ", "", "   "]], ["", [""]], ["", ["بند بلا عنوان قسم"]], ["x".repeat(200), ["y".repeat(400)]]] as any };
    const c = cleanTemplate(t); expect(c.title).toBe("عزل الأسطح"); expect(c.category).toBe("إنشائي");
    expect(c.sections).toEqual([["المواد", ["بند 1"]], ["البنود", ["بند بلا عنوان قسم"]], ["x".repeat(120), ["y".repeat(300)]]]);
  });
  it("is refused without a title or without a single item — and says which", () => {
    expect(templateError(newTemplate())).toBe("اكتب عنوان القائمة"); expect(templateError({ ...newTemplate(), title: "x" })).toBe("أضف بندًا واحدًا على الأقل");
    expect(templateError({ ...newTemplate(), title: "x", sections: [["s", ["بند"]]] })).toBeNull();
  });
  it("categories cover the site disciplines; ready templates get a category too", () => { expect(CATEGORIES).toEqual(expect.arrayContaining(["إنشائي", "معماري وتشطيبات", "كهرباء", "ميكانيكا وصحي (MEP)", "سلامة الموقع", "مكتب فني"])); for (const t of TEMPLATES) expect(CATEGORIES).toContain(categoryOf(t)); });
});

describe("inspecting with one's own checklist", () => {
  const mine = cleanTemplate({ ...newTemplate(), title: "اختبار ضغط المواسير", category: "ميكانيكا وصحي (MEP)", sections: [["الاختبار", ["الضغط ثابت 24 ساعة", "لا تسريب عند الوصلات"]]] as any });
  it("the inspection carries a snapshot of the checklist and the new header fields", () => {
    const x: any = newInspection(mine, "م. أحمد"); expect(x.template).toBe(mine.id); expect(x.tpl.sections).toEqual(mine.sections);
    expect(x).toMatchObject({ irNo: "", contractor: "", consultant: "", general: "", inspector: "م. أحمد" });
  });
  it("a ready template's inspection has no snapshot (the template is part of the app)", () => { expect((newInspection(TEMPLATES[1]) as any).tpl).toBeUndefined(); });
  it("the snapshot wins: editing or deleting the checklist later never changes an inspection already done", () => {
    const x: any = newInspection(mine); const edited = { ...mine, title: "عنوان جديد", sections: [["أخرى", ["بند مختلف"]]] as any };
    expect(resolveTemplate(x, [edited]).title).toBe("اختبار ضغط المواسير"); expect(resolveTemplate(x, []).sections).toEqual(mine.sections);
    expect(resolveTemplate({ template: "rebar" }, []).id).toBe("rebar"); expect(resolveTemplate({ template: mine.id }, [mine]).id).toBe(mine.id); expect(resolveTemplate({ template: mine.id }, [{ ...mine, deleted: true }]).id).toBe(TEMPLATES[0].id);
  });
  it("marks count the same way for the member's checklist", () => {
    const x: any = newInspection(mine); expect(tally(resolveTemplate(x), {}).open).toBe(2); expect(tally(resolveTemplate(x), { "0.0": "pass", "0.1": "fail" }).suggested).toBe("rejected"); expect(itemCount(mine)).toBe(2);
  });
});

describe("sync between phones", () => {
  it("the newer copy wins; a deletion (tombstone) is not undone by an older copy elsewhere", () => {
    const a = { ...newTemplate(), id: "u-1", title: "قديم", at: 1 } as any; const b = { ...a, title: "جديد", at: 5 }; const dead = { id: "u-1", deleted: true, at: 9 } as any;
    expect(mergeTemplates([a], [b])[0].title).toBe("جديد"); expect(mergeTemplates([b], [dead])[0].deleted).toBe(true); expect(mergeTemplates([dead], [b])[0].deleted).toBe(true);
  });
});

describe("the executive report", () => {
  const src = readFileSync(new URL("../src/lib/report-pdf.ts", import.meta.url), "utf8");
  it("carries the platform line in every page footer, exactly as worded", () => { expect(REPORT_PROMO).toBe("تم إنشاء التقرير عبر تطبيق EngSpace — منصة المهندسين الرسمية | engspace.org"); expect(src).toMatch(/canvases\.forEach\(\(cv, i\) => \{[\s\S]*tr\(REPORT_PROMO\)[\s\S]*صفحة \$\{i \+ 1\} من \$\{total\}/); });
  it("has the consultant layout: letterhead mark, project table, summary, inspection table, three signature blocks", () => {
    expect(src).toMatch(/drawMark\(ctx/); expect(src).toMatch(/MARK_SHAPE from "\.\.\/ui\/brand-mark\.json"/);
    for (const s of ["رقم المستند", "النتيجة النهائية", "نسبة المطابقة", "مهندس المقاول", "مهندس الاستشاري (الإشراف)", "المهندس المستلم", "الاعتماد والتوقيعات", "ملاحظات عامة والإجراءات التصحيحية"]) expect(src).toContain(s);
    expect(src).toMatch(/if \(inTable && canvases\.length > 1\) tableHead\(\)/);   // the table header repeats on every page
  });
});
