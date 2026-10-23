# AxoPoster

用于制作 Axolotl Launcher 更新日志的网页编辑器。

界面沿用 AxoDraw 的 shadcn `base-rhea` / `neutral` 预设、Base UI
组件、明暗主题、顶部导航和主栏 + 300px 辅助栏布局。
海报以提供的 `AXL1.10.0.svg` 为模板。

## 启动

```bash
npm install
npm run dev
```

默认地址：`http://localhost:3000`。
指定端口：`npm run dev -- --port 3127`。

## 已实现

- 编辑版本号、发布通道、海报标题、副标题、下载地址。
- 编辑更新分类、两级标题、正文；换行和内容长度自动决定海报高度。
- 增加、删除、复制、上下移动更新项目，最多 30 项。
- 上传或拖入 PNG / JPEG / WebP 配图；选择图片位置和适配方式。
- 原 SVG 的品牌图、AXL 水印及六张截图直接复用，点阵按原稿的交错网格重新生成。
- 编辑底部链接和声明；每条链接可选原 SVG 提取的五款图标或无图标，切换页脚、水印是否显示。
- 实时预览、完整海报预览、PNG / JPEG 导出，支持 1× / 2× / 3×。
- IndexedDB 自动保存当前编辑内容，以及独立的本地草稿箱。
- JSON 导入导出、内容撤销重做、保存失败提示。
- 浅色、深色和跟随系统主题。
- 顶部“字体检测”：检查本地字体文件、系统字体可访问性及字形样本，支持按名称检测和报告下载。

## 数据与导出

数据只存放在当前浏览器的 IndexedDB 中，不上传服务器。
清除浏览器数据或更换设备不会保留草稿，请使用 JSON 文件备份或迁移。
图片会在本地解码并缩小至最长边 2400px，单张输入上限 12 MB。

海报使用固定 568px 排版宽度，高度随内容变化。
图片导出捕获未缩放的完整海报，而非可见预览区域。
背景分为渐变底色、固定尺寸的可平铺点阵、跟随页脚位置的美西螈水印；
增减内容只延展点阵，不压扁或拉长圆点与水印。
点阵的疏密周期固定为 576px，按圆点面积平滑过渡并保留最小可见半径；
透明度不再随整张海报高度渐隐，避免长海报出现大段近乎空白的区域。
为避免浏览器 Canvas 超限，导出高度上限为 30000px，总像素上限
为 8000 万；超限时会提示降低倍率。

原始 SVG 保持不变。模板适配为可编辑的 HTML/CSS 流式排版，
不是把文字直接覆盖在原图上，也不是逐像素固定坐标还原。
PNG 和 JPEG 是成品图片；JSON 是可继续编辑的项目文件。
旧版 JSON / 草稿缺少图标字段时，原模板链接恢复对应图标，自定义链接保持无图标，
不改动原有名称和内容；显式选择“无图标”会保留。

## 海报字体

- 品牌字和顶部 AXOLOTL 大水印保留 SVG 原始的 Anton SC 矢量轮廓，水印独立成层。
- 中文标题、发布通道和下载提示使用本地 Noto Sans SC；下载地址使用本地 Anton SC Regular。
- 版本号、英文副标题和链接内容优先使用设备已安装的 Bahnschrift，
  未安装时回退到随项目提供的 Barlow。项目不分发 Windows 系统字体。
- PNG / JPEG 导出内嵌本地 Web 字体，预览和导出使用相同的字体栈。

“字体检测”单独检查 Noto Sans SC、Anton SC、Bahnschrift、Barlow 和 Inter，
按实际使用的字重展示样张。项目字体先读取本地文件并解码，系统字体只按指定名称
请求 `local()`，不枚举全部已安装字体，不上传检测数据。
Canvas 将页面字体与临时参考字体逐像素比较，并对疑似回退字符标注“待核对”。
Bahnschrift 不可访问时继续验证 Barlow 回退。检测结束会释放临时字体。
结果仅覆盖当前浏览器中列出的字重与样本，不代表全部字符、其他设备或导出效果。

## 开发

```bash
npm run typecheck
npm run lint
npm run test:smoke
```

冒烟脚本默认访问 `http://127.0.0.1:3127`，可通过 `SMOKE_URL` 覆盖。
脚本使用 Playwright Chromium，可通过 `CHROME_PATH` 指定已安装的浏览器。
依用户要求只做冒烟检查，不包含完整回归或真机测试。

`npm run assets:extract` 可以从原 SVG 重新生成模板素材。
仅更新背景、品牌、水印和页脚图标时可运行
`npm run assets:extract -- --decorations-only`。
点阵生成逻辑位于 `scripts/template-background.mjs`，运行素材提取命令时同步生成。
页脚与背景的专项冒烟可运行 `node --import tsx scripts/smoke-layout.mjs`，
同样支持 `SMOKE_URL` 和 `CHROME_PATH`。
长海报点阵专项冒烟为 `node --import tsx scripts/smoke-background.mjs`。
字体检测专项冒烟为 `node scripts/smoke-fonts.mjs`。
Web 字体已随项目提供，无运行时外部字体请求。字体许可证位于
`public/fonts/`。`scripts/prepare-fonts.py` 仅用于将源字体转换为 WOFF2，
不是启动或构建所需步骤。

## 主要目录

```text
src/app/                  页面入口、界面样式和海报样式
src/components/           编辑器、预览、草稿和复用的 shadcn 组件
src/hooks/use-poster.ts    编辑历史与自动保存
src/lib/                  数据校验、IndexedDB、图片处理和导出
public/template/          从原 SVG 提取的素材
public/fonts/             本地字体与许可证
scripts/                  素材提取与冒烟检查
artifacts/                冒烟截图与导出结果
```
