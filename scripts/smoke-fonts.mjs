import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const url = process.env.SMOKE_URL || "http://127.0.0.1:3127";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const checks = [];
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  const original = await page.locator('[data-testid="export-source"]').textContent();
  await page.getByRole("tab", { name: "字体检测", exact: true }).click();
  const panel = page.getByRole("region", { name: "本地字体检测", exact: true });
  await page.waitForFunction(() => document.querySelector('[aria-label="本地字体检测"]')?.getAttribute("aria-busy") === "false");
  const statuses = await panel.locator("[data-font-id]").evaluateAll((nodes) => nodes.map((node) => ({
    id: node.dataset.fontId, status: node.dataset.fontStatus, text: node.textContent,
  })));
  assert.equal(statuses.length, 5);
  assert.ok(statuses.every(({ status }) => ["pass", "fallback"].includes(status)), JSON.stringify(statuses));
  checks.push("Five project/system font entries produce loaded and rendered results");
  await page.screenshot({ path: "artifacts/fonts-desktop.png" });

  await page.getByLabel("字体名称", { exact: true }).fill("AxoPoster-Definitely-Missing-Font");
  await page.getByRole("button", { name: "检测", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-font-id="custom"]')?.getAttribute("data-font-status") === "error");
  checks.push("An absent system font does not report a false success");
  await page.getByLabel("字体名称", { exact: true }).fill("Arial");
  await page.getByLabel("检测文字", { exact: true }).fill("Axolotl 中文");
  await page.getByRole("button", { name: "检测", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-font-id="custom"]')?.getAttribute("data-font-status") === "warning");
  checks.push("Characters rendered by a fallback are marked for review");

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载报告", exact: true }).click();
  await (await downloading).saveAs("artifacts/font-report.json");
  const report = JSON.parse(await readFile("artifacts/font-report.json", "utf8"));
  assert.equal(report.fonts.length, 5);
  assert.ok(report.fonts.every(({ result }) => result.samples.every((sample) => sample.inkPixels > 0)));
  checks.push("JSON report includes font sources, weights and pixel comparisons");

  await page.route("**/fonts/anton-sc.woff2", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("button", { name: "重新检测", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="本地字体检测"]')?.getAttribute("aria-busy") === "false");
  assert.equal(await panel.locator('[data-font-id="anton"]').getAttribute("data-font-status"), "error");
  await page.unroute("**/fonts/anton-sc.woff2");
  await page.getByRole("button", { name: "重新检测", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="本地字体检测"]')?.getAttribute("aria-busy") === "false");
  assert.equal(await panel.locator('[data-font-id="anton"]').getAttribute("data-font-status"), "pass");
  checks.push("Font file failure is visible; recheck recovers without changing the poster");

  const bundle = await build({
    entryPoints: ["src/lib/font-detection.ts"], bundle: true, write: false,
    format: "iife", globalName: "FontDiagnosticsProbe", platform: "browser",
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const fallback = await page.evaluate(() => window.FontDiagnosticsProbe.inspectFont({
    id: "missing-system", name: "Missing System", family: "AxoPoster-Definitely-Missing-Font",
    source: "system", usage: "smoke", weight: "300 700", fallbackId: "barlow",
    samples: [{ label: "version", text: "1.10.0 UPDATE OVERVIEW", weight: 700 }],
  }));
  assert.equal(fallback.status, "fallback");
  assert.equal(fallback.activeName, "Barlow");
  assert.equal(await page.evaluate(() => [...document.fonts].filter((face) => face.family.startsWith("AxoFontProbe-")).length), 0);
  checks.push("Missing primary font verifies Barlow fallback; temporary probe fonts are removed");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/fonts-mobile.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole("tab", { name: "编辑日志", exact: true }).click();
  await page.getByLabel("版本号", { exact: true }).waitFor();
  assert.equal(await page.locator('[data-testid="export-source"]').textContent(), original);
  assert.deepEqual(errors, []);
  checks.push("Mobile navigation fits; returning to editor preserves poster content; no runtime errors");
  await writeFile("artifacts/fonts-smoke.json", JSON.stringify({ url, checks, statuses, errors }, null, 2));
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
