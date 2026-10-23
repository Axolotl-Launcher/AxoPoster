"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, Check, ChevronRight, Download,
  Expand, FileJson, FilePlus2, FolderOpen, ImageDown, LoaderCircle,
  Plus, Redo2, RotateCcw, Save, Trash2, Undo2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/icon-button";
import { Select } from "@/components/select";
import { FooterEditor } from "@/components/footer-editor";
import { FontDiagnostics } from "@/components/font-diagnostics";
import { SectionEditor } from "@/components/section-editor";
import { PosterCanvas, ScaledPoster } from "@/components/poster-canvas";
import { SiteHeader, type View } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { usePoster } from "@/hooks/use-poster";
import {
  createTemplate, MAX_IMPORT_BYTES, MAX_SECTIONS, moveSection, newSection,
  parsePoster, POSTER_WIDTH, posterSchema,
  type PosterDocument, type PosterSection, type SavedDraft,
} from "@/lib/poster";
import { deleteDraft, listDrafts, restoreDraft, saveDraft } from "@/lib/storage";
import { exportDocument, exportPoster } from "@/lib/export";
import { cn } from "@/lib/utils";

export function PosterEditor() {
  const {
    document: poster, ready, update, saveStatus, storageError, persist,
    undo, redo, canUndo, canRedo,
  } = usePoster();
  const preview = useDeferredValue(poster);
  const [view, setView] = useState<View>("editor");
  const [openSection, setOpenSection] = useState<string | null>("seed-map");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(2);
  const [height, setHeight] = useState(1854);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [importError, setImportError] = useState("");
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(568);
  const exportNode = useRef<HTMLDivElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const exportBusy = useRef(false);

  const patch = useCallback((values: Partial<PosterDocument>, group = "") => {
    update((current) => ({ ...current, ...values }), group);
  }, [update]);

  const patchSection = useCallback((id: string, values: Partial<PosterSection>, group = "") => {
    update((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === id ? { ...section, ...values } : section),
    }), group);
  }, [update]);

  const toggleSection = useCallback((id: string) => {
    setOpenSection((current) => current === id ? null : id);
  }, []);

  const reorder = useCallback((id: string, direction: -1 | 1) => {
    update((current) => moveSection(current, id, direction));
  }, [update]);

  const duplicate = useCallback((id: string) => {
    const nextId = crypto.randomUUID();
    update((current) => {
      if (current.sections.length >= MAX_SECTIONS) {
        toast.error(`最多添加 ${MAX_SECTIONS} 项更新`);
        return current;
      }
      const index = current.sections.findIndex((section) => section.id === id);
      if (index < 0) return current;
      const sections = [...current.sections];
      sections.splice(index + 1, 0, { ...sections[index], id: nextId });
      return { ...current, sections };
    });
    setOpenSection(nextId);
  }, [update]);

  const remove = useCallback((id: string) => {
    update((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== id) }));
    toast("更新项目已删除，可通过撤销恢复");
  }, [update]);

  useEffect(() => {
    const node = exportNode.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setHeight(Math.ceil(node.scrollHeight)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  async function refreshDrafts() {
    setDraftsLoading(true);
    setDraftError("");
    try { setDrafts(await listDrafts()); }
    catch { setDraftError("无法读取草稿箱，请检查浏览器是否允许本地存储后重试。"); }
    finally { setDraftsLoading(false); }
  }

  function changeView(next: View) {
    setView(next);
    if (next === "drafts") void refreshDrafts();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function addSection() {
    if (poster.sections.length >= MAX_SECTIONS) return;
    const section = newSection();
    update((current) => ({ ...current, sections: [...current.sections, section] }));
    setOpenSection(section.id);
  }

  function newDocument() {
    const section = newSection();
    update({ ...createTemplate(), version: "", sections: [section] });
    setOpenSection(section.id);
    setExportError("");
    setImportError("");
    changeView("editor");
    toast("已新建日志，原内容可通过撤销恢复");
  }

  function useTemplate() {
    update(createTemplate());
    setOpenSection("seed-map");
    setExportError("");
    setImportError("");
    changeView("editor");
    toast("已载入 1.10.0 模板，原内容可通过撤销恢复");
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("日志文件不能超过 40 MB");
      const imported = parsePoster(await file.text());
      update(imported);
      setOpenSection(imported.sections[0]?.id ?? null);
      setExportError("");
      changeView("editor");
      toast.success(`已导入 ${imported.version}，原内容可通过撤销恢复`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "无法导入这个文件");
    }
  }

  async function handleSaveDraft() {
    if (savingDraft) return;
    setSavingDraft(true);
    setDraftError("");
    try {
      const draft = await saveDraft(poster);
      setDrafts((previous) => [draft, ...previous]);
      toast.success(`已保存草稿 ${poster.version || "未命名"}`);
    } catch {
      setDraftError("草稿保存失败。请导出 JSON 备份当前日志，或稍后重试。");
    } finally { setSavingDraft(false); }
  }

  async function handleDeleteDraft(draft: SavedDraft) {
    try {
      await deleteDraft(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      toast("草稿已删除", {
        duration: 8000,
        action: {
          label: "撤销",
          onClick: () => {
            void restoreDraft(draft).then(() => refreshDrafts()).catch(() => setDraftError("恢复草稿失败，请重试。"));
          },
        },
      });
    } catch { setDraftError("删除失败，草稿仍然保留。"); }
  }

  async function handleExport() {
    if (!exportNode.current || exportBusy.current) return;
    setExportError("");
    if (!poster.version.trim()) {
      setExportError("请先填写版本号。");
      changeView("editor");
      window.setTimeout(() => window.document.getElementById("version")?.focus(), 0);
      return;
    }
    if (!poster.sections.some((section) => section.title || section.eyebrow || section.description || section.image)) {
      setExportError("请至少填写一项更新内容。");
      return;
    }
    const validation = posterSchema.safeParse(poster);
    if (!validation.success) {
      setExportError(validation.error.issues[0]?.message ?? "请检查日志内容");
      return;
    }
    exportBusy.current = true;
    setExporting(true);
    try {
      const size = await exportPoster(exportNode.current, poster, format, scale);
      toast.success(`图片已导出 · ${size.width} × ${size.height} px`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "导出失败，请重试。");
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }

  const exportButton = (
    <Button onClick={() => void handleExport()} disabled={!ready || exporting} className="min-w-27">
      {exporting ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}
      {exporting ? "正在导出" : "导出图片"}
    </Button>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader view={view} onViewChange={changeView} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-6 lg:px-8 lg:pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="secondary">Axolotl Launcher</Badge>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" role="status">
                {saveStatus === "saved" ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> : saveStatus === "error" ? <X className="size-3 text-destructive" /> : <LoaderCircle className="size-3 animate-spin" />}
                {saveStatus === "loading" ? "正在读取草稿" : saveStatus === "saving" ? "保存中" : saveStatus === "error" ? "尚未保存" : "已保存到本机"}
              </span>
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{view === "editor" ? "更新日志" : view === "preview" ? "海报预览" : view === "fonts" ? "字体检测" : "草稿箱"}</h1>
          </div>
          {view !== "fonts" && <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void handleSaveDraft()} disabled={!ready || savingDraft}>
              {savingDraft ? <LoaderCircle className="animate-spin" /> : <Save />}
              另存草稿
            </Button>
            {exportButton}
          </div>}
        </div>

        {storageError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="min-w-0 flex-1">{storageError}</p>
            <Button variant="outline" size="sm" onClick={() => void persist()}><RotateCcw />重试</Button>
            <Button variant="outline" size="sm" onClick={() => exportDocument(poster)}><FileJson />导出 JSON</Button>
          </div>
        )}
        {importError && <div role="alert" className="mb-6 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{importError}</div>}
        {draftError && <div role="alert" className="mb-6 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{draftError}</div>}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 animate-fade-in-up">
            {view !== "fonts" && <div className="mb-7 flex min-h-10 flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <FileJson className="size-4 shrink-0" />
                <span className="max-w-44 truncate font-mono">{poster.version ? `AXL ${poster.version}` : "未命名日志"}</span>
                <ChevronRight className="size-3" />
                <span>{poster.sections.length} 项更新</span>
              </div>
              <div className="flex items-center gap-0.5">
                <IconButton label="撤销" disabled={!canUndo || !ready} onClick={undo}><Undo2 /></IconButton>
                <IconButton label="重做" disabled={!canRedo || !ready} onClick={redo}><Redo2 /></IconButton>
                <span className="mx-1.5 h-4 border-r" />
                <IconButton label="新建日志" disabled={!ready} onClick={newDocument}><FilePlus2 /></IconButton>
                <IconButton label="导入 JSON" disabled={!ready} onClick={() => importInput.current?.click()}><Upload /></IconButton>
                <IconButton label="导出 JSON" disabled={!ready} onClick={() => exportDocument(poster)}><FileJson /></IconButton>
              </div>
            </div>}

            {view === "fonts" && <FontDiagnostics />}

            {view === "editor" && (
              <fieldset disabled={!ready} className="min-w-0 space-y-8 disabled:opacity-60">
                <section className="space-y-5">
                  <h2 className="text-sm font-semibold">版本信息</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="version" className="field-label">版本号</label>
                      <Input id="version" value={poster.version} className="font-mono" maxLength={40} placeholder="1.11.0" aria-invalid={Boolean(exportError && !poster.version.trim())} onChange={(event) => { patch({ version: event.target.value }, "version"); setExportError(""); }} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="channel" className="field-label">发布通道</label>
                      <Select<PosterDocument["channel"]> id="channel" value={poster.channel} onValueChange={(channel) => patch({ channel })} options={[
                        { value: "RELEASE", label: "Release · 正式版" },
                        { value: "BETA", label: "Beta · 测试版" },
                        { value: "ALPHA", label: "Alpha · 内测版" },
                        { value: "SNAPSHOT", label: "Snapshot · 快照版" },
                      ]} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="poster-title" className="field-label">海报标题</label>
                      <Input id="poster-title" value={poster.title} maxLength={100} onChange={(event) => patch({ title: event.target.value }, "title")} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="subtitle" className="field-label">英文副标题</label>
                      <Input id="subtitle" value={poster.subtitle} maxLength={100} onChange={(event) => patch({ subtitle: event.target.value }, "subtitle")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="website" className="field-label">下载地址</label>
                    <Input id="website" value={poster.website} maxLength={120} onChange={(event) => patch({ website: event.target.value }, "website")} />
                  </div>
                </section>

                <section className="space-y-4 border-t pt-7">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">更新项目<span className="grid size-5 place-items-center rounded-full bg-muted font-mono text-[10px] font-normal text-muted-foreground">{poster.sections.length}</span></h2>
                    <Button variant="ghost" size="sm" onClick={addSection} disabled={poster.sections.length >= MAX_SECTIONS}><Plus />添加项目</Button>
                  </div>
                  <div className="space-y-3">
                    {poster.sections.map((section, index) => (
                      <SectionEditor
                        key={section.id}
                        section={section}
                        index={index}
                        total={poster.sections.length}
                        open={openSection === section.id}
                        onOpenChange={toggleSection}
                        onChange={patchSection}
                        onMove={reorder}
                        onDuplicate={duplicate}
                        onDelete={remove}
                      />
                    ))}
                  </div>
                  {poster.sections.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">还没有更新项目</p>}
                  <Button variant="outline" className="w-full border-dashed" onClick={addSection} disabled={poster.sections.length >= MAX_SECTIONS}><Plus />{poster.sections.length >= MAX_SECTIONS ? `已达到 ${MAX_SECTIONS} 项上限` : "添加更新项目"}</Button>
                </section>
                <FooterEditor document={poster} onChange={patch} />
              </fieldset>
            )}

            {view === "preview" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold">完整海报</h2>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>预览宽度</span>
                    <Select aria-label="预览宽度" className="w-24" value={previewWidth} onValueChange={setPreviewWidth} options={[
                      { value: 568, label: "100%" }, { value: 426, label: "75%" }, { value: 284, label: "50%" },
                    ]} />
                  </label>
                </div>
                <div className="preview-surface rounded-lg border px-3 py-5 sm:px-5">
                  <ScaledPoster document={preview} maxWidth={previewWidth} />
                </div>
              </section>
            )}

            {view === "drafts" && (
              <section className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">已保存的草稿<span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{drafts.length}</span></h2>
                  <Button variant="ghost" size="sm" onClick={() => void refreshDrafts()} disabled={draftsLoading}><RotateCcw className={cn(draftsLoading && "animate-spin")} />刷新</Button>
                </div>
                {draftsLoading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在读取</div>}
                {!draftsLoading && drafts.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-16">
                    <FolderOpen className="size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">还没有保存的草稿</p>
                    <Button variant="outline" onClick={() => void handleSaveDraft()} disabled={!ready || savingDraft}><Save />保存当前日志</Button>
                  </div>
                )}
                {!draftsLoading && drafts.map((draft) => (
                  <div key={draft.id} className="flex items-center gap-4 rounded-2xl border p-4">
                    <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left" onClick={() => { update(draft.document); setOpenSection(draft.document.sections[0]?.id ?? null); changeView("editor"); toast("草稿已打开，原内容可通过撤销恢复"); }}>
                      <div className="draft-thumbnail flex h-20 w-16 shrink-0 flex-col justify-center overflow-hidden rounded-md px-1.5 text-white">
                        <img src="/template/brand.svg" alt="" width={64} height={12} />
                        <span className="mt-1 break-all font-mono text-xs font-bold">{draft.document.version}</span>
                        <span className="mt-1 text-[7px]">{draft.document.title}</span>
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate text-sm font-medium">{draft.name}</p>
                        <p className="text-xs text-muted-foreground">{draft.document.sections.length} 项更新 · {draft.document.channel}</p>
                        <p className="text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(draft.updatedAt)}</p>
                      </div>
                    </button>
                    <IconButton label={`删除草稿 ${draft.name}`} onClick={() => void handleDeleteDraft(draft)}><Trash2 /></IconButton>
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-20">
            <section className="overflow-hidden rounded-2xl border">
              <div className="flex h-12 items-center justify-between border-b px-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><span className="size-1.5 rounded-full bg-emerald-500" />实时预览</h2>
                <IconButton label="查看完整海报" size="icon-sm" onClick={() => changeView("preview")}><Expand className="size-3.5" /></IconButton>
              </div>
              <div className="preview-surface max-h-[420px] overflow-y-auto overscroll-contain p-3">
                <ScaledPoster document={preview} />
              </div>
              <div className="flex items-center justify-between border-t px-4 py-2.5 text-[10px] text-muted-foreground">
                <span className="font-mono">{POSTER_WIDTH} × {height} px</span>
                <span>高度自适应</span>
              </div>
            </section>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">导出设置</h2>
                <ImageDown className="size-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="field-label" htmlFor="export-format">图片格式</label>
                  <Select<"png" | "jpeg"> id="export-format" value={format} onValueChange={setFormat} disabled={exporting} options={[
                    { value: "png", label: "PNG" }, { value: "jpeg", label: "JPEG" },
                  ]} />
                </div>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="export-scale">导出倍率</label>
                  <Select id="export-scale" value={scale} onValueChange={setScale} disabled={exporting} options={[
                    { value: 1, label: "1× · 原始" }, { value: 2, label: "2× · 高清" }, { value: 3, label: "3× · 超清" },
                  ]} />
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between text-xs">
                AXL 品牌水印
                <Checkbox checked={poster.showWatermark} onCheckedChange={(checked) => patch({ showWatermark: Boolean(checked) })} disabled={!ready} />
              </label>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>导出尺寸</span><span className="font-mono">{POSTER_WIDTH * scale} × {height * scale} px</span></div>
              <Button className="w-full" onClick={() => void handleExport()} disabled={!ready || exporting}>
                {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
                {exporting ? "正在生成图片" : `导出 ${format.toUpperCase()}`}
              </Button>
              {exportError && <p role="alert" className="text-xs leading-5 text-destructive">{exportError}</p>}
            </section>
            <section className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium">经典粉色 · 1.10.0</p>
                <Badge variant="outline" className="text-[10px]">原版模板</Badge>
              </div>
              <div className="flex items-center justify-between">
                <button className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={useTemplate} disabled={!ready}><RotateCcw className="size-3" />重新载入</button>
                <a href="/template/original.webp" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">查看原图<ArrowUpRight className="size-3" /></a>
              </div>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
      <input ref={importInput} type="file" accept=".json,application/json" className="sr-only" aria-label="导入日志文件" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
      <div aria-hidden="true" data-testid="export-source" className="export-source"><PosterCanvas document={poster} posterRef={exportNode} /></div>
    </div>
  );
}
