export const posterFontFiles = [
  { family: "Poster Sans", file: "noto-sans-sc.woff2", weight: "100 900" },
  { family: "Anton SC", file: "anton-sc.woff2", weight: "400" },
  { family: "Poster DIN", file: "barlow-semibold.woff2", weight: "600" },
  { family: "Poster DIN", file: "barlow-bold.woff2", weight: "700" },
] as const;

export type FontSample = { label: string; text: string; weight: number };
export type FontDefinition = {
  id: string;
  name: string;
  family: string;
  source: "bundled" | "system";
  usage: string;
  weight: string;
  files?: readonly { file: string; weight: string }[];
  fallbackId?: string;
  samples: readonly FontSample[];
};

export const fontDefinitions: readonly FontDefinition[] = [
  {
    id: "noto", name: "Noto Sans SC", family: "Poster Sans",
    source: "bundled", usage: "中文标题、正文与页脚", weight: "100 900",
    files: posterFontFiles.filter((font) => font.family === "Poster Sans"),
    samples: [
      { label: "正文", text: "更新日志与项目声明 Aa 0123456789", weight: 500 },
      { label: "链接名称", text: "官网 GitHub 仓库", weight: 700 },
      { label: "标题", text: "更新内容速览 RELEASE", weight: 900 },
    ],
  },
  {
    id: "anton", name: "Anton SC", family: "Anton SC",
    source: "bundled", usage: "下载地址", weight: "400",
    files: posterFontFiles.filter((font) => font.family === "Anton SC"),
    samples: [{ label: "下载地址", text: "AXLMC.ORG 0123456789", weight: 400 }],
  },
  {
    id: "bahnschrift", name: "Bahnschrift", family: "Bahnschrift",
    source: "system", usage: "版本号、英文副标题与链接", weight: "300 700",
    fallbackId: "barlow",
    samples: [
      { label: "版本号", text: "1.10.0 0123456789", weight: 700 },
      { label: "英文副标题", text: "UPDATE OVERVIEW", weight: 700 },
      { label: "链接", text: "github.com/Axolotl-Launcher", weight: 600 },
    ],
  },
  {
    id: "barlow", name: "Barlow", family: "Poster DIN",
    source: "bundled", usage: "Bahnschrift 的备用字体", weight: "600 700",
    files: posterFontFiles.filter((font) => font.family === "Poster DIN"),
    samples: [
      { label: "链接", text: "axlmc.org / Axolotl-Launcher", weight: 600 },
      { label: "版本号", text: "1.10.0 UPDATE OVERVIEW", weight: 700 },
    ],
  },
  {
    id: "inter", name: "Inter", family: "Inter",
    source: "bundled", usage: "编辑器界面", weight: "100 900",
    files: [{ file: "inter.woff2", weight: "100 900" }],
    samples: [
      { label: "正文", text: "AxoPoster / PNG / JPEG", weight: 400 },
      { label: "标题", text: "Aa Bb 0123456789", weight: 600 },
    ],
  },
];
