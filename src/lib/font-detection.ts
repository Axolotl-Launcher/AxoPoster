import { fontDefinitions, type FontDefinition, type FontSample } from "@/lib/fonts";

export type FontSampleResult = FontSample & {
  matches: boolean;
  inkPixels: number;
  differingPixels: number;
  width: number;
  unverifiedCharacters: string[];
};

export type FontResult = {
  id: string;
  status: "pass" | "fallback" | "warning" | "error" | "unsupported";
  detail: string;
  available: boolean;
  activeName: string;
  activeFamily: string;
  samples: FontSampleResult[];
  checkedAt: string;
};

let probeSerial = 0;

function waitFor<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error("字体检测超时，请重试"));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("字体检测超时，请重试"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error) => { signal.removeEventListener("abort", abort); reject(error); },
    );
  });
}

async function loadReference(font: FontDefinition, alias: string, signal: AbortSignal) {
  if (font.source === "system") {
    const face = new FontFace(alias, `local(${JSON.stringify(font.family)})`, { weight: font.weight });
    return [await waitFor(face.load(), signal)];
  }
  return Promise.all((font.files ?? []).map(async ({ file, weight }) => {
    const response = await fetch(`/fonts/${file}`, { signal, cache: "no-cache" });
    if (!response.ok) throw new Error(`${file} 读取失败（HTTP ${response.status}）`);
    const bytes = await response.arrayBuffer();
    const face = new FontFace(alias, bytes, { weight });
    return waitFor(face.load(), signal);
  }));
}

function compareSample(family: string, reference: string, sample: FontSample): FontSampleResult {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法执行 Canvas 字形比对");
  const actualFont = `${sample.weight} 32px ${family}, monospace`;
  const referenceFont = `${sample.weight} 32px "${reference}", monospace`;
  context.font = actualFont;
  const width = context.measureText(sample.text).width;
  context.font = referenceFont;
  canvas.width = Math.ceil(Math.max(width, context.measureText(sample.text).width)) + 32;
  canvas.height = 96;

  function paint(font: string, text = sample.text) {
    const ctx = context!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#000";
    ctx.fillText(text, 16, 64);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  const actual = paint(actualFont);
  const expected = paint(referenceFont);
  let inkPixels = 0;
  let differingPixels = 0;
  for (let index = 3; index < actual.length; index += 4) {
    if (actual[index] > 0) inkPixels++;
    if (actual[index] !== expected[index]) differingPixels++;
  }
  const unverifiedCharacters: string[] = [];
  canvas.width = 128;
  function equal(a: Uint8ClampedArray, b: Uint8ClampedArray) {
    return a.every((value, index) => value === b[index]);
  }
  for (const character of new Set(Array.from(sample.text).filter((value) => !/\s/u.test(value)))) {
    const mono = paint(`${sample.weight} 32px monospace`, character);
    const serif = paint(`${sample.weight} 32px serif`, character);
    const targetMono = paint(`${sample.weight} 32px "${reference}", monospace`, character);
    const targetSerif = paint(`${sample.weight} 32px "${reference}", serif`, character);
    // A missing glyph follows the fallback. Shared generic glyphs remain inconclusive.
    if (!equal(targetMono, targetSerif) || (equal(targetMono, mono) && equal(targetSerif, serif))) {
      unverifiedCharacters.push(character);
    }
  }
  return { ...sample, matches: inkPixels > 0 && differingPixels === 0, inkPixels, differingPixels, width, unverifiedCharacters };
}

export async function inspectFont(font: FontDefinition): Promise<FontResult> {
  const result: FontResult = {
    id: font.id, status: "error", detail: "", available: false,
    activeName: font.name, activeFamily: JSON.stringify(font.family),
    samples: [], checkedAt: new Date().toISOString(),
  };
  if (typeof FontFace === "undefined" || !document.fonts) {
    return { ...result, status: "unsupported", detail: "当前浏览器不支持字体加载检测" };
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  const alias = `AxoFontProbe-${Date.now()}-${++probeSerial}`;
  let references: FontFace[] = [];
  let stage: "load" | "render" = "load";
  let active = font;
  try {
    try {
      references = await loadReference(font, alias, controller.signal);
      result.available = true;
    } catch (error) {
      const fallback = fontDefinitions.find((entry) => entry.id === font.fallbackId);
      if (!fallback || controller.signal.aborted) throw error;
      active = fallback;
      references = await loadReference(fallback, alias, controller.signal);
      result.activeName = fallback.name;
      result.activeFamily = `${JSON.stringify(font.family)}, ${JSON.stringify(fallback.family)}`;
    }

    // Temporary aliases provide an independent reference without replacing the page fonts.
    for (const face of references) document.fonts.add(face);
    stage = "render";
    for (const sample of font.samples) {
      const loaded = await waitFor(document.fonts.load(
        `${sample.weight} 32px ${result.activeFamily}`, sample.text,
      ), controller.signal);
      if (active.source === "bundled" && !loaded.some((face) =>
        face.family.replace(/^["']|["']$/g, "") === active.family && face.status === "loaded"
      )) {
        throw new Error("页面字体声明未匹配，当前文字可能正在使用回退字体");
      }
      result.samples.push(compareSample(result.activeFamily, alias, sample));
    }

    if (!result.samples.every((sample) => sample.matches)) {
      return { ...result, status: "warning", detail: "页面字形与参考字体不一致，请核对样张" };
    }
    if (result.samples.some((sample) => sample.unverifiedCharacters.length > 0)) {
      return { ...result, status: "warning", detail: "部分字符疑似使用回退字体，无法确认完整覆盖样本" };
    }
    return active === font
      ? { ...result, status: "pass", detail: "字体已加载，页面样本与参考字形一致" }
      : { ...result, status: "fallback", detail: `${font.name} 未检测到或不可访问；${active.name} 回退样本通过` };
  } catch (error) {
    const detail = controller.signal.aborted
      ? "字体检测超时，请重试"
      : stage === "load" && active !== font
        ? `${font.name} 不可用，备用字体 ${active.name} 加载失败：${error instanceof Error ? error.message : "请重试"}`
        : stage === "load" && font.source === "system"
        ? "本机字体未找到，或浏览器限制访问"
        : error instanceof Error ? error.message : "字体检测失败";
    return { ...result, status: stage === "render" ? "warning" : "error", detail };
  } finally {
    window.clearTimeout(timer);
    for (const face of references) document.fonts.delete(face);
  }
}
