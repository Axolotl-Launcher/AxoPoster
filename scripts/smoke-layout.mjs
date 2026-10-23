import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createTemplate } from "../src/lib/poster.ts";

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
  const response = await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  const poster = page.locator('[data-testid="export-source"] [data-testid="poster"]');
  const template = createTemplate();

  async function load(document) {
    await page.getByLabel("导入日志文件", { exact: true }).setInputFiles({
      name: "layout.axoposter.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(document)),
    });
    await page.waitForFunction((count) =>
      window.document.querySelectorAll('[data-testid="export-source"] .poster-section').length === count,
    document.sections.length);
    await page.evaluate(() => document.fonts.ready);
  }

  async function measure() {
    return poster.evaluate((node) => {
      const footer = node.querySelector(".poster-footer");
      const mark = node.querySelector(".poster-footer-watermark");
      const dots = getComputedStyle(node.querySelector(".poster-halftone"));
      const paragraph = node.querySelector(".poster-disclaimer");
      const text = paragraph.firstChild;
      let offset = 0;
      const lines = text.textContent.split("\n\n").map((part) => {
        const range = document.createRange();
        range.setStart(text, offset);
        range.setEnd(text, offset + part.length);
        offset += part.length + 2;
        return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
      });
      return {
        height: node.scrollHeight,
        lines,
        footerGap: footer.getBoundingClientRect().top - node.querySelector(".poster-sections").getBoundingClientRect().bottom,
        headingGap: footer.querySelector("h3").getBoundingClientRect().top - footer.getBoundingClientRect().top,
        markWidth: mark.width,
        markHeight: mark.height,
        markOffset: mark.getBoundingClientRect().top - footer.getBoundingClientRect().top,
        tileSize: dots.backgroundSize,
        tileRepeat: dots.backgroundRepeat,
        fits: node.scrollWidth === node.clientWidth && paragraph.scrollWidth === paragraph.clientWidth,
      };
    });
  }

  await load(template);
  const baseline = await measure();
  assert.deepEqual(baseline.lines, [2, 1, 1]);
  assert.equal(baseline.footerGap, 0);
  assert.equal(baseline.headingGap, 12);
  assert.ok(baseline.fits);
  checks.push("Default disclaimer: 2/1/1 lines; footer heading has 12px spacing");

  const sizes = [{ name: "default", ...baseline }];
  for (const count of [1, 12]) {
    await load({
      ...template,
      sections: Array.from({ length: count }, (_, index) => ({
        ...template.sections[index % template.sections.length],
        id: `layout-${index}`,
      })),
    });
    const size = await measure();
    assert.equal(size.tileSize, "568px 1152px");
    assert.equal(size.tileRepeat, "repeat-y");
    assert.equal(size.markWidth, 568);
    assert.equal(size.markHeight, 333);
    assert.equal(size.markOffset, -270);
    assert.ok(size.fits);
    assert.ok(count === 1 ? size.height < baseline.height : size.height > baseline.height);
    sizes.push({ name: `${count} sections`, ...size });
  }
  checks.push("Short/long posters retain dot tile size and footer watermark geometry");

  await load(template);
  await page.getByRole("button", { name: "页脚与相关链接", exact: true }).click();
  await page.getByLabel("项目声明", { exact: true }).fill(`${template.disclaimer}\n\n${"更长的自定义声明仍然能够自然换行，不会被裁切。".repeat(30)}`);
  await page.waitForFunction((height) =>
    document.querySelector('[data-testid="export-source"] [data-testid="poster"]').scrollHeight > height + 100,
  baseline.height);
  checks.push("Long custom disclaimer wraps and grows the poster");
  await page.getByLabel("项目声明", { exact: true }).fill(template.disclaimer);
  await page.waitForFunction((height) =>
    document.querySelector('[data-testid="export-source"] [data-testid="poster"]').scrollHeight === height,
  baseline.height);

  await page.getByRole("combobox", { name: "导出倍率", exact: true }).click();
  await page.getByRole("option", { name: "1× · 原始", exact: true }).click();
  const downloading = page.waitForEvent("download", { timeout: 90000 });
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  await (await downloading).saveAs("artifacts/layout-export.png");
  const metadata = await sharp("artifacts/layout-export.png").metadata();
  assert.equal(metadata.width, 568);
  assert.equal(metadata.height, baseline.height);
  const stats = await sharp("artifacts/layout-export.png").stats();
  assert.ok(stats.channels.some((channel) => channel.stdev > 20));
  await sharp("artifacts/layout-export.png")
    .extract({ left: 0, top: metadata.height - 286, width: 568, height: 286 })
    .resize(852)
    .toFile("artifacts/layout-footer.png");
  assert.deepEqual(errors, []);
  checks.push(`Full PNG export: ${metadata.width} x ${metadata.height}, nonblank; no runtime errors`);
  await writeFile("artifacts/layout-smoke.json", JSON.stringify({
    url, checks, sizes, errors, testedAt: new Date().toISOString(),
  }, null, 2));
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
