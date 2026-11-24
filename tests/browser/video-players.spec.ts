import { expect, test, type Page } from "@playwright/test";
import { build } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { themeInitializationScript } from "../../lib/theme";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Reveal } from "../../components/ui/Reveal";
import { CURRENT_POLICY_VERSION } from "../../lib/policy-version";

// Actual React components, isolated Next adapters and mocked HTTP/provider.
// No database, account, provider keys, or public network access.
let script: string;
let css: string;
const origin = "http://127.0.0.1:3001/";

function serverRevealDocument() {
  const markup = renderToString(createElement("main", { dir: "rtl" }, createElement(Reveal, null,
    createElement("p", { id: "server-reveal-content" }, "محتوى مرئي قبل وبعد التحميل"))));
  return `<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style><script>window.process={env:{NODE_ENV:"development"}}</script></head><body><div id="root">${markup}</div><script src="/fixture.js"></script></body></html>`;
}

test("reduced-motion content is visible in real SSR markup before and after hydration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let resume!: () => void;
  const hydrate = new Promise<void>(resolve => { resume = resolve; });
  await page.route("**/ssr-reveal-fixture**", route => route.fulfill({ contentType: "text/html", body: serverRevealDocument() }));
  await page.route("**/fixture.js", async route => {
    await hydrate;
    await route.fulfill({ contentType: "application/javascript; charset=utf-8", body: script });
  });
  await page.goto(`${origin}ssr-reveal-fixture?reveal-ssr`, { waitUntil: "commit" });
  const reveal = page.locator("#server-reveal-content").locator("..");
  await expect(reveal).toHaveCSS("opacity", "1");
  await expect(reveal).toHaveCSS("transform", "none");
  await expect(page.locator("html")).not.toHaveAttribute("data-reveal-hydrated");
  resume();
  await expect(page.locator("html")).toHaveAttribute("data-reveal-hydrated", "true");
  await expect(reveal).toHaveCSS("opacity", "1");
});

test("reduced-motion SSR content remains readable when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route("**/ssr-reveal-fixture**", route => route.fulfill({ contentType: "text/html", body: serverRevealDocument() }));
  await page.goto(`${origin}ssr-reveal-fixture`);
  await expect(page.locator("#server-reveal-content").locator("..")).toHaveCSS("opacity", "1");
  await context.close();
});
for (const width of [390, 1440]) test(`featured course stays compact with 100 chapters and a long description at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixture(page, "?featured");
  await expect(page.getByRole("heading", { name: "أحدث الدورات", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/ابدأ من هنا|الأكثر انتشار|عندنا تجهيزات للميد والفاينل/);
  const card = page.locator('a[href="/courses/video-regression"]');
  await expect(card.getByText("اطلع على الدورة", { exact: true })).toBeVisible();
  await expect(card.getByRole("heading", { name: "Calculus 2" })).toBeVisible();
  await expect(card).not.toContainText("Chapter");
  await expect(card.locator("ol")).toHaveCount(0);
  const description = card.getByText(/مقدمة في حساب التفاضل/);
  await expect(description).toBeVisible();
  const dimensions = await description.evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight, line: parseFloat(getComputedStyle(element).lineHeight) }));
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.line * 6 + 1);
  expect(dimensions.contentHeight).toBeGreaterThan(dimensions.height);
  expect((await card.boundingBox())!.height).toBeLessThan(width < 768 ? 900 : 550);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/featured-description-${width}.png`, fullPage: true });
});

test("featured course uses the subtitle when the description is blank", async ({ page }) => {
  await openFixture(page, "?featured&fallback");
  await expect(page.getByText("وصف مختصر للدورة من قاعدة البيانات")).toBeVisible();
  await expect(page.getByText("عن الدورة", { exact: true })).toBeVisible();
});

test("featured course omits the preview when both description and subtitle are absent", async ({ page }) => {
  await openFixture(page, "?featured&empty");
  await expect(page.getByText("عن الدورة", { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/courses/video-regression"]')).toBeVisible();
});

test("featured course description is displayed as plain text", async ({ page }) => {
  await openFixture(page, "?featured&literal");
  const card = page.locator('a[href="/courses/video-regression"]');
  await expect(card).toContainText("<script>window.previewInjection = true</script>");
  await expect(card.locator("script")).toHaveCount(0);
  expect(await page.evaluate(() => "previewInjection" in window)).toBe(false);
});

test("theme follows system until explicitly chosen, persists across pages and synchronizes tabs", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await openFixture(page, "?polish=home");
  const toggle = page.getByRole("button", { name: "الوضع الليلي", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await openFixture(page, "?polish=auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const other = await context.newPage();
  await openFixture(other, "?polish=learner");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.getByRole("button", { name: "الوضع الليلي", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await other.close();
});

test("theme toggle works with blocked storage and keyboard input", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", { value: () => { throw new DOMException("Storage access blocked", "SecurityError"); } });
    Object.defineProperty(Storage.prototype, "setItem", { value: () => { throw new DOMException("Storage writes blocked", "SecurityError"); } });
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await openFixture(page, "?polish=home");
  const toggle = page.getByRole("button", { name: "الوضع الليلي", exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 1440]) test(`polished public header, Arabic copy and hero remain clear in both themes at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await openFixture(page, "?polish=home");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("في إلام، دوراتنا تشرح لك المواد الصعبة بطريقة سهلة");
  await expect(page.getByRole("heading", { name: "بماذا يتميز الشارحون في إلام؟", exact: true })).toBeVisible();
  await expect(page.locator("#vetting li")).toHaveText([
    "كل شارح في إلام خاض نفس التجربة التي تمر بها ويقدم لك خلاصة ما تحتاجه بدون زيادة",
    "نجهزك للميد والفاينل بأسهل وأسرع طريق",
  ]);
  await expect(page.locator("#catalog h2")).toHaveText(["مواد الهندسة العامة", "مواد الهندسة الكهربائية"]);
  await expect(page.getByRole("region", { name: "مواد الهندسة العامة" })).not.toContainText("دوائر كهربائية");
  await expect(page.getByRole("region", { name: "مواد الهندسة الكهربائية" })).toContainText("دوائر كهربائية");
  await expect(page.locator("#featured h3")).toHaveCount(3);
  await expect(page.locator("#catalog").getByRole("link", { name: "عرض جميع الدورات" })).toHaveAttribute("href", "/courses");
  await expect(page.locator("#faq details:not(#teach details)")).toHaveCount(3);
  await expect(page.locator("#faq details:not(#teach details) > summary")).toHaveText([
    "هل إلام تابعة للجامعة؟", "من يقدم الشروحات؟", "كيف أتأكد من جودة الشرح؟",
  ]);
  await expect(page.locator('header a[href$="#catalog"]').first()).toHaveText("الدورات");
  await expect(page.locator("header").getByRole("link", { name: "شوف الدورات", exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\bElam\b|كيف نختار المدرسين|ما ننشر أي شرح قبل ما نسمعه ونراجعه/);
  const heroPoints = page.locator('[data-hero="point"]');
  await expect(heroPoints).toHaveText(["أول درس في كل مادة مجاني", "شرح سهل الاستيعاب", "شرح باللغة العربية"]);
  const lead = page.locator('[data-hero="lead"]');
  const points = page.locator('[data-hero="points"]');
  const actions = page.locator('[data-hero="actions"]');
  await expect(actions.getByRole("link", { name: "كيف نختار الشارحين", exact: true })).toHaveAttribute("href", "#vetting");
  expect((await points.boundingBox())!.y).toBeGreaterThan((await lead.boundingBox())!.y);
  expect((await actions.boundingBox())!.y).toBeGreaterThanOrEqual((await points.boundingBox())!.y + (await points.boundingBox())!.height);
  expect(await heroPoints.first().evaluate(element => getComputedStyle(element).fontSize)).toBe(await lead.evaluate(element => getComputedStyle(element).fontSize));
  await expect(page.locator('img[src="/hero-campus.jpg"]')).toBeVisible();
  await expect(page.locator("#teach h2")).toHaveText("كن شارحاً معنا");
  await expect(page.locator("#teach > p")).toHaveText("هل تملك المعرفة والقدرة على إيصال المعلومة؟\nنعم، إذاً مكانك معنا في إلام");
  await expect(page.locator("#teach summary")).toHaveText("سجل كشارح");
  if (width < 1024) {
    await page.getByLabel("القائمة الرئيسية", { exact: true }).click();
    await expect(page.getByRole("navigation", { name: "التنقل الرئيسي للجوال" }).getByRole("link", { name: "كيف نعمل في المنصة" })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "الوضع الليلي", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const logo = page.locator(`img[src="/elam-mark${theme === "dark" ? "-dark" : ""}.png"]`).first();
    await expect(logo).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/publishing-home-${theme}-${width}.png`, fullPage: true });
  }
});

test("subject group has an honest empty state and the FAQ uses Arabic branding", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixture(page, "?polish=subjects-empty");
  await expect(page.locator("#catalog")).toContainText("لا توجد دورات منشورة في هذا القسم حاليًا.");
  await expect(page.getByRole("region", { name: "مواد الهندسة العامة" })).not.toContainText("دوائر كهربائية");
  await expect(page.locator("#catalog").getByRole("link", { name: "عرض جميع الدورات" })).toHaveAttribute("href", "/courses");
  await page.locator("#faq summary").first().click();
  await expect(page.locator("#faq details").first().locator("p")).toHaveText("لا. إلام منصة مستقلة.");
  await page.locator("#faq summary").nth(1).click();
  await expect(page.locator("#faq details").nth(1).locator("p")).toHaveText("مجموعة متنوعة من الخريجين والطلبة المتميزين الذين لديهم الخبرة في المادة.");
  await page.locator("#faq summary").nth(2).click();
  await expect(page.locator("#faq details").nth(2).locator("p")).toHaveText("كل مادة تبدأ بدرس مجاني تستطيع مشاهدته قبل الاشتراك في الدورة.");
  await expect(page.locator("footer")).toContainText("إلام منصة مستقلة ومحتوى دوراتها يساعدك على فهم مقرراتك الجامعية وليس بديلا عنها");
  await expect(page.locator("body")).not.toContainText(/مكمّل|مكمّلة|يكمّل محاضراتك|معتمدة من أي جهة|كيف تُحسب التقييمات/);
  await page.locator("#teach summary").click();
  await expect(page.locator("#teach details p")).toBeVisible();
});

for (const width of [320, 390, 1440]) test(`policy document and footer contacts remain accessible at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await openFixture(page, "?polish=policies");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("لائحة سياسات الخصوصية والاستخدام");
  const policyDocument = page.getByRole("article");
  await expect(policyDocument.locator("section")).toHaveCount(11);
  await expect(policyDocument.locator("p")).toHaveCount(143);
  await expect(policyDocument).toContainText("FL-845028249");
  await expect(policyDocument).toContainText("لا تبيع إلام بياناتك الشخصية لأي معلن أو وسيط بيانات.");
  await expect(policyDocument).toContainText("لا تتجاوز 30 يومًا");
  await page.getByRole("navigation", { name: "محتويات اللائحة" }).getByRole("link", { name: "الإلغاء والاسترداد", exact: true }).click();
  await expect(page).toHaveURL(/#refunds$/);
  await expect(page.locator("#refunds h2")).toBeInViewport();
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "لائحة سياسات الخصوصية والاستخدام" })).toHaveAttribute("href", "/policies");
  await expect(footer.getByRole("link", { name: "الشروط والأحكام", exact: true })).toHaveCount(0);
  await expect(footer.getByRole("link", { name: "سياسة الخصوصية", exact: true })).toHaveCount(0);
  const email = footer.getByRole("link", { name: "elam.support@gmail.com" });
  await expect(email).toHaveAttribute("href", "mailto:elam.support@gmail.com");
  const phone = footer.getByRole("link", { name: "+966 55 133 5720" });
  await expect(phone).toHaveAttribute("href", "tel:+966551335720");
  await expect(phone.locator("bdi")).toHaveAttribute("dir", "ltr");
  await expect(email.locator("bdi")).toHaveAttribute("dir", "ltr");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "الوضع الليلي", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/policies-${theme}-${width}.png` });
    await footer.screenshot({ path: `test-results/footer-${theme}-${width}.png` });
  }
});

test("registration requires an explicit unchecked policy agreement and sends its version", async ({ page }) => {
  await openFixture(page, "?polish=register");
  const checkbox = page.getByRole("checkbox");
  const submit = page.getByRole("button", { name: "إنشاء الحساب", exact: true });
  await expect(checkbox).not.toBeChecked();
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("link", { name: "لائحة سياسات الخصوصية والاستخدام", exact: true }).first()).toHaveAttribute("href", "/policies");
  await expect(page.locator('form a[href="/policies"]')).toHaveAttribute("target", "_blank");
  await page.getByRole("textbox", { name: "الاسم الكامل" }).fill("حساب جديد");
  await page.getByRole("textbox", { name: "البريد الإلكتروني" }).fill("new@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("safe-password");
  await checkbox.check();
  await expect(submit).toBeEnabled();
  await checkbox.uncheck();
  await expect(submit).toBeDisabled();
  let body: unknown;
  await page.route("**/api/auth/register", async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 202, json: { data: { message: "verify" } } });
  });
  await checkbox.check();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("تحقق من بريدك الإلكتروني");
  expect(body).toMatchObject({ policyAccepted: true, policyVersion: CURRENT_POLICY_VERSION });
});

for (const width of [320, 390, 1440]) test(`existing account policy dialog requires saved agreement at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: width < 500 ? "dark" : "light" });
  await openFixture(page, "?polish=policy-consent");
  const dialog = page.getByRole("dialog", { name: "الموافقة على لائحة المنصة" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(":modal"))).toBe(true);
  const submit = dialog.getByRole("button", { name: "أوافق وأتابع", exact: true });
  await expect(submit).toBeDisabled();
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(dialog.getByRole("link")).toHaveAttribute("href", "/policies");
  await expect(dialog.getByRole("link")).toHaveAttribute("target", "_blank");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await dialog.screenshot({ path: `test-results/policy-consent-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  let attempts = 0;
  await page.route("**/api/auth/policy", async route => {
    attempts++;
    expect(route.request().postDataJSON()).toEqual({ policyAccepted: true, policyVersion: CURRENT_POLICY_VERSION });
    await route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { error: {} } : { data: { accepted: true } } });
  });
  await dialog.getByRole("checkbox").check();
  await submit.click();
  await expect(dialog.getByRole("alert")).toHaveText("تعذر حفظ موافقتك. حاول مرة أخرى.");
  await expect(page).toHaveURL(/polish=policy-consent/);
  await submit.click();
  await expect(page).toHaveURL(/\/studio\/courses\/existing\?tab=content$/);
  expect(attempts).toBe(2);
});

test("existing users can sign out without agreeing", async ({ page }) => {
  await openFixture(page, "?polish=policy-consent");
  let signedOut = false;
  await page.route("**/api/auth/sign-out", async route => { signedOut = true; await route.fulfill({ status: 204 }); });
  await page.getByRole("dialog").getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
  await expect(page).toHaveURL(origin);
  expect(signedOut).toBe(true);
});

for (const view of ["auth", "learner", "admin", "studio"]) test(`dark theme is usable on the ${view} surface`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await openFixture(page, `?polish=${view}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "الوضع الليلي", exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/publishing-${view}-dark-390.png`, fullPage: true });
});
for (const width of [390, 1440]) test(`admin reviews submitted lessons, video and PDF at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const progressWrites: string[] = [];
  await page.route("**/api/lessons/*/progress", route => {
    progressWrites.push(route.request().url());
    return route.fulfill({ status: 500, body: "Unexpected progress write" });
  });
  await openFixture(page, "?review");
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /فتح ملف الدرس/ })).toHaveAttribute("href", /000000000001\/pdf$/);
  await page.getByRole("button", { name: /الدرس 2/ }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).toHaveAttribute("src", /000000000002/);
  await expect(page.getByRole("link", { name: /فتح ملف الدرس/ })).toHaveAttribute("href", /000000000002\/pdf$/);
  expect(progressWrites).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-review-${width}.png`, fullPage: true });
});

test("admin sees PDF errors with retry and an explicit missing-attachment state", async ({ page }) => {
  await openFixture(page, "?review");
  await page.route("**/api/lessons/*/pdf?metadata", route => route.fulfill({ status: 500, json: { error: {} } }));
  await page.getByRole("button", { name: /الدرس 2/ }).click();
  await expect(page.getByRole("alert")).toHaveText("تعذّر تحميل ملف الدرس.");
  await page.route("**/api/lessons/*/pdf?metadata", route => route.fulfill({ status: 404, json: { error: {} } }));
  await page.getByRole("button", { name: "إعادة تحميل الملف" }).click();
  await expect(page.getByText("لا يوجد ملف PDF لهذا الدرس.")).toBeVisible();
});

test("admin cannot preview unfinished video but can still inspect the attached PDF", async ({ page }) => {
  let playbackRequests = 0;
  await page.route("**/api/lessons/*/playback", route => { playbackRequests++; return route.abort(); });
  await openFixture(page, "?review&processing");
  await expect(page.getByRole("status").filter({ hasText: "قيد التجهيز" })).toBeVisible();
  await expect(page.getByRole("link", { name: /فتح ملف الدرس/ })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(playbackRequests).toBe(0);
});

test("background processing updates unopened lessons, unit counts and course readiness together", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("elam.instructor-video-uploads.v1", JSON.stringify([1, 2].map(position => ({
      lessonId: `60000000-0000-4000-8000-00000000000${position}`,
      lessonTitle: `الدرس ${position}`,
      courseId: "40000000-0000-4000-8000-000000000001", courseTitle: "دورة اختبار",
      mediaStatus: "processing", isClientUpload: false, requiresFile: false,
      uploadProgress: null, processingProgress: 50, isCancelled: false,
      lastProgressAt: new Date().toISOString(),
    }))));
  });
  let release!: () => void;
  const processing = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route("**/api/instructor/lessons/*/video-status", async route => {
    requests++;
    await processing;
    const ready = route.request().url().includes("000000000001/");
    await route.fulfill({ json: { data: { mediaStatus: ready ? "ready" : "failed", encodingProgress: ready ? 100 : null } } });
  });
  await openFixture(page, "?studio&processing");
  await expect.poll(() => requests, { timeout: 15_000 }).toBe(2);
  await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "الدرس 1 قيد التجهيز", exact: true })).toBeVisible();
  await expect(dialog.getByText("2 قيد التجهيز", { exact: true })).toBeVisible();
  release();
  await expect(dialog.getByRole("button", { name: "الدرس 1 جاهز", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "الدرس 2 يحتاج متابعة", exact: true })).toBeVisible();
  await expect(dialog.getByText("2 قيد التجهيز", { exact: true })).toHaveCount(0);
  await expect(page.locator('section[aria-label="حالة الدورة"]')).toContainText("1 / 2");
  await dialog.getByRole("button", { name: "إغلاق النافذة", exact: true }).click();
  const tracker = page.getByRole("complementary", { name: "عمليات الفيديو الجارية" });
  await expect(tracker.getByText("الفيديو جاهز", { exact: true })).toBeVisible();
  await tracker.getByRole("button", { name: "إخفاء", exact: true }).first().click();
  await tracker.getByRole("button", { name: "إخفاء", exact: true }).click();
  await page.getByRole("button", { name: "المحتوى", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "الدرس 1 جاهز", exact: true })).toBeVisible();
});
test.beforeAll(async () => {
  const result = await build({ configFile: false, root: process.cwd(), logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("development"), "process.env": "{}" },
    resolve: { alias: { "@": resolve(process.cwd()),
      "next/navigation": resolve("tests/browser/fixtures/video-next.tsx"),
      "next/link": resolve("tests/browser/fixtures/video-link.tsx"),
      "next/script": resolve("tests/browser/fixtures/video-script.tsx"),
      "next/image": resolve("tests/browser/fixtures/video-image.tsx"),
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
    `<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>إلام | Elam</title><script>${themeInitializationScript}</script><style>${css}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>` }));
  for (const asset of ["hero-campus.jpg", "elam-mark.png", "elam-mark-dark.png"]) {
    await page.route(`**/${asset}`, route => route.fulfill({ contentType: asset.endsWith("jpg") ? "image/jpeg" : "image/png", body: readFileSync(resolve("public", asset)) }));
  }
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
