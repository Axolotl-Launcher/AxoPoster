import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { DOMParser } from "@xmldom/xmldom";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createTemplate, MAX_SECTIONS } from "../src/lib/poster.ts";
import { createHalftoneTile } from "./template-background.mjs";

const url = process.env.SMOKE_URL || "http://127.0.0.1:3127";
await mkdir("artifacts", { recursive: true });
const tile = await readFile("public/template/halftone.svg", "utf8");
assert.equal(tile, createHalftoneTile(), "Generated asset must match the algorithm");
const svg = new DOMParser().parseFromString(tile, "image/svg+xml");
const dots = Array.from(svg.getElementsByTagName("circle")).map((circle) => ({
  x: Number(circle.getAttribute("cx")),
  y: Number(circle.getAttribute("cy")),
  r: Number(circle.getAttribute("r")),
}));
const row = (y) => dots.filter((dot) => dot.y === y).map(({ x, r }) => ({ x, r }));
assert.deepEqual(row(5), row(1157));
assert.deepEqual(row(-4.6), row(1147.4));
assert.ok(dots.every(({ r }) => r >= 2.2 && r <= 6.6));

const { data, info } = await sharp(Buffer.from(tile)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const coverages = [];
for (const x of [0, info.width - 22]) {
  for (let top = 0; top < info.height; top += 48) {
    let covered = 0;
    for (let dy = 0; dy < 96; dy++) {
      for (let dx = 0; dx < 22; dx++) {
        const y = (top + dy) % info.height;
        if (data[(y * info.width + x + dx) * info.channels + 3] > 32) covered++;
      }
    }
    coverages.push(covered / (96 * 22));
  }
}
assert.ok(Math.min(...coverages) > 0.05, "Every 96px margin band must retain visible dots");
const checks = ["Tile repeats seamlessly; all radii stay visible; both margins retain dot coverage"];
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes("已保存"));
  const poster = page.locator('[data-testid="export-source"] [data-testid="poster"]');
  const measure = () => poster.evaluate((node) => {
    const style = getComputedStyle(node.querySelector(".poster-halftone"));
    return {
      height: node.scrollHeight, size: style.backgroundSize,
      repeat: style.backgroundRepeat, opacity: style.opacity, mask: style.maskImage,
    };
  });
  const before = await measure();
  const template = createTemplate();
  const longPoster = {
    ...template,
    sections: Array.from({ length: MAX_SECTIONS }, (_, index) => ({
      ...template.sections[index % template.sections.length], id: `background-${index}`,
    })),
  };
  await page.getByLabel("导入日志文件", { exact: true }).setInputFiles({
    name: "background.axoposter.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(longPoster)),
  });
  await page.waitForFunction((count) =>
    document.querySelectorAll('[data-testid="export-source"] .poster-section').length === count,
  MAX_SECTIONS);
  await page.evaluate(() => document.fonts.ready);
  const after = await measure();
  assert.ok(after.height > before.height * 3);
  for (const key of ["size", "repeat", "opacity", "mask"]) assert.equal(after[key], before[key]);
  assert.equal(after.size, "568px 1152px");
  assert.equal(after.repeat, "repeat-y");
  assert.equal(after.mask, "none");
  assert.equal(after.opacity, "0.32");
  checks.push("30-section poster keeps the same tile size and opacity, without a height-dependent fade");

  await page.getByRole("combobox", { name: "导出倍率", exact: true }).click();
  await page.getByRole("option", { name: "1× · 原始", exact: true }).click();
  const downloading = page.waitForEvent("download", { timeout: 90000 });
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  await (await downloading).saveAs("artifacts/background-long-export.png");
  const image = sharp("artifacts/background-long-export.png");
  const metadata = await image.metadata();
  assert.equal(metadata.width, 568);
  assert.equal(metadata.height, after.height);
  const edge = await image.clone().extract({ left: 0, top: 200, width: 22, height: after.height - 220 }).stats();
  assert.ok(edge.channels.some((channel) => channel.stdev > 10));
  checks.push(`Full long-poster PNG: ${metadata.width} x ${metadata.height}, nonblank`);

  // Inspect the actual CSS background across tile seams without foreground content.
  await page.evaluate(() => {
    const sample = document.createElement("div");
    sample.id = "background-smoke";
    sample.className = "poster";
    sample.style.cssText = "position:absolute;top:0;left:0;width:568px;height:2304px;z-index:100;";
    sample.append(document.querySelector(".poster-halftone").cloneNode(true));
    document.body.append(sample);
  });
  await page.locator("#background-smoke").screenshot({ path: "artifacts/background-pattern.png" });
  await page.locator("#background-smoke").evaluate((node) => node.remove());
  assert.deepEqual(errors, []);
  await writeFile("artifacts/background-smoke.json", JSON.stringify({
    url, checks, minimumMarginCoverage: Math.min(...coverages), before, after, errors,
  }, null, 2));
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
