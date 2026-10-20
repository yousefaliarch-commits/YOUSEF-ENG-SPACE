import { test, expect, type Page } from "@playwright/test";
import { demoAs, settle, watch, noCrash, noOverflow, noClipped } from "./helpers";

// «المهندس الذكي» inside the tools and the market, through the dev-only window.__engspaceAi fake: smart forms (RFI, material
// submittal, custody, toolbox talk, permit) filled from a description, the 💡 tip in the concrete tool, and the salary insight.
const FORMS: Record<string, any> = {
  rfi: { title: "تعارض منسوب بلاطة الدور الأول", discipline: "Structural", location: "المحور C/4 — الدور الأول", description: "منسوب البلاطة في اللوحة S-102 مختلف 15 سم عن A-201.", references: ["S-102", "A-201"], proposedSolution: "اعتماد منسوب المعماري", impact: "", responseNeededDays: 5 },
  submittal: { title: "اعتماد بلاط بورسلين", material: "بلاط بورسلين 60×60", manufacturer: "[أضف: المصنّع]", model: "", origin: "مصر", specs: [{ property: "امتصاص الماء", value: "≤ 0.5 %" }], areaOfUse: "الممرات", quantity: "1200 م²", specReference: "", attachments: ["تقرير مقاومة الانزلاق"], remarks: "" },
  custody: { from: "م. أحمد", to: "ريس النجارين", purpose: "البلوك B", items: [{ description: "هيلتي بوش", qty: 2, unit: "عدد", condition: "new", serial: "" }, { description: "ميزان ليزر", qty: 1, unit: "عدد", condition: "good", serial: "LZ-204" }], remarks: "" },
  toolbox: { topic: "صب السقف بالمضخة", activity: "صب سقف الدور الرابع", hazards: ["السقوط من الحافة"], precautions: ["الدرابزين قبل الصب", "ممنوع الوقوف تحت ذراع المضخة"], ppe: ["خوذة", "حزام"], emergency: ["أوقف المضخة"], keyMessage: "الحافة مقفولة قبل أي صب" },
  permit: { type: "height", location: "سطح الدور الثالث", description: "تركيب سقالة معلقة", durationHours: 6, hazards: ["سقوط"], precautions: ["حزام كامل مربوط"], ppe: ["خوذة"], gasTest: false, fireWatch: false, approvals: [] },
};

async function fakeAi(page: Page) {
  await page.addInitScript((forms) => {
    const w = window as any;
    w.__aiReqs = [];
    w.__engspaceAi = {
      delay: 2,
      remaining: 25,
      fake: (req: any) => {
        w.__aiReqs.push(req);
        if (req.feature === "form-fill") return JSON.stringify(forms[req.context.form]);
        if (req.feature === "tool-tip") return "راجع **ميعاد وصول العربيات** مع المحطة قبل الصب بيوم.";
        if (req.feature === "salary-insights") return "## مكانك في السوق\nبناءً على **12** تقرير، الوسيط أعلى من نطاقك.";
        return "تمام";
      },
    };
  }, FORMS);
}

const fill = async (page: Page, text: string) => {
  await page.locator("[data-ai-fill-input]").fill(text);
  await page.locator("[data-ai-fill-go]").click();
  await expect(page.locator("[data-ai-fill-done]")).toBeVisible();
};

test("RFI: a plain description becomes the form, the title follows, and it exports", async ({ page }) => {
  const errs = watch(page);
  await fakeAi(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/rfi:new");
  await page.locator("[data-ai-fill=rfi]").waitFor();
  await noOverflow(page, "rfi");
  await fill(page, "منسوب بلاطة الدور الأول مختلف بين الإنشائي والمعماري عند المحور C/4");
  await expect(page.getByLabel("الموقع / المحور / الدور")).toHaveValue("المحور C/4 — الدور الأول");
  await expect(page.getByLabel("السؤال")).toHaveValue(/S-102/);
  await expect(page.getByLabel("عنوان المستند")).toHaveValue("تعارض منسوب بلاطة الدور الأول");
  const req = await page.evaluate(() => (window as any).__aiReqs[0]);
  expect(req).toMatchObject({ feature: "form-fill", context: { form: "rfi" } });
  await expect(page).toHaveURL(/#app\/tooldoc\/rfi:d[a-z2-7]{20}$/);
  // the editable Word copy downloads next to the PDF, and the four-button bar fits a 360 px phone
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-docx]").click()]);
  expect(dl.suggestedFilename()).toMatch(/\.docx$/);
  await page.setViewportSize({ width: 360, height: 760 });
  await settle(page, 300);
  await noOverflow(page, "rfi 360");
  await noClipped(page, "rfi 360");
  await noCrash(page, errs, "rfi");
});

const CASES: { kind: string; form: string; role: "engineer" | "supervisor"; says: string; check: (page: Page) => Promise<void> }[] = [
  { kind: "submittal", form: "submittal", role: "supervisor", says: "اعتماد بلاط بورسلين 60×60 للممرات حوالي 1200 م²",
    check: async (page) => { await expect(page.getByLabel("الخامة / البند")).toHaveValue("بلاط بورسلين 60×60"); } },
  { kind: "custody", form: "custody", role: "supervisor", says: "سلّمت لريس النجارين 2 هيلتي بوش جديد وميزان ليزر LZ-204",
    check: async (page) => { await expect(page.getByText("هيلتي بوش", { exact: false }).first()).toBeVisible(); await expect(page.getByLabel("المستلِم")).toHaveValue("ريس النجارين"); } },
  { kind: "toolboxTalk", form: "toolbox", role: "supervisor", says: "النهارده صب سقف الدور الرابع بالمضخة",
    check: async (page) => { await expect(page.getByText("ممنوع الوقوف تحت ذراع المضخة")).toBeVisible(); await expect(page.getByText("«الحافة مقفولة قبل أي صب»")).toBeVisible(); } },
  { kind: "workPermit", form: "permit", role: "supervisor", says: "تركيب سقالة معلقة على سطح الدور الثالث 6 ساعات",
    check: async (page) => {
      await expect(page.getByLabel("المكان")).toHaveValue("سطح الدور الثالث");
      await expect(page.getByText("حزام كامل مربوط")).toBeVisible();
      // the AI never authorises: the permit is still a draft
      await expect(page.getByText("مسودة — غير مصرّح بالعمل")).toBeVisible();
    } },
];

for (const c of CASES) {
  test(`${c.kind}: filled from a plain description`, async ({ page }) => {
    const errs = watch(page);
    await fakeAi(page);
    await demoAs(page, c.role, { disc: "civil" }, `#app/tooldoc/${c.kind}:new`);
    await page.locator(`[data-ai-fill=${c.form}]`).waitFor();
    await fill(page, c.says);
    await c.check(page);
    const req = await page.evaluate(() => (window as any).__aiReqs.at(-1));
    expect(req).toMatchObject({ feature: "form-fill", context: { form: c.form } });
    await noOverflow(page, c.kind);
    await noCrash(page, errs, c.kind);
  });
}

test("concrete: the 💡 tip is asked only on a tap, can be hidden, and stays hidden in that tool", async ({ page }) => {
  const errs = watch(page);
  await fakeAi(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/concrete:new");
  const ask = page.locator("[data-ai-tip-ask=concrete]");
  await ask.waitFor();
  expect(await page.evaluate(() => (window as any).__aiReqs.length)).toBe(0);
  await ask.click();
  await expect(page.locator("[data-ai-tip=concrete]")).toContainText("ميعاد وصول العربيات");
  const req = await page.evaluate(() => (window as any).__aiReqs[0]);
  expect(req).toMatchObject({ feature: "tool-tip", context: { tool: "concrete" } });
  await page.locator("[data-ai-tip-never]").click();
  await expect(page.locator("[data-ai-tip=concrete]")).toHaveCount(0);
  await page.reload();
  await page.locator("[data-tool-export]").waitFor();
  await expect(page.locator("[data-ai-tip-ask=concrete]")).toHaveCount(0);
  await noCrash(page, errs, "tip");
});

test("market: the salary insight reads aggregates, and the member's own figure goes only when ticked", async ({ page }) => {
  const errs = watch(page);
  await fakeAi(page);
  await page.addInitScript(() => localStorage.setItem("engspace.salarylog.v1.u-demo", JSON.stringify({ at: 1, log: [{ month: "2026-09", salary: 21000 }] })));
  await demoAs(page, "engineer", { contributed: true }, "#app/market/salaries");
  const card = page.locator("[data-ai-salary]");
  await card.scrollIntoViewIfNeeded();
  await card.locator("[data-ai-salary-go]").click();
  await expect(card.locator("[data-ai-salary-answer]")).toContainText("12");
  let req = await page.evaluate(() => (window as any).__aiReqs.at(-1));
  expect(req.feature).toBe("salary-insights");
  expect(req.context.mySalary).toBeUndefined();
  expect(req.context).toMatchObject({ disc: "civil" });
  // a new analysis with the member's own figure ticked: only then does it travel
  await card.getByRole("button", { name: "تحليل جديد" }).click();
  await card.locator("[data-ai-salary-mine]").check();
  await card.locator("[data-ai-salary-go]").click();
  await expect(card.locator("[data-ai-salary-answer]")).toBeVisible();
  req = await page.evaluate(() => (window as any).__aiReqs.at(-1));
  expect(req.context.mySalary).toBe(21000);
  await settle(page, 200);
  await noOverflow(page, "salary insight");
  await noCrash(page, errs, "salary insight");
});
