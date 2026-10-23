import { downloadBlob } from "@/lib/images";
import { getFilename, POSTER_WIDTH, type PosterDocument } from "@/lib/poster";
import { posterFontFiles } from "@/lib/fonts";

let embeddedFont: Promise<string> | undefined;

function fontCSS() {
  embeddedFont ??= Promise.all(posterFontFiles.map(async ({ family, file, weight }) => {
    const response = await fetch(`/fonts/${file}`);
    if (!response.ok) throw new Error(`海报字体 ${family} 加载失败，请稍后重试`);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(`@font-face{font-family:"${family}";src:url("${reader.result}") format("woff2");font-weight:${weight};font-style:normal;}`);
      reader.onerror = () => reject(new Error("海报字体读取失败"));
      reader.readAsDataURL(blob);
    });
  }))
    .then((rules) => rules.join("\n"))
    .catch((error) => { embeddedFont = undefined; throw error; });
  return embeddedFont;
}

export async function exportPoster(
  node: HTMLElement,
  poster: PosterDocument,
  format: "png" | "jpeg",
  scale: number,
) {
  await Promise.all([
    document.fonts.load('900 24px "Poster Sans"'),
    document.fonts.load('400 18px "Anton SC"'),
    document.fonts.load('700 80px "Bahnschrift", "Poster DIN"'),
    document.fonts.load('600 6.5px "Bahnschrift", "Poster DIN"'),
  ]);
  await document.fonts.ready;
  await Promise.all(Array.from(node.querySelectorAll("img")).map((image) => image.decode()));
  const height = Math.ceil(node.scrollHeight);
  if (height * scale > 30000 || POSTER_WIDTH * height * scale * scale > 80_000_000) {
    throw new Error("当前内容超出图片导出尺寸限制，请降低导出倍率后重试。");
  }
  const [{ toBlob, toJpeg }, fontEmbedCSS] = await Promise.all([
    import("html-to-image"),
    fontCSS(),
  ]);
  const options = {
    width: POSTER_WIDTH,
    height,
    pixelRatio: scale,
    backgroundColor: "#ff99cc",
    fontEmbedCSS,
    cacheBust: false,
    skipAutoScale: true,
  };
  const blob = format === "png"
    ? await toBlob(node, options)
    : await fetch(await toJpeg(node, { ...options, quality: 0.96 })).then((response) => response.blob());
  if (!blob || blob.size < 1000) throw new Error("图片生成失败，请降低导出倍率后重试");
  downloadBlob(blob, `${getFilename(poster)}.${format === "jpeg" ? "jpg" : "png"}`);
  return { width: POSTER_WIDTH * scale, height: height * scale };
}

export function exportDocument(document: PosterDocument) {
  downloadBlob(
    new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
    `${getFilename(document)}.axoposter.json`,
  );
}
