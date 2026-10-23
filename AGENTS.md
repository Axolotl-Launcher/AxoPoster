<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AxoPoster 项目约定

## 项目定位

- AxoPoster 是制作 Axolotl Launcher 更新日志海报的网页编辑器。
- 用户在网页中编辑版本信息、更新项目、配图、相关链接和项目声明。
- 海报基于根目录的 `AXL1.10.0.svg`，采用固定 568px 宽度、随内容自动增长高度的流式排版。
- 支持实时预览、PNG/JPEG 导出、JSON 导入导出、撤销重做和本地草稿。
- 当前为本地优先的前端应用。数据保存在浏览器 IndexedDB 中，不依赖账号、数据库服务或上传接口。
- 更完整的功能说明见 `README.md`，设计约定见 `DESIGN.md`。

## 技术栈

- Next.js 16 App Router、React 19、TypeScript。
- Tailwind CSS 4、shadcn `base-rhea` 预设、`neutral` 基础色、Base UI 组件。
- Lucide 图标、`next-themes` 明暗主题、Sonner 消息提示。
- `idb-keyval` 管理 IndexedDB，Zod 校验项目数据。
- `html-to-image` 在浏览器中导出图片。
- Playwright 仅用于必要的冒烟检查。
- 使用 npm 管理依赖，维护 `package-lock.json`，不要无故切换包管理器或升级依赖。

## 主要文件

| 路径 | 职责 |
| --- | --- |
| `src/app/layout.tsx` | 全局布局、主题和提示组件 |
| `src/app/page.tsx` | 编辑器页面入口 |
| `src/app/globals.css` | 与 AxoDraw 一致的界面样式和主题变量 |
| `src/app/poster.css` | 海报排版，不与应用明暗主题混用 |
| `src/components/poster-editor.tsx` | 编辑、预览、草稿及导出流程 |
| `src/components/poster-canvas.tsx` | 海报内容渲染与缩放预览 |
| `src/components/section-editor.tsx` | 单个更新项目编辑 |
| `src/components/footer-editor.tsx` | 页脚、链接和声明编辑 |
| `src/components/ui/` | 复用的 shadcn / Base UI 基础组件 |
| `src/hooks/use-poster.ts` | 编辑状态、撤销重做和自动保存 |
| `src/lib/poster.ts` | 数据结构、校验规则和默认模板内容 |
| `src/lib/storage.ts` | 自动保存及草稿存储 |
| `src/lib/images.ts` | 本地图片处理和文件下载 |
| `src/lib/export.ts` | 图片和 JSON 导出 |
| `public/template/` | 从原 SVG 提取的素材 |
| `public/fonts/` | 本地字体及许可证 |
| `scripts/extract-template.mjs` | 从原 SVG 重新提取模板素材 |
| `scripts/smoke.mjs` | 最小浏览器冒烟检查 |
| `artifacts/` | 本地截图、日志及导出样张，不提交到 Git |

## 设计与实现边界

- 整体界面参照同级目录 `../AxoDraw/`，保持相同的 shadcn 预设、主题变量、顶部标签导航和主栏加 300px 辅助栏布局。
- AxoDraw 是参考项目；未经用户明确要求，不修改其文件。
- 优先复用现有组件和样式，不另造设计系统，不进行无关重构。
- 保留原模板的粉色背景、品牌图、网点、水印和左右交替图文结构。
- 不覆盖或修改用户提供的 `AXL1.10.0.svg`。生成素材与源文件分开保存。
- 文本必须保持可编辑、可换行，内容增加时区块和海报自然增高，不使用固定高度裁掉内容。
- 预览缩放不得改变实际海报尺寸。导出必须使用完整、未缩放的海报，不能只截取可见预览区域。
- 海报不随应用深浅色主题改变颜色；字体和素材优先使用项目本地文件。
- 修改数据结构时兼顾旧草稿和 JSON 文件的兼容性，不静默丢弃用户内容。
- 存储、图片处理或导出失败时保留当前编辑内容，并提供明确反馈。
- 不擅自增加后端、账号、云存储、数据上报或外部付费服务。

## 测试约定：只做冒烟测试

**用户明确要求：不要进行过多自行测试；只做必要的冒烟测试。真机测试由用户本人负责。**

- 不自行进行真机测试，不连接真实设备、设备模拟器或远程真机测试平台。
- 不默认开展完整回归、全面端到端测试、多浏览器或多设备兼容性测试，也不进行多轮视觉评审和截图比对。
- 冒烟检查仅覆盖当前改动涉及的关键路径，例如页面能打开、编辑能更新预览、内容增加时高度能增长、图片能正常导出且不为空。
- 需要查看移动布局时，可在浏览器中做一次必要的视口检查；这不属于真机验证，也不得据此声称真机测试通过。
- 源码变更可执行 `npm run typecheck` 和 `npm run lint`，这两项属于基础静态检查。
- 仅修改文档或 Git 配置时，检查文件内容和 Git 状态即可，不必启动应用或运行浏览器测试。
- 不默认运行生产构建、全量测试、压力测试或反复重复检查；只有用户明确要求时才扩大验证范围。
- 遇到与当前改动无关的测试或环境问题，说明情况，不擅自扩展排查范围。
- 交付时如实列出已做的最小检查，不将未执行的流程或设备验证描述为已通过。

## 常用命令

```bash
npm install
npm run dev
npm run dev -- --hostname 127.0.0.1 --port 3127
npm run typecheck
npm run lint
npm run test:smoke
npm run assets:extract
```

- 默认开发端口为 3000；本项目此前使用 3127。启动前确认端口占用，不停止其他项目的服务。
- 冒烟脚本默认访问 `http://127.0.0.1:3127`，可用 `SMOKE_URL` 覆盖。
- 可用 `CHROME_PATH` 指定已有的 Chromium 可执行文件，不为常规检查自动安装额外浏览器或设备环境。
- `scripts/prepare-fonts.py` 仅用于转换源字体，不是开发启动或构建的前置步骤。

## Git 与协作

- 保留用户已有改动，不执行未经请求的重置、清理或覆盖操作。
- 不提交 `node_modules/`、`.next/`、环境变量、凭据、日志及本地测试产物。
- 原始模板、提取后的正式素材、本地字体和许可证属于项目资源，应纳入版本管理。
- 提交、添加远程仓库和推送由用户明确要求后再执行。
- 修改前先阅读相关代码；交付说明使用中文，简洁描述改动、检查结果和未验证事项。
