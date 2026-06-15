import { test, expect } from "@playwright/test";

// Smoke-test voor de PWA-foundation: de app laadt, toont de rolingangen en
// serveert een geldig web app manifest (FR-13.1). Functionele flows komen in
// latere iteraties (zie het E2E-testplan, Prompt 38).

test("landingspagina toont de portaalkeuzes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Zwemschool Bubbles" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouder/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Instructeur/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Beheer/ })).toBeVisible();
});

test("manifest is bereikbaar en installeerbaar", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBe("Zwemschool Bubbles");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});
