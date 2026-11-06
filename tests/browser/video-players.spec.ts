import { expect, test, type Page } from "@playwright/test";
import { build } from "vite";
import { resolve } from "node:path";

// Actual React components, isolated Next adapters and mocked HTTP/provider.
// No database, account, provider keys, or public network access.
let script: string;
let css: string;
const origin = "http://127.0.0.1:3001/";
test.beforeAll(async () => {
  const result = await build({ configFile: false, root: process.cwd(), logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("development"), "process.env": "{}" },
    resolve: { alias: { "@": resolve(process.cwd()),
      "next/navigation": resolve("tests/browser/fixtures/video-next.tsx"),
      "next/link": resolve("tests/browser/fixtures/video-link.tsx"),
      "next/script": resolve("tests/browser/fixtures/video-script.tsx"),
    } },
    oxc: { jsx: { runtime: "automatic" } },
    build: { write: false, minify: false, lib: { entry: resolve("tests/browser/fixtures/video-players.tsx"), formats: ["iife"], name: "VideoFixture" } },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  if (!("output" in bundle)) throw new Error("Fixture bundle was not generated.");
  script = bundle.output.filter(chunk => chunk.type === "chunk").map(chunk => chunk.code).join("\n");
  css = bundle.output.flatMap(chunk => chunk.type === "asset" && chunk.fileName.endsWith(".css") ? [chunk.source] : []).join("\n");
});

async function openFixture(page: Page, query = "") {
  await page.route("**/video-fixture**", route => route.fulfill({ contentType: "text/html", body:
    `<html lang="ar"><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>` }));
  await page.route("**/fixture.js", route => route.fulfill({ contentType: "application/javascript; charset=utf-8", body: script }));
  await page.route("**/api/instructor/lessons/*/pdf", route => route.fulfill({ json: { data: null } }));
  await page.route("https://player.mediadelivery.net/**", route => route.fulfill({ contentType: "text/html", body: "<video controls></video>" }));
  await page.route("**/api/lessons/*/pdf?metadata", route => route.fulfill({ json: { data: { fileName: `${route.request().url().split('/')[5]}.pdf` } } }));
  await page.route("**/api/lessons/*/playback", route => {
    const id = route.request().url().split("/").at(-2);
    return route.fulfill({ json: { data: { playbackUrl: `https://player.mediadelivery.net/embed/1/${id}?token=test`,
      expiresAt: "2099-01-01T00:00:00.000Z", progress: null } } });
  });
  await page.addInitScript(() => {
    Object.assign(window, { process: { env: { NODE_ENV: "development" } } });
    Object.assign(window, { playerjs: { Player: class {
      frame: HTMLIFrameElement;
      listeners = new Map<string, EventListener>();
      constructor(frame: HTMLIFrameElement) { this.frame = frame; }
      on(event: string, callback: (value: unknown) => void) {
        this.frame.dataset[event] = "attached";
        const listener = () => callback({ seconds: 60 });
        this.listeners.set(event, listener);
        this.frame.addEventListener(`test-${event}`, listener);
      }
      off(event: string) {
        delete this.frame.dataset[event];
        const listener = this.listeners.get(event);
        if (listener) this.frame.removeEventListener(`test-${event}`, listener);
      }
    } } });
  });
  await page.goto(`${origin}video-fixture${query}`);
}

test("switching purchased lessons never stacks players or PDFs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await openFixture(page);
  await expect(page.locator("iframe")).toHaveCount(1);
  for (const lesson of [2, 1, 2, 1, 2]) {
    await page.getByRole("button", { name: `الدرس ${lesson}`, exact: true }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(page.locator("iframe")).toHaveAttribute("src", new RegExp(`00000000000${lesson}`));
    await expect(page.locator('a[href$="/pdf"]')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test("progress listeners attach again when the SDK is already loaded", async ({ page }) => {
  await openFixture(page);
  await expect(page.locator("iframe")).toHaveAttribute("data-ended", "attached");
  await page.getByRole("button", { name: "الدرس 2", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveAttribute("data-ended", "attached");
});

test("next/previous replace the video and completion still saves after switching", async ({ page }) => {
  const saved: string[] = [];
  await page.route("**/api/lessons/*/progress", route => {
    saved.push(route.request().url().split("/").at(-2)!);
    return route.fulfill({ json: { data: { positionSeconds: 60, revision: 1, completedAt: "2026-11-06T00:00:00Z" } } });
  });
  await openFixture(page);
  for (const lesson of [1, 2]) {
    if (lesson === 2) {
      await page.getByRole("button", { name: "الدرس التالي", exact: true }).press("Enter");
    }
    await expect(page.locator("iframe")).toHaveAttribute("src", new RegExp(`00000000000${lesson}`));
    await expect(page.locator("iframe")).toHaveAttribute("data-ended", "attached");
    await page.locator("iframe").evaluate(frame => frame.dispatchEvent(new Event("test-ended")));
    await expect.poll(() => saved.length).toBe(lesson);
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", String(lesson * 50));
  }
  expect(new Set(saved).size).toBe(2);
  await page.getByRole("button", { name: "الدرس السابق", exact: true }).press("Enter");
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveAttribute("src", /000000000001/);
});

test("selecting a locked paid lesson removes the preview player", async ({ page }) => {
  await openFixture(page, "?locked");
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.getByRole("button", { name: /الدرس 2/ }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "هذا الدرس مقفل" })).toBeVisible();
});

async function openStudio(page: Page, query = "?studio") {
  await openFixture(page, query);
  await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /الدرس 1/ }).click();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveCount(1);
}

for (const width of [390, 1440]) {
  test(`studio previews drafts, switches lessons and stops hidden videos at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStudio(page);
    const dialog = page.getByRole("dialog");
    const frame = dialog.locator("iframe");
    await expect(frame).toHaveAttribute("src", /000000000001/);
    const box = await frame.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeGreaterThan(100);
    if (width === 390) await dialog.getByRole("button", { name: "العودة إلى الدروس", exact: true }).click();
    await dialog.getByRole("button", { name: /الدرس 2/ }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(frame).toHaveAttribute("src", /000000000002/);
    await dialog.getByRole("button", { name: "تفاصيل الدورة", exact: true }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
    await dialog.getByRole("button", { name: "المحتوى", exact: true }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await dialog.getByRole("button", { name: "إغلاق النافذة", exact: true }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await page.reload();
    await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /الدرس 1/ }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await page.screenshot({ path: `test-results/video-preview-studio-${width}.png`, fullPage: true });
  });
}

test("published read-only courses still offer a preview without replacement controls", async ({ page }) => {
  await openStudio(page, "?studio&readonly");
  await expect(page.getByRole("dialog").getByRole("button", { name: "تحديث المعاينة" })).toBeVisible();
  await expect(page.getByText("استبدال الفيديو", { exact: true })).toHaveCount(0);
});

test("processing/failed videos do not request playback; readiness reveals the preview", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/playback")) requests++; });
  await openFixture(page, "?preview");
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Finish processing" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Fail processing" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("preview authorization errors and expired credentials offer retry without reupload", async ({ page }) => {
  await openFixture(page, "?preview");
  let attempts = 0;
  await page.route("**/api/lessons/*/playback", route => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 403, json: { error: { code: "playback_forbidden", message: "Denied" } } })
      : route.fulfill({ json: { data: { playbackUrl: "https://player.mediadelivery.net/embed/1/example", expiresAt: attempts === 2 ? "2020-01-01T00:00:00Z" : "2099-01-01T00:00:00Z", progress: null } } });
  });
  await page.getByRole("button", { name: "Finish processing" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.getByRole("button", { name: "تحديث المعاينة" }).click();
  await expect.poll(() => attempts).toBe(4);
  await expect(page.locator("iframe")).toHaveCount(1);
});

test("a delayed learner playback response cannot restore the previous selection", async ({ page }) => {
  await openFixture(page);
  await expect(page.locator("iframe")).toHaveCount(1);
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/api/lessons/60000000-0000-4000-8000-000000000002/playback", async route => {
    requested = true;
    await delayed;
    await route.fulfill({ json: { data: { playbackUrl: "https://player.mediadelivery.net/embed/1/stale", expiresAt: "2099-01-01T00:00:00Z", progress: null } } });
  });
  await page.getByRole("button", { name: "الدرس 2", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "الدرس 1", exact: true }).click();
  release();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveAttribute("src", /000000000001/);
});

test("a pending instructor preview shows a skeleton and can close safely", async ({ page }) => {
  await openFixture(page, "?preview");
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/api/lessons/*/playback", async route => {
    requested = true;
    await delayed;
    await route.fulfill({ json: { data: { playbackUrl: "https://player.mediadelivery.net/embed/1/stale", expiresAt: "2099-01-01T00:00:00Z", progress: null } } });
  });
  await page.getByRole("button", { name: "Finish processing" }).click();
  await expect.poll(() => requested).toBe(true);
  await expect(page.getByRole("status", { name: "جارٍ تحميل معاينة الفيديو" })).toBeVisible();
  await page.getByRole("button", { name: "Fail processing" }).click();
  release();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("admin enables and revokes instructor-wide updates with explicit scope confirmation", async ({ page }) => {
  const requests: { url: string; allowed: boolean }[] = [];
  await page.route("**/api/admin/users/*/edit-permission", route => {
    const allowed = route.request().postDataJSON().publishedEditsAllowed as boolean;
    requests.push({ url: route.request().url(), allowed });
    return route.fulfill({ json: { data: { instructorId: "20000000-0000-4000-8000-000000000001", publishedEditsAllowed: allowed } } });
  });
  await openFixture(page, "?permissions");
  await page.getByRole("button", { name: "السماح بالتحديثات", exact: true }).click();
  await expect(page.getByRole("group")).toContainText("جميع الدورات المنشورة الحالية والمستقبلية");
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "السماح بالتحديثات", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد", exact: true }).click();
  await expect(page.getByRole("button", { name: "إيقاف التحديثات", exact: true })).toBeVisible();
  expect(requests[0].url).toContain("/api/admin/users/20000000-0000-4000-8000-000000000001/edit-permission");
  expect(requests[0].allowed).toBe(true);
  await expect(page.getByRole("button", { name: "السماح بالتعديل", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "إدارة صلاحية الشارح" })).toHaveAttribute("href", "/admin/users?role=instructor");
  await page.getByRole("button", { name: "إيقاف التحديثات", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد", exact: true }).click();
  await expect(page.getByRole("button", { name: "السماح بالتحديثات", exact: true })).toBeVisible();
  expect(requests.map(request => request.allowed)).toEqual([true, false]);
});

test("enabled instructor can maintain published details and additions while existing media stays protected", async ({ page }) => {
  await openFixture(page, "?studio&readonly&enabled");
  await page.getByRole("button", { name: "تفاصيل الدورة", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "حفظ التفاصيل", exact: true })).toBeEnabled();
  await expect(page.getByLabel(/السعر بالريال السعودي/)).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "المحتوى", exact: true }).click();
  await expect(page.getByPlaceholder("عنوان الدرس الجديد")).toBeEnabled();
  await page.getByRole("dialog").getByRole("button", { name: /الدرس 1/ }).click();
  await expect(page.getByLabel("عنوان الدرس", { exact: true })).toBeDisabled();
  await expect(page.getByText("استبدال الفيديو", { exact: true })).toHaveCount(0);
});
