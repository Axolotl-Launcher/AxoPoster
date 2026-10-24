# AxoPoster

Axolotl Launcher 更新日志海报编辑器。

海报基于 `AXL1.10.0.svg`，固定宽度 568px，高度随内容增长。可以编辑版本信息、更新项目、配图、相关链接和声明，并导出 PNG / JPEG。

## 使用

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。需要使用其他端口时：

```bash
npm run dev -- --port 3127
```

## 功能

- 编辑版本信息、发布通道、更新项目和页脚内容
- 上传 PNG、JPEG、WebP 配图，支持位置和适配方式
- 实时预览，导出完整海报 PNG / JPEG，支持 1× / 2× / 3×
- 本地自动保存和草稿箱
- JSON 导入导出、撤销和重做
- 本地字体检测

## 数据

数据只保存在浏览器 IndexedDB 中，不需要账号、数据库或上传接口。图片在浏览器中处理，原始 SVG 不会被修改。

## 开发命令

```bash
npm run typecheck
npm run lint
npm run test:smoke
npm run assets:extract
```

`assets:extract` 会从根目录的 `AXL1.10.0.svg` 重新生成 `public/template/` 中的素材。仅更新背景、品牌、水印或页脚图标时，可以使用：

```bash
npm run assets:extract -- --decorations-only
```

## 目录

```text
src/app/          页面和样式
src/components/   编辑器、预览和 UI 组件
src/hooks/        编辑状态和自动保存
src/lib/          数据、存储、图片和导出
public/template/  海报模板素材
public/fonts/     本地字体和许可证
scripts/          素材提取和冒烟检查
```

Vercel 可以直接识别这个 Next.js 项目，不需要额外环境变量。
