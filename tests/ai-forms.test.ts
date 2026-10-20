// «المهندس الذكي» smart forms: what the model returns (the server's FORM_SCHEMAS shape) is laid into each tool's document
// safely — strings capped, unknown values dropped, nothing the engineer typed lost — and every form still builds its PDF spec.
import { describe, expect, it } from "vitest";
import { custodyFromAi, module as custody } from "../src/features/tools/office/custody";
import { module as rfi, rfiFromAi } from "../src/features/tools/office/rfi";
import { module as submittal, submittalFromAi } from "../src/features/tools/office/submittal";
import { permitFromAi, module as permit } from "../src/features/tools/site/permit";
import { toolboxFromAi, module as toolbox } from "../src/features/tools/site/toolbox";
import { FORM_KINDS } from "../supabase/functions/_shared/ai-prompts";
import { FORM_SCHEMAS } from "../supabase/functions/_shared/ai-schemas";
import { toolById } from "../src/tools/registry";
import { toolAllowed } from "../src/tools/gate";

const docOf = (mod: any, body: any) => ({ id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body), dateIso: "2026-10-20", docNo: null, rev: "0", status: "draft", body, profile: mod.profile, log: [] }) as any;

describe("smart forms", () => {
  it("the server knows every form the app fills", () => {
    expect([...FORM_KINDS].sort()).toEqual(["custody", "permit", "rfi", "submittal", "toolbox"]);
    FORM_KINDS.forEach((k) => expect(FORM_SCHEMAS[k]).toBeTruthy());
  });

  it("RFI: fields filled, slots kept, the reply window bounded, the title passed up", () => {
    const b = rfi.blank();
    const r = rfiFromAi({ ...b, to: "دار الهندسة" }, {
      title: "تعارض منسوب بلاطة الدور الأول", discipline: "Structural", location: "المحور C/4 — الدور الأول",
      description: "منسوب البلاطة في S-102 مختلف 15 سم عن A-201.", references: ["S-102", "A-201", "[أضف: رقم بند المواصفات]", 42],
      proposedSolution: "", impact: "", responseNeededDays: 400,
    });
    expect(r).toMatchObject({ to: "دار الهندسة", discipline: "civil", location: "المحور C/4 — الدور الأول", days: "7", title: "تعارض منسوب بلاطة الدور الأول" });
    expect(r.refs.map((x) => x.ref)).toEqual(["S-102", "A-201", "[أضف: رقم بند المواصفات]", "42"]);
    const { title, ...body } = r;
    const spec = rfi.build(docOf(rfi, body), null);
    expect(JSON.stringify(spec)).toContain("S-102");
  });

  it("submittal: spec rows and new attachments added, the engineer's ticks kept", () => {
    const b = submittal.blank();
    const r = submittalFromAi(b, { material: "بلاط بورسلين 60×60", manufacturer: "[أضف: المصنّع]", specs: [{ property: "امتصاص الماء", value: "≤ 0.5 %" }, {}], attachments: ["كتالوج / Datasheet", "تقرير مقاومة الانزلاق"] });
    expect(r.specs).toEqual([{ property: "امتصاص الماء", value: "≤ 0.5 %" }]);
    expect(r.attachments.filter((a) => a.on).map((a) => a.name)).toEqual(["كتالوج / Datasheet", "تقرير مقاومة الانزلاق"]);
    expect(submittal.build(docOf(submittal, r), null).sections[0].blocks.some((x: any) => x.k === "table")).toBe(true);
  });

  it("custody: items appended with a known condition, bad rows dropped", () => {
    const r = custodyFromAi({ ...custody.blank(), items: [{ desc: "ميزان ليزر", qty: "1", unit: "عدد", cond: "good", serial: "LZ-1" }] }, {
      from: "م. أحمد", to: "ريس النجارين", purpose: "البلوك B",
      items: [{ description: "هيلتي بوش", qty: 2, unit: "عدد", condition: "new", serial: "" }, { description: "سقالة", qty: 5, unit: "عدد", condition: "broken?" }, { qty: 3 }],
    });
    expect(r.items.map((x) => [x.desc, x.qty, x.cond])).toEqual([["ميزان ليزر", "1", "good"], ["هيلتي بوش", "2", "new"], ["سقالة", "5", "good"]]);
    expect(custody.build(docOf(custody, r), null).meta.docType).toBe("CUS");
  });

  it("permit: the type maps, the controls reset on a new type, the permit stays a draft", () => {
    const b = { ...permit.blank(), controls: { x: "y" } } as any;
    const r = permitFromAi(b, { type: "height", location: "السقف", description: "تركيب سقالة", durationHours: 99, hazards: ["سقوط"], precautions: ["حزام كامل"], ppe: ["خوذة"], gasTest: false, fireWatch: false, approvals: [] });
    expect(r).toMatchObject({ type: "height", controls: {}, hours: "8", state: "draft", extra: { hazards: ["سقوط"], precautions: ["حزام كامل"], ppe: ["خوذة"] } });
    expect(permitFromAi(b, { type: "general" }).type).toBe("hot");
    expect(JSON.stringify(permit.build(docOf(permit, r), null))).toContain("حزام كامل");
  });

  it("toolbox: today's own topic becomes the talk; an empty answer changes nothing", () => {
    const b = toolbox.blank();
    expect(toolboxFromAi(b, {})).toBe(b);
    const r = toolboxFromAi(b, { topic: "صب السقف بالمضخة", activity: "صب سقف الدور الرابع", hazards: ["السقوط من الحافة"], precautions: ["الدرابزين قبل الصب", "ممنوع الوقوف تحت ذراع المضخة"], ppe: ["خوذة", "حزام"], emergency: ["أوقف المضخة"], keyMessage: "الحافة مقفولة قبل أي صب" }) as any;
    expect(r.topic).toBe("ai");
    expect(r.ai.points).toHaveLength(2);
    const text = JSON.stringify(toolbox.build(docOf(toolbox, r), null));
    expect(text).toContain("ممنوع الوقوف تحت ذراع المضخة");
    expect(text).toContain("الحافة مقفولة قبل أي صب");
  });

  it("the new office tools are field tools: engineers, owners and supervisors — never HR", () => {
    for (const id of ["rfi", "submittal", "custody"]) {
      expect(toolById(id)!.money).toBe(false);
      expect(toolAllowed("supervisor", id)).toBe(true);
      expect(toolAllowed("hr", id)).toBe(false);
    }
  });
});
