import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2"><img src="/axolotl-bucket.png" alt="" width={20} height={20} />AxoPoster <span className="mx-1 text-border">/</span>Axolotl Launcher</span>
        <a href="https://axlmc.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">Axolotl Launcher 官网<ArrowUpRight className="size-3.5" /></a>
      </div>
    </footer>
  );
}
