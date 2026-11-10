import { test, expect } from "@playwright/test";
import { demoAs, noOverflow, settle, watch } from "./helpers";

const SENTENCE = "احسبلي كمية خرسانة لقواعد مسلحة 10 قواعد بمقاس 2 في 2.5 وارتفاع 60 سم";

test("voice take-off: the brief's sentence is read, nothing is guessed, and a concrete take-off opens", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer");
  await page.locator("[data-tour=tab-ai]").click();
  const card = page.locator("[data-voice-tool]");
  await expect(card).toBeVisible();
  await noOverflow(page, "voice card");

  await card.locator("[data-voice-text]").fill(SENTENCE);
  await expect(card.locator("[data-voice-el=footing]")).toContainText("10");
  // 10 × 2 × 2.5 × 0.6 = 30 m³ net — the engine's figure, shown before anything is saved
  await expect(card.locator("[data-voice-total]")).toContainText("30.00");
  await card.locator("[data-voice-q=grade]").selectOption("C35");
  await card.locator("[data-voice-q=waste]").fill("5");
  await expect(card.locator("[data-voice-total]")).toContainText("31.50");
  await card.locator("[data-voice-make]").click();

  // the document opens as a take-off with the footings row filled in
  await expect(page.locator("[data-tool-doc], [data-doc-settings]").first()).toBeVisible({ timeout: 20_000 });
  await settle(page, 600);
  expect(errs).toEqual([]);
});

test("voice take-off: a missing dimension is asked for, never guessed", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer");
  await page.locator("[data-tour=tab-ai]").click();
  const card = page.locator("[data-voice-tool]");
  await card.locator("[data-voice-text]").fill("5 قواعد بمقاس 2 في 2");
  await expect(card.locator('[data-voice-q="0.H"]')).toBeVisible();
  await expect(card.locator("[data-voice-make]")).toBeDisabled();
  await card.locator('[data-voice-q="0.H"]').fill("50 سم");
  await expect(card.locator("[data-voice-make]")).toBeEnabled();
  expect(errs).toEqual([]);
});

test("site supervisor: the voice take-off is a field tool, so it is there", async ({ page }) => {
  await demoAs(page, "supervisor");
  await page.locator("[data-tour=tab-ai]").click();
  await expect(page.locator("[data-voice-tool]")).toBeVisible();
});
