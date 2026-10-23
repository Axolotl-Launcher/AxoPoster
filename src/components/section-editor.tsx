"use client";

import { memo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IconButton } from "@/components/icon-button";
import { Select } from "@/components/select";
import { categoryLabels, type PosterSection } from "@/lib/poster";
import { readImage } from "@/lib/images";
import { cn } from "@/lib/utils";

export const SectionEditor = memo(function SectionEditor({
  section,
  index,
  total,
  open,
  onOpenChange,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  section: PosterSection;
  index: number;
  total: number;
  open: boolean;
  onOpenChange: (id: string) => void;
  onChange: (id: string, patch: Partial<PosterSection>, group?: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setImageError("");
    try {
      onChange(section.id, { image: await readImage(file) });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  function textChange(field: "eyebrow" | "title" | "description") {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(section.id, { [field]: event.target.value }, `${section.id}.${field}`);
  }

  return (
    <Collapsible open={open} onOpenChange={() => onOpenChange(section.id)} className="update-editor overflow-hidden rounded-2xl border">
      <div className={cn("flex min-h-16 items-center gap-1 px-3 sm:px-4", open && "bg-muted/35")}>
        <CollapsibleTrigger className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg" aria-label={`${open ? "收起" : "展开"}更新项目 ${index + 1}`}>
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{[section.eyebrow, section.title].filter(Boolean).join(" · ") || "未命名更新"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", section.category === "问题修复" ? "bg-amber-500" : section.category === "优化项目" ? "bg-sky-500" : "bg-emerald-500")} />
              {section.category}
              {section.image && <><span className="mx-0.5 text-border">/</span><Check className="size-3" />已配图</>}
            </p>
          </div>
          <ChevronDown className={cn("mr-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <IconButton label={`删除更新项目 ${index + 1}`} onClick={() => onDelete(section.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></IconButton>
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-5 border-t p-4 sm:p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="max-w-44 space-y-2">
              <label htmlFor={`category-${section.id}`} className="field-label">更新分类</label>
              <Select id={`category-${section.id}`} value={section.category} onValueChange={(category) => onChange(section.id, { category })} options={
                categoryLabels.map((category) => ({ value: category, label: category }))
              } />
            </div>
            <div className="flex items-center gap-0.5">
              <IconButton label="上移项目" disabled={index === 0} onClick={() => onMove(section.id, -1)}><ArrowUp /></IconButton>
              <IconButton label="下移项目" disabled={index === total - 1} onClick={() => onMove(section.id, 1)}><ArrowDown /></IconButton>
              <span className="mx-1 h-4 border-r" />
              <IconButton label="复制项目" onClick={() => onDuplicate(section.id)}><Copy className="size-3.5" /></IconButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="field-label" htmlFor={`eyebrow-${section.id}`}>上行标题</label>
              <Input id={`eyebrow-${section.id}`} value={section.eyebrow} onChange={textChange("eyebrow")} maxLength={120} placeholder="例如：种子地图功能" />
            </div>
            <div className="space-y-2">
              <label className="field-label" htmlFor={`title-${section.id}`}>重点标题</label>
              <Input id={`title-${section.id}`} value={section.title} onChange={textChange("title")} maxLength={160} placeholder="例如：大幅度增强" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="field-label" htmlFor={`description-${section.id}`}>更新内容</label>
            <Textarea id={`description-${section.id}`} className="min-h-24 resize-y leading-6" value={section.description} onChange={textChange("description")} maxLength={10000} placeholder="填写这项更新的具体变化" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor={`image-${section.id}`}>更新配图</label>
              <span className="text-[11px] text-muted-foreground">PNG / JPG / WebP · 最大 12 MB</span>
            </div>
            <input ref={fileInput} id={`image-${section.id}`} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
            <div
              className={cn("flex min-h-28 items-center gap-4 rounded-xl border border-dashed p-3 transition-colors", dragging ? "border-ring bg-muted" : "bg-muted/20")}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}
            >
              {section.image ? (
                <img src={section.image} alt="当前更新配图" className="h-24 w-36 shrink-0 rounded-md border object-contain max-[440px]:w-24" />
              ) : <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted"><ImagePlus className="size-6 text-muted-foreground" /></div>}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                  {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
                  {uploading ? "正在处理" : section.image ? "替换图片" : "选择图片"}
                </Button>
                {section.image && <button className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => onChange(section.id, { image: "" })}><X className="size-3" />移除配图</button>}
              </div>
            </div>
            {imageError && <p role="alert" className="text-xs text-destructive">{imageError}</p>}
          </div>
          {section.image && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="field-label" htmlFor={`position-${section.id}`}>图片位置</label>
                <Select<PosterSection["imagePosition"]> id={`position-${section.id}`} value={section.imagePosition} onValueChange={(imagePosition) => onChange(section.id, { imagePosition })} options={[
                  { value: "auto", label: "自动交替" }, { value: "left", label: "图片在左" }, { value: "right", label: "图片在右" },
                ]} />
              </div>
              <div className="space-y-2">
                <label className="field-label" htmlFor={`fit-${section.id}`}>图片适配</label>
                <Select<PosterSection["imageFit"]> id={`fit-${section.id}`} value={section.imageFit} onValueChange={(imageFit) => onChange(section.id, { imageFit })} options={[
                  { value: "contain", label: "完整显示" }, { value: "cover", label: "裁切填充" },
                ]} />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
