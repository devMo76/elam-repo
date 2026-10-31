import { expect, test, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

process.loadEnvFile(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(supabaseUrl)) throw new Error("UI tests require the local synthetic Supabase instance.");
const courseId = randomUUID();
const publishedCourseId = randomUUID();
const moduleId = randomUUID();
const lessonId = randomUUID();
let userId: string | undefined;
let cookies: { name: string; value: string }[] = [];
const lessonTitle = "درس تجريبي: أساسيات الدوائر";
function sql(query: string) {
  execFileSync("docker", ["exec", "supabase_db_WebProject_1", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-c", query], { stdio: "pipe" });
}

test.beforeAll(async () => {
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // Disposable local fixture only. Never sends email or stores tokens on disk.
  const email = `studio-ui-${randomUUID()}@example.invalid`;
  const password = randomUUID() + randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "شارح تجريبي لاختبار الواجهة" } });
  if (created.error) throw new Error("Local synthetic account could not be created.");
  userId = created.data.user.id;
  sql(`begin;
    update public.profiles set role='instructor' where id='${userId}';
    insert into public.courses(id,slug,title,instructor_id,price_halalas,status,department) values
    ('${courseId}','studio-ui-${courseId}','دورة تجريبية: الدوائر الكهربائية','${userId}',0,'draft','الهندسة الكهربائية'),
    ('${publishedCourseId}','studio-ui-${publishedCourseId}','دورة منشورة تجريبية','${userId}',0,'published','الهندسة الكهربائية');
    insert into public.modules(id,course_id,title,position) values('${moduleId}','${courseId}','الوحدة الأولى: المفاهيم الأساسية',1);
    insert into public.lessons(id,module_id,title,position) values('${lessonId}','${moduleId}','${lessonTitle}',1);
    insert into public.lessons(module_id,title,position) select '${moduleId}','درس تجريبي إضافي ' || position,position from generate_series(2,50) as position;
    commit;`);
  const auth = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => [], setAll: (next) => { cookies = next.map(({ name, value }) => ({ name, value })); } },
  });
  const verified = await auth.auth.signInWithPassword({ email, password });
  if (verified.error) throw new Error("Local synthetic account verification failed.");
});

test.afterAll(async () => {
  if (!userId) return;
  // Only UUIDs created above are removed. Protected-delete trigger suspension is
  // transaction-local under the table lock; failures roll back both DDL and data.
  sql(`begin; alter table public.courses disable trigger courses_reject_delete;
    delete from public.courses where id in ('${courseId}','${publishedCourseId}') and instructor_id='${userId}';
    alter table public.courses enable trigger courses_reject_delete; commit;`);
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const removed = await admin.auth.admin.deleteUser(userId);
  if (removed.error) throw new Error("Disposable browser-test account cleanup failed.");
});

async function authenticate(context: BrowserContext) {
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, domain: "localhost", path: "/", sameSite: "Lax" as const })));
  // UI error/recovery tests may only use mocked mutations, never alter seed content.
  await context.route("**/api/instructor/**", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    return route.fulfill({ status: 403, json: { error: { code: "forbidden", message: "Synthetic test denial" } } });
  });
}
test.beforeEach(async ({ context }) => { await authenticate(context); });

test("focused dialogs retain typed fields, contain keyboard focus, and recover from failed save", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/studio/courses/${courseId}`);
  await page.getByRole("button", { name: "تفاصيل الدورة", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "تفاصيل الدورة" });
  await expect(dialog).toBeVisible();
  const title = dialog.getByLabel("عنوان المقرر", { exact: true });
  await title.fill("عنوان تجريبي غير محفوظ");
  await dialog.getByRole("button", { name: "حفظ التفاصيل", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(title).toHaveValue("عنوان تجريبي غير محفوظ");
  await dialog.getByRole("button", { name: "المحتوى", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "تفاصيل الدورة", exact: true }).click();
  await expect(title).toHaveValue("عنوان تجريبي غير محفوظ");
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")))).toBe(true);
  }
  page.once("dialog", (prompt) => prompt.dismiss());
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept());
  await dialog.getByRole("button", { name: "إغلاق النافذة" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "تفاصيل الدورة", exact: true }).first().click();
  await expect(title).toHaveValue("عنوان تجريبي غير محفوظ");
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/studio-desktop-details.png" });
});

test("publication readiness opens the relevant lesson; closing restores trigger focus", async ({ page }) => {
  await page.goto(`/studio/courses/${courseId}`);
  const trigger = page.getByRole("button", { name: "النشر", exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('summary[aria-live="polite"]').click();
  const shortcut = dialog.locator('a[href^="#lesson-"]').first();
  await expect(shortcut).toBeVisible();
  await shortcut.click();
  await expect(page.getByRole("dialog", { name: "المحتوى" })).toBeVisible();
  await expect(page.getByLabel("عنوان الدرس", { exact: true }).first()).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "إغلاق النافذة" }).click();
  await expect(trigger).toBeFocused();
});

for (const width of [320, 360, 390, 768, 1440]) {
  test(`responsive studio and content dialog at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/studio/courses/${courseId}`);
    await page.screenshot({ path: `test-results/studio-overview-${width}.png` });
    const hamburger = page.getByRole("button", { name: "فتح قائمة الاستوديو" });
    if (width <= 760) {
      await hamburger.click();
      const drawer = page.getByRole("dialog", { name: "استوديو الشارح" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("link", { name: "دوراتي", exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/studio-drawer-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(hamburger).toBeFocused();
    } else await expect(hamburger).not.toBeVisible();
    await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
    await page.getByRole("button", { name: new RegExp(lessonTitle) }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const fits = await page.getByRole("dialog").evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, viewport: innerWidth, scroll: element.scrollWidth, client: element.clientWidth };
    });
    expect(fits.left).toBeGreaterThanOrEqual(-1);
    expect(fits.right).toBeLessThanOrEqual(fits.viewport + 1);
    expect(fits.scroll).toBeLessThanOrEqual(fits.client + 1);
    if (width > 760) expect(Math.abs((fits.left + fits.right) / 2 - width / 2)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("status", { name: "جارٍ تحميل المرفق", exact: true })).toHaveCount(0);
    if (width <= 760) {
      const back = page.getByRole("button", { name: "العودة إلى الدروس", exact: true });
      await expect(back).toBeVisible();
      const title = page.getByLabel("عنوان الدرس", { exact: true }).first();
      expect((await title.boundingBox())!.y).toBeLessThan(500);
      await title.fill("عنوان محفوظ داخل المحرر");
      await back.click();
      await expect(back).toHaveCount(0);
      await page.getByRole("button", { name: new RegExp(lessonTitle) }).first().click();
      await expect(title).toHaveValue("عنوان محفوظ داخل المحرر");
    }
    await page.screenshot({ path: `test-results/studio-content-${width}.png` });
  });
}

test("published curriculum and commercial fields remain read-only", async ({ page }) => {
  await page.goto(`/studio/courses/${publishedCourseId}`);
  await page.getByRole("button", { name: "تفاصيل الدورة", exact: true }).first().click();
  await expect(page.getByLabel(/السعر بالريال السعودي/)).toBeDisabled();
  await expect(page.getByRole("button", { name: "حفظ التفاصيل", exact: true })).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "المحتوى", exact: true }).click();
  await expect(page.getByRole("button", { name: "حذف الوحدة", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/studio-published-readonly.png" });
});

test("real local curriculum CRUD: add unit, rename, add/bulk/duplicate/reorder/delete lessons, delete unit", async ({ context, page }) => {
  // This account owns only disposable fixtures. Real authoring requests here
  // cannot change any existing course; no video-provider requests are allowed.
  await context.unroute("**/api/instructor/**");
  await context.route("**/api/instructor/**/video*", (route) => route.abort());
  await page.goto(`/studio/courses/${courseId}?panel=content`);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("وحدة جديدة", { exact: true }).fill("وحدة CRUD تجريبية");
  await dialog.getByRole("button", { name: "إضافة وحدة", exact: true }).click();
  const unit = dialog.locator('section[id^="module-"]:visible');
  await expect(unit.getByLabel("عنوان الوحدة", { exact: true })).toHaveValue("وحدة CRUD تجريبية");
  await unit.getByLabel("عنوان الوحدة", { exact: true }).fill("وحدة CRUD معدلة");
  await unit.getByRole("button", { name: "حفظ الاسم", exact: true }).click();
  await expect(unit.getByRole("button", { name: /وحدة CRUD معدلة/ })).toBeVisible();
  await unit.getByLabel("عنوان الدرس الجديد", { exact: true }).fill("درس CRUD الأول");
  await unit.getByRole("button", { name: "إضافة درس", exact: true }).click();
  await expect(unit.locator("article")).toHaveCount(1);
  await unit.getByText("إضافة عدة دروس", { exact: true }).click();
  await unit.getByLabel("عنوان واحد في كل سطر", { exact: true }).fill("درس CRUD الثاني\nدرس CRUD الثالث");
  await unit.getByRole("button", { name: "إضافة العناوين", exact: true }).click();
  await expect(unit.locator("article")).toHaveCount(3);
  await unit.locator("article").first().getByRole("button", { name: "نسخ الدرس", exact: true }).click();
  await expect(unit.locator("article")).toHaveCount(4);
  await unit.locator("article").first().getByRole("button", { name: "نقل لأسفل", exact: true }).click();
  await expect(unit.locator("article").first().getByRole("button", { name: /درس CRUD الأول \(نسخة\)/ })).toBeVisible();
  await unit.locator("article").first().getByRole("button", { name: "حذف الدرس", exact: true }).click();
  await unit.locator("article").first().getByRole("button", { name: "تأكيد الحذف", exact: true }).click();
  await expect(unit.locator("article")).toHaveCount(3);
  await unit.getByRole("button", { name: "حذف الوحدة", exact: true }).click();
  await unit.getByRole("button", { name: "تأكيد الحذف", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /وحدة CRUD معدلة/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("وحدة CRUD معدلة", { exact: true })).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "تفاصيل الدورة", exact: true }).click();
  await page.getByLabel("عنوان المقرر", { exact: true }).fill("دورة تجريبية محفوظة بنجاح");
  await page.getByRole("button", { name: "حفظ التفاصيل", exact: true }).click();
  await expect(page.getByText(/حُفظت الآن/)).toBeVisible();
  await page.getByRole("button", { name: "إغلاق النافذة" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "دورة تجريبية محفوظة بنجاح", exact: true })).toBeVisible();
});

test("PDF button opens picker, protects an in-flight upload, and retains feedback after reopening", async ({ context, page }) => {
  let finish!: () => void;
  const completion = new Promise<void>((resolve) => { finish = resolve; });
  await context.route(`**/api/instructor/lessons/${lessonId}/pdf`, async (route) => {
    switch (route.request().method()) {
      case "POST": return route.fulfill({ json: { data: { path: `${lessonId}/fixture.pdf`, token: "synthetic-upload-token" } } });
      case "PATCH": await completion; return route.fulfill({ json: { data: { fileName: "fixture.pdf", byteSize: 30 } } });
      default: return route.fulfill({ json: { data: null } });
    }
  });
  await context.route("**/storage/v1/object/**", (route) => route.fulfill({ json: { Key: `${lessonId}/fixture.pdf` } }));
  await page.goto(`/studio/courses/${courseId}?panel=content`);
  await page.getByRole("button", { name: new RegExp(lessonTitle) }).first().click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "رفع الملف", exact: true }).click();
  await (await chooser).setFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 synthetic UI fixture") });
  await expect(page.getByRole("button", { name: "إغلاق النافذة" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  finish();
  await expect(page.getByText("تم حفظ المرفق.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "إغلاق النافذة" }).click();
  await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
  await expect(page.getByText("fixture.pdf", { exact: true })).toBeVisible();
});

test("mobile drawer closes on desktop resize and never overlaps a course dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/studio/courses/${courseId}`);
  await page.getByRole("button", { name: "فتح قائمة الاستوديو" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
});

test("processing feedback survives dialog closure and studio route navigation", async ({ context, page }) => {
  await context.addInitScript(({ courseId, lessonId, lessonTitle }) => {
    localStorage.setItem("elam.instructor-video-uploads.v1", JSON.stringify([{
      courseId, lessonId, lessonTitle, courseTitle: "دورة تجريبية", mediaStatus: "processing",
      uploadProgress: 100, processingProgress: 25, isClientUpload: false, requiresFile: false,
      lastProgressAt: new Date().toISOString(),
    }]));
  }, { courseId, lessonId, lessonTitle });
  await context.route(`**/api/instructor/lessons/${lessonId}/video-status`, (route) => route.fulfill({ json: { data: { mediaStatus: "processing", encodingProgress: 25 } } }));
  await page.goto(`/studio/courses/${courseId}?panel=content`);
  await expect(page.getByRole("dialog").getByText(/متابعة عمليات الفيديو/)).toBeVisible();
  await page.getByRole("button", { name: new RegExp(lessonTitle) }).first().click();
  await expect(page.locator(`#lesson-${lessonId}`).getByRole("button", { name: "حذف الدرس", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "إغلاق النافذة" }).click();
  const panel = page.getByRole("complementary", { name: "عمليات الفيديو الجارية" });
  await expect(panel).toBeVisible();
  await page.getByRole("link", { name: "دوراتي", exact: true }).first().click();
  await expect(panel).toBeVisible();
  await panel.getByRole("link", { name: new RegExp(lessonTitle) }).click();
  await expect(page.getByRole("dialog", { name: "المحتوى" })).toBeVisible();
});
