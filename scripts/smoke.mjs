import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const url = process.env.SMOKE_URL || "http://127.0.0.1:3127";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const errors = [];
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  assert.equal(response.status(), 200);
  await page.getByLabel("版本号", { exact: true }).waitFor();
  await page.waitForFunction(() => !document.getElementById("version").disabled && document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  await page.evaluate(() => document.fonts.ready);
  checks.push("Editor loads");

  const poster = page.locator('[data-testid="export-source"] [data-testid="poster"]');
  async function choose(label, option) {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }

  await choose("发布通道", "Beta · 测试版");
  assert.equal(await poster.locator(".poster-channel").textContent(), "BETA");
  await choose("发布通道", "Release · 正式版");
  assert.equal(await page.locator("select:visible").count(), 0);
  checks.push("shadcn select updates the poster without native dropdowns");

  await page.getByRole("button", { name: "页脚与相关链接", exact: true }).click();
  await choose("链接 1 图标", "无图标");
  assert.equal(await poster.locator(".poster-link").first().locator("img").count(), 0);
  await choose("链接 1 图标", "金色");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="export-source"] .poster-link:first-child img'));
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="export-source"] .poster-link:first-child img')?.getAttribute("src")?.endsWith("gold.png"));
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.getElementById("version").disabled && document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  assert.equal(await poster.locator(".poster-link img").first().getAttribute("src"), "/template/link-icons/gold.png");
  await page.getByRole("button", { name: "页脚与相关链接", exact: true }).click();
  await page.getByRole("combobox", { name: "链接 1 图标", exact: true }).click();
  await page.getByRole("option", { name: "彩虹", exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/footer-icons.png" });
  await page.keyboard.press("Escape");
  checks.push("Footer icons support no icon, selection, undo/redo and autosave reload");

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON", exact: true }).click();
  const jsonDownload = await jsonDownloadPromise;
  await jsonDownload.saveAs("artifacts/icons.axoposter.json");
  const saved = JSON.parse(await readFile("artifacts/icons.axoposter.json", "utf8"));
  assert.equal(saved.links[0].icon, "gold");
  const legacy = { ...saved, links: saved.links.map((link) => {
    const previousLink = { ...link };
    delete previousLink.icon;
    return previousLink;
  }) };
  await page.getByLabel("导入日志文件", { exact: true }).setInputFiles({
    name: "legacy.axoposter.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="export-source"] .poster-link:first-child img')?.getAttribute("src")?.endsWith("pink.png"));
  assert.equal(await poster.locator(".poster-link-value").first().textContent(), legacy.links[0].value);
  checks.push("JSON retains icon selection; legacy JSON retains text and original icon defaults");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/desktop.png" });
  const originalHeight = await poster.evaluate((node) => node.scrollHeight);
  await page.getByLabel("版本号", { exact: true }).fill("1.11.0");
  await page.waitForFunction(() => document.querySelector('[data-testid="export-source"] .poster-version')?.textContent === "1.11.0");
  const description = page.getByLabel("更新内容", { exact: true });
  const originalText = await description.inputValue();
  await description.fill("这是一段较长的更新说明，用于确认正文换行时海报高度会随内容自动增长。\n".repeat(18));
  await page.waitForFunction((baseline) => document.querySelector('[data-testid="export-source"] [data-testid="poster"]').scrollHeight > baseline + 100, originalHeight);
  checks.push("Editing updates preview; long copy expands the poster");
  await description.fill(originalText);
  await page.getByLabel("版本号", { exact: true }).fill("1.10.0");
  await page.waitForFunction((baseline) => document.querySelector('[data-testid="export-source"] [data-testid="poster"]').scrollHeight === baseline, originalHeight);
  const header = await poster.locator(".poster-header-watermark").evaluate((image) => ({
    height: image.getBoundingClientRect().height,
    loaded: image.complete && image.naturalWidth > 0,
  }));
  assert.ok(header.loaded && header.height === 167, "Header watermark keeps its complete 167px layer");
  assert.ok(await page.evaluate(() => document.fonts.check('400 18px "Anton SC"') && document.fonts.check('900 24px "Poster Sans"')));
  await choose("导出倍率", "1× · 原始");
  const downloadPromise = page.waitForEvent("download", { timeout: 90000 });
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs("artifacts/export-smoke.png");
  const metadata = await sharp("artifacts/export-smoke.png").metadata();
  const statistics = await sharp("artifacts/export-smoke.png").stats();
  assert.equal(metadata.width, 568);
  assert.equal(metadata.height, originalHeight);
  assert.ok(statistics.channels.some((channel) => channel.stdev > 20), "Export should not be blank");
  await sharp("artifacts/export-smoke.png").extract({ left: 0, top: 0, width: 568, height: 200 }).resize(1136).toFile("artifacts/header-smoke.png");
  checks.push(`PNG export: ${metadata.width} x ${metadata.height}, nonblank`);
  checks.push("Complete header watermark and local poster fonts loaded");

  await page.setViewportSize({ width: 390, height: 844 });
  const footerToggle = page.getByRole("button", { name: "页脚与相关链接", exact: true });
  if (await footerToggle.getAttribute("aria-expanded") !== "true") await footerToggle.click();
  await footerToggle.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/mobile.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "No horizontal overflow on mobile");
  checks.push("Mobile page fits its viewport");
  assert.deepEqual(errors, []);
  checks.push("No browser runtime errors");
  await writeFile("artifacts/smoke.json", JSON.stringify({ url, checks, errors, testedAt: new Date().toISOString() }, null, 2));
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
