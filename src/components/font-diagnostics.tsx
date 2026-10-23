"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CircleAlert, Download, LoaderCircle, RefreshCw, Search, Type, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fontDefinitions, type FontDefinition } from "@/lib/fonts";
import { inspectFont, type FontResult } from "@/lib/font-detection";
import { downloadBlob } from "@/lib/images";

const statusLabels = {
  pass: "样本通过", fallback: "已回退", warning: "待核对",
  error: "检测失败", unsupported: "不支持检测",
};

function FontResultRow({ font, result }: { font: FontDefinition; result?: FontResult }) {
  return (
    <article className="min-w-0 space-y-3 border-b py-5" data-font-id={font.id} data-font-status={result?.status ?? "checking"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Type className="size-4 shrink-0 text-muted-foreground" />
          <span className="break-all">{font.name}</span>
        </h3>
        <Badge variant={result?.status === "error" ? "destructive" : "secondary"} className="shrink-0">
          {!result ? <LoaderCircle className="size-3 animate-spin" />
            : result.status === "pass" ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
              : result.status === "error" ? <X className="size-3" /> : <CircleAlert className="size-3 text-amber-600 dark:text-amber-400" />}
          {result ? statusLabels[result.status] : "检测中"}
        </Badge>
      </div>
      <div className="space-y-1 text-xs leading-5 text-muted-foreground">
        <p>{font.source === "bundled" ? "项目本地文件" : "本机系统字体"} · {font.usage}</p>
        {font.files && <p className="break-all font-mono text-[11px]">{font.files.map(({ file }) => file).join(" / ")}</p>}
        {result && <p>{result.detail}</p>}
      </div>
      <div className="space-y-2.5 border-l-2 border-muted pl-3">
        {font.samples.map((sample, index) => (
          <div key={`${sample.weight}-${index}`} className="min-w-0">
            <p className="mb-1 text-[10px] text-muted-foreground">
              {sample.label} · {sample.weight}
              {result?.status === "fallback" && ` · ${result.activeName}`}
              {result?.samples[index] && ` · ${result.samples[index].matches && result.samples[index].unverifiedCharacters.length === 0 ? "字形一致" : "待核对"}`}
            </p>
            <p
              className="break-words text-2xl leading-snug"
              style={{ fontFamily: result?.activeFamily ?? JSON.stringify(font.family), fontWeight: sample.weight, overflowWrap: "anywhere" }}
            >{sample.text}</p>
            {Boolean(result?.samples[index]?.unverifiedCharacters.length) && (
              <p className="mt-1 break-words text-xs text-amber-700 dark:text-amber-400">
                疑似回退字符：{result!.samples[index].unverifiedCharacters.join(" ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

export function FontDiagnostics() {
  const [results, setResults] = useState<Record<string, FontResult>>({});
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [sampleText, setSampleText] = useState("Axolotl 1.10.0");
  const [custom, setCustom] = useState<{ font: FontDefinition; result?: FontResult } | null>(null);
  const [customChecking, setCustomChecking] = useState(false);
  const generations = useRef({ fonts: 0, custom: 0 });

  const run = useCallback(async () => {
    const current = ++generations.current.fonts;
    setChecking(true);
    setResults({});
    await Promise.all(fontDefinitions.map(async (font) => {
      const result = await inspectFont(font);
      if (current === generations.current.fonts) setResults((previous) => ({ ...previous, [font.id]: result }));
    }));
    if (current === generations.current.fonts) setChecking(false);
  }, []);

  useEffect(() => {
    const active = generations.current;
    const timer = window.setTimeout(() => void run(), 0);
    return () => {
      window.clearTimeout(timer);
      active.fonts++;
      active.custom++;
    };
  }, [run]);

  async function checkCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || customChecking) return;
    const current = ++generations.current.custom;
    const font: FontDefinition = {
      id: "custom", name: name.trim(), family: name.trim(),
      source: "system", usage: "自定义检测", weight: "400",
      samples: [{ label: "检测样本", text: sampleText.trim() || "Axolotl 1.10.0", weight: 400 }],
    };
    setCustom({ font });
    setCustomChecking(true);
    const result = await inspectFont(font);
    if (current === generations.current.custom) {
      setCustom({ font, result });
      setCustomChecking(false);
    }
  }

  function downloadReport() {
    const report = {
      checkedAt: new Date().toISOString(),
      scope: "当前浏览器中列出的字体、字重与样本；不代表全部字符覆盖或其他设备的渲染结果",
      fonts: fontDefinitions.map((font) => ({ ...font, result: results[font.id] })),
      custom: custom?.result ? custom : undefined,
    };
    downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), "axoposter-font-report.json");
  }

  const passed = Object.values(results).filter((result) => result.status === "pass").length;
  return (
    <section className="min-w-0" aria-label="本地字体检测" aria-busy={checking}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">字体与渲染状态</h2>
          <p className="text-xs text-muted-foreground" role="status">
            {checking ? `正在检测 ${Object.keys(results).length} / ${fontDefinitions.length}` : `${passed} / ${fontDefinitions.length} 项样本通过`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void run()} disabled={checking}>
            <RefreshCw className={checking ? "animate-spin" : ""} />重新检测
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadReport} disabled={checking || customChecking}>
            <Download />下载报告
          </Button>
        </div>
      </div>
      {fontDefinitions.map((font) => <FontResultRow key={font.id} font={font} result={results[font.id]} />)}
      <section className="space-y-4 pt-6" aria-labelledby="custom-font-heading">
        <h2 id="custom-font-heading" className="text-sm font-semibold">按名称检测本机字体</h2>
        <form onSubmit={(event) => void checkCustom(event)} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="font-name" className="field-label">字体名称</label>
            <div className="flex items-center gap-2">
              <Input id="font-name" value={name} maxLength={100} disabled={customChecking} onChange={(event) => setName(event.target.value)} placeholder="Bahnschrift" required />
              <Button type="submit" variant="outline" className="shrink-0" disabled={!name.trim() || customChecking}>
                {customChecking ? <LoaderCircle className="animate-spin" /> : <Search />}检测
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="font-sample" className="field-label">检测文字</label>
            <Input id="font-sample" value={sampleText} maxLength={120} disabled={customChecking} onChange={(event) => setSampleText(event.target.value)} />
          </div>
        </form>
        {custom && <FontResultRow font={custom.font} result={custom.result} />}
      </section>
      <p className="pt-5 text-[11px] text-muted-foreground">检测范围：当前浏览器 · 列出的字重与样本</p>
    </section>
  );
}
