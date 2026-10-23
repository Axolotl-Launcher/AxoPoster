"use client";

import { Ban, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IconButton } from "@/components/icon-button";
import { Select } from "@/components/select";
import { getLinkIcon, linkIcons, type PosterDocument, type PosterLink } from "@/lib/poster";
import { cn } from "@/lib/utils";

const iconOptions = linkIcons.map(({ value, label, src }) => ({
  value, label,
  icon: src
    ? <img src={src} alt="" width={20} height={20} className="size-5 shrink-0" />
    : <Ban aria-hidden className="size-5 text-muted-foreground" />,
}));

export function FooterEditor({
  document,
  onChange,
}: {
  document: PosterDocument;
  onChange: (patch: Partial<PosterDocument>, group?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  function updateLink(index: number, patch: Partial<Pick<PosterLink, "label" | "value" | "icon">>, group = "") {
    onChange({
      links: document.links.map((link, i) => i === index ? { ...link, ...patch } : link),
    }, group ? `link.${document.links[index].id}.${group}` : "");
  }

  return (
    <section className="border-t pt-7">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-4">
          <CollapsibleTrigger className="flex cursor-pointer items-center gap-2 rounded-md text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
            页脚与相关链接
          </CollapsibleTrigger>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={document.showFooter} onCheckedChange={(checked) => onChange({ showFooter: Boolean(checked) })} />
            显示页脚
          </label>
        </div>
        <CollapsibleContent>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="footer-title" className="field-label">页脚标题</label>
              <Input id="footer-title" value={document.footerTitle} maxLength={100} onChange={(event) => onChange({ footerTitle: event.target.value }, "footerTitle")} />
            </div>
            <div className="space-y-3">
              {document.links.map((link, index) => (
                <div key={link.id} className="grid grid-cols-[104px_minmax(0,1fr)_32px] items-center gap-2 sm:grid-cols-[104px_110px_minmax(0,1fr)_32px]">
                  <Select aria-label={`链接 ${index + 1} 图标`} value={getLinkIcon(link).value} options={iconOptions} onValueChange={(icon) => updateLink(index, { icon })} />
                  <Input aria-label={`链接 ${index + 1} 名称`} value={link.label} placeholder="名称" maxLength={80} onChange={(event) => updateLink(index, { label: event.target.value }, "label")} />
                  <Input className="col-span-3 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1" aria-label={`链接 ${index + 1} 内容`} value={link.value} placeholder="链接或群号" maxLength={400} onChange={(event) => updateLink(index, { value: event.target.value }, "value")} />
                  <IconButton className="col-start-3 row-start-1 sm:col-start-4" label={`删除链接 ${index + 1}`} onClick={() => onChange({ links: document.links.filter((_, i) => i !== index) })}><Trash2 className="size-3.5" /></IconButton>
                </div>
              ))}
              {document.links.length < 16 && <Button variant="ghost" size="sm" onClick={() => onChange({ links: [...document.links, { id: crypto.randomUUID(), label: "", value: "", icon: "pink" }] })}><Plus />添加链接</Button>}
            </div>
            <div className="space-y-2">
              <label htmlFor="disclaimer" className="field-label">项目声明</label>
              <Textarea id="disclaimer" value={document.disclaimer} className="min-h-32 resize-y leading-6" maxLength={5000} onChange={(event) => onChange({ disclaimer: event.target.value }, "disclaimer")} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
