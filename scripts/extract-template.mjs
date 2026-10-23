import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import sharp from "sharp";
import { createHalftoneTile } from "./template-background.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("public/template/", root);
await mkdir(output, { recursive: true });
const source = await readFile(new URL("AXL1.10.0.svg", root), "utf8");
const document = new DOMParser().parseFromString(source, "image/svg+xml");
const serializer = new XMLSerializer();
const children = Array.from(document.documentElement.childNodes).filter(
  (node) => node.nodeType === 1,
);
const defs = children[0].cloneNode(true);
for (const image of Array.from(defs.getElementsByTagName("image"))) {
  image.parentNode.removeChild(image);
}

function svg(nodes, viewBox, preserveAspectRatio = "xMidYMid meet") {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" preserveAspectRatio="${preserveAspectRatio}">${serializer.serializeToString(defs)}${nodes.map((node) => serializer.serializeToString(node)).join("")}</svg>`;
}

await writeFile(
  new URL("background.svg", output),
  svg(children.slice(1, 4), "0 0 567.5 1854", "none"),
);
await writeFile(new URL("halftone.svg", output), createHalftoneTile());
await writeFile(
  new URL("footer-watermark.svg", output),
  svg([children[3]], "0 1393 567.5 333"),
);
await writeFile(
  new URL("link-watermark.svg", output),
  svg([children[39]], "203.5 1710 27.5 9.3"),
);
await writeFile(
  new URL("brand.svg", output),
  svg([children[6], children[7]], "0 0 567.5 101"),
);
await writeFile(
  new URL("header-watermark.svg", output),
  svg([children[4]], "0 0 567.5 167"),
);
const mark = Array.from(children[13].getElementsByTagName("g")).find(
  (node) => node.getAttribute("class") === "cls-73",
);
await writeFile(
  new URL("watermark.svg", output),
  svg([mark], "30 350 130 48"),
);

// The footer's SVG nodes have scale(0); decode their embedded PNGs directly.
const embeddedImages = Array.from(children[0].getElementsByTagName("image"));
const icons = [
  ["rainbow", embeddedImages.find((image) => image.getAttribute("id") === "image")],
  ["pink", embeddedImages.find((image) => image.getAttribute("id") === "image-2")],
  ["gold", children[23]],
  ["blue", children[24]],
  ["cyan", children[27]],
];
await mkdir(new URL("link-icons/", output), { recursive: true });
for (const [name, image] of icons) {
  const href = image?.getAttribute("xlink:href");
  if (!href?.startsWith("data:image/png;base64,")) throw new Error(`Missing embedded icon: ${name}`);
  await sharp(Buffer.from(href.slice(href.indexOf(",") + 1), "base64"))
    .resize(128, 128)
    .png()
    .toFile(fileURLToPath(new URL(`link-icons/${name}.png`, output)));
}

if (!process.argv.includes("--decorations-only")) {
  const names = ["seed-map", "modpack", "crash-analysis", "content", "download", "network"];
  for (let index = 0; index < names.length; index++) {
    const image = children[13 + index].getElementsByTagName("image")[0];
    const href = image.getAttribute("xlink:href");
    const buffer = Buffer.from(href.slice(href.indexOf(",") + 1), "base64");
    await sharp(buffer)
      .resize({ width: 1240, withoutEnlargement: true })
      .webp({ quality: 94 })
      .toFile(fileURLToPath(new URL(`${names[index]}.webp`, output)));
  }
  await sharp(Buffer.from(source))
    .resize({ width: 568 })
    .webp({ quality: 90 })
    .toFile(fileURLToPath(new URL("original.webp", output)));
}
console.log("Extracted template decorations and five footer icons without changing the source SVG.");
