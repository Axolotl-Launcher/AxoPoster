"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type View = "editor" | "preview" | "drafts" | "fonts";

export function SiteHeader({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-4 sm:flex sm:h-14 sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" onClick={(event) => { event.preventDefault(); onViewChange("editor"); }} className="group flex h-14 shrink-0 items-center gap-2.5" aria-label="AxoPoster 首页">
          <img src="/axolotl-bucket.png" alt="" width={32} height={32} className="size-8 object-contain transition-transform group-hover:scale-105" />
          <span className="text-sm font-semibold">AxoPoster</span>
        </Link>
        <nav aria-label="主导航" className="order-3 col-span-2 min-w-0 pb-2 sm:order-none sm:pb-0">
          <Tabs value={view} onValueChange={(value) => onViewChange(value as View)}>
            <TabsList variant="line" className="w-full gap-0 sm:w-fit sm:gap-1">
              <TabsIndicator />
              <TabsTrigger value="editor" className="px-2 text-xs sm:px-3 sm:text-sm">编辑日志</TabsTrigger>
              <TabsTrigger value="preview" className="px-2 text-xs sm:px-3 sm:text-sm">海报预览</TabsTrigger>
              <TabsTrigger value="drafts" className="px-2 text-xs sm:px-3 sm:text-sm">草稿箱</TabsTrigger>
              <TabsTrigger value="fonts" className="px-2 text-xs sm:px-3 sm:text-sm">字体检测</TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
