import { z } from "zod";

export const POSTER_WIDTH = 568;
export const MAX_SECTIONS = 30;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_IMPORT_BYTES = 40 * 1024 * 1024;
export const categoryLabels = ["全新功能", "优化项目", "问题修复", "新增功能"] as const;
export const linkIconIds = ["none", "pink", "blue", "cyan", "gold", "rainbow"] as const;
export type LinkIcon = typeof linkIconIds[number];
export const linkIcons: readonly { value: LinkIcon; label: string; src: string | null }[] = [
  { value: "none", label: "无图标", src: null },
  { value: "pink", label: "粉色", src: "/template/link-icons/pink.png" },
  { value: "blue", label: "蓝色", src: "/template/link-icons/blue.png" },
  { value: "cyan", label: "冰蓝", src: "/template/link-icons/cyan.png" },
  { value: "gold", label: "金色", src: "/template/link-icons/gold.png" },
  { value: "rainbow", label: "彩虹", src: "/template/link-icons/rainbow.png" },
];
const originalLinkIcons: Partial<Record<string, LinkIcon>> = {
  website: "pink", github: "blue", qq: "pink", beta: "cyan",
  channel: "rainbow", sponsor: "gold", discord: "rainbow",
};
export const templateImages = [
  "/template/seed-map.webp",
  "/template/modpack.webp",
  "/template/crash-analysis.webp",
  "/template/content.webp",
  "/template/download.webp",
  "/template/network.webp",
] as const;

const imageSchema = z.string().max(18 * 1024 * 1024).refine(
  (value) =>
    value === "" ||
    (templateImages as readonly string[]).includes(value) ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),
  "图片必须为本地 PNG、JPEG 或 WebP",
);

export const sectionSchema = z.object({
  id: z.string().min(1).max(100),
  category: z.enum(categoryLabels),
  eyebrow: z.string().max(120),
  title: z.string().max(160),
  description: z.string().max(10000),
  image: imageSchema,
  imagePosition: z.enum(["auto", "left", "right"]),
  imageFit: z.enum(["contain", "cover"]),
});

export const posterSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.string().max(40),
  title: z.string().max(100),
  subtitle: z.string().max(100),
  channel: z.enum(["RELEASE", "BETA", "ALPHA", "SNAPSHOT"]),
  website: z.string().max(120),
  sections: z.array(sectionSchema).max(MAX_SECTIONS).refine(
    (sections) => new Set(sections.map((section) => section.id)).size === sections.length,
    "更新项目的 ID 不能重复",
  ),
  showFooter: z.boolean(),
  showWatermark: z.boolean(),
  footerTitle: z.string().max(100),
  links: z.array(z.object({
    id: z.string().min(1).max(100),
    label: z.string().max(80),
    value: z.string().max(400),
    icon: z.enum(linkIconIds).optional(),
  })).max(16).refine(
    (links) => new Set(links.map((link) => link.id)).size === links.length,
    "链接的 ID 不能重复",
  ),
  disclaimer: z.string().max(5000),
});

export type PosterDocument = z.infer<typeof posterSchema>;
export type PosterSection = z.infer<typeof sectionSchema>;
export type PosterLink = PosterDocument["links"][number];
export type SavedDraft = {
  id: string;
  name: string;
  updatedAt: number;
  document: PosterDocument;
};

export function getLinkIcon(link: PosterLink) {
  // Legacy documents omit icon; an explicit "none" must remain icon-free.
  const value = link.icon ?? originalLinkIcons[link.id] ?? "none";
  return linkIcons.find((icon) => icon.value === value) ?? linkIcons[0];
}

export function newSection(): PosterSection {
  return {
    id: crypto.randomUUID(),
    category: "全新功能",
    eyebrow: "",
    title: "",
    description: "",
    image: "",
    imagePosition: "auto",
    imageFit: "contain",
  };
}

export function createTemplate(): PosterDocument {
  return {
    schemaVersion: 1,
    version: "1.10.0",
    title: "更新内容速览",
    subtitle: "UPDATE OVERVIEW",
    channel: "RELEASE",
    website: "AXLMC.ORG",
    showFooter: true,
    showWatermark: true,
    footerTitle: "相关链接及说明",
    sections: [
      {
        id: "seed-map",
        category: "全新功能",
        eyebrow: "种子地图功能",
        title: "大幅度增强",
        description: "种子地图现已支持快速预览结构，查找区域范围内指定战利品等功能。",
        image: templateImages[0],
        imagePosition: "auto",
        imageFit: "contain",
      },
      {
        id: "modpack",
        category: "全新功能",
        eyebrow: "支持导入更多",
        title: "整合包格式",
        description: "GTNH 等整合包已经能够导入至启动器内。",
        image: templateImages[1],
        imagePosition: "auto",
        imageFit: "contain",
      },
      {
        id: "crash-analysis",
        category: "优化项目",
        eyebrow: "本地 AI",
        title: "崩溃日志分析",
        description: "用你自己的 AI，诊断你的崩溃。\n\n注意：此项不等于启动器内置了免费 AI。",
        image: templateImages[2],
        imagePosition: "auto",
        imageFit: "contain",
      },
      {
        id: "content",
        category: "优化项目",
        eyebrow: "内容管理",
        title: "重新设计",
        description: "大范围重构内容管理，\n整合 Modrinth、CurseForge 等来源的内容。",
        image: templateImages[3],
        imagePosition: "auto",
        imageFit: "contain",
      },
      {
        id: "download",
        category: "优化项目",
        eyebrow: "大幅提升",
        title: "下载速度",
        description: "对下载速度再一次进行了优化。",
        image: templateImages[4],
        imagePosition: "auto",
        imageFit: "contain",
      },
      {
        id: "network",
        category: "新增功能",
        eyebrow: "连接情况",
        title: "快速检测",
        description: "快速检测你和下载源的网络连接状况。",
        image: templateImages[5],
        imagePosition: "auto",
        imageFit: "contain",
      },
    ],
    links: [
      { id: "website", label: "官网", value: "axlmc.org", icon: "pink" },
      { id: "github", label: "GitHub 仓库", value: "github.com/Axolotl-Launcher/Axolotl", icon: "blue" },
      { id: "qq", label: "官方二群", value: "QQ:830619067", icon: "pink" },
      { id: "beta", label: "官方 Beta 测试群", value: "QQ:250705495（请先进入二群）", icon: "cyan" },
      { id: "channel", label: "官方频道", value: "QQ频道: Axolotl2026", icon: "rainbow" },
      { id: "sponsor", label: "赞助链接", value: "afdian.com/a/Mystic-Stars", icon: "gold" },
      { id: "discord", label: "Discord", value: "discord.gg/CrtbsntYp7", icon: "rainbow" },
    ],
    disclaimer: "Axolotl Launcher（简称 AXL）是开源项目 Modrinth 代码库的修改版本。Modrinth 是 Rinth, Inc. 的商标。\n\nAxolotl Launcher 与 Rinth, Inc. 无关联，亦未获得其认可。\n\nAxolotl Launcher 以 GPL-3.0 许可发布。",
  };
}

export function parsePoster(source: string): PosterDocument {
  const parsed: unknown = JSON.parse(source);
  const result = posterSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`日志文件格式不正确：${result.error.issues[0]?.message ?? "缺少必要字段"}`);
  }
  return result.data;
}

export function getFilename(document: PosterDocument) {
  return `AXL-${document.version.replace(/[^a-zA-Z0-9._-]/g, "_") || "changelog"}`;
}

export function moveSection(document: PosterDocument, id: string, direction: -1 | 1): PosterDocument {
  const index = document.sections.findIndex((section) => section.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= document.sections.length) return document;
  const sections = [...document.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...document, sections };
}
