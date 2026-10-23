import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "./poster.css";

export const metadata: Metadata = {
  title: "AxoPoster · Axolotl Launcher 更新日志",
  description: "Axolotl Launcher 更新日志编辑器",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="antialiased">
      <body>
        <ThemeProvider>
          <TooltipProvider delay={300}>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
