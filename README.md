# 个人网站案例合集

个人网站统一收录在这个仓库，包含各自的源码、图片、模型和运行说明。每个项目放在独立目录，可以单独启动和部署。

## 案例目录

| 案例 | 主要效果 | 源码 | 成品网站 |
| --- | --- | --- | --- |
| 作品衣橱 | 衣架、立体衣物、作品切换 | [sites/wardrobe](sites/wardrobe) | [打开网站](https://huangbai-wardrobe.vercel.app/) |
| 可漫游小星球 | 小岛漫游、角色换装、作品卡片 | [sites/planet](sites/planet) | [打开网站](https://huangbai-little-planet-1113.vercel.app/) |
| 弹性大头作品集 | 捏脸、表情变化、鼠标跟随 | [sites/elastic-head](sites/elastic-head) | [打开网站](https://huangbai-portfolio.vercel.app/) |
| 月球太空舱 | 连续开门、三段空间、滚动视频 | [sites/lunar-parallax](sites/lunar-parallax) | 可按下方说明本地运行 |
| FS50P 手表 | 活动表链、机芯拆解、三维滚动 | [sites/fs50p-watch](sites/fs50p-watch) | [打开网站](https://fs50p-watch-experience.vercel.app/) |
| 应县木塔 | 六幕滚动、木构拆解、自由观塔 | [sites/yingxian-pagoda](sites/yingxian-pagoda) | [打开网站](https://huangbai-ai.github.io/yingxian-pagoda/) |
| NovaAI Lab | 白色线缆、滚动形变、章节切换 | 源码尚未找到 | [打开网站](https://novaai-deconstruction-scroll.vercel.app/) |

当前收录六个完整源码项目和一个线上案例入口。NovaAI 尚未收录源码；月球网站尚未确认线上地址。小星球源码包含 2026-11-18 的走近、换装与居中弹出大卡片交互，线上版本尚未包含这些更新。

[其他历史案例](docs/previous-websites.md)保留各项目的原仓库入口。[案例清单](docs/catalog.json)记录目录、线上地址和源码状态，供脚本或 AI 读取。

## 运行

衣橱不需要安装依赖，使用 Python 3 启动：

```sh
cd sites/wardrobe
python3 -m http.server 4187 --bind 127.0.0.1 --directory dist
```

打开 [作品衣橱](http://127.0.0.1:4187/)。`dist/` 中保留的是可直接编辑的 HTML、CSS 和 JavaScript 源文件。

小星球、大头、月球和手表项目使用 Node.js 22.12 或更新版本。进入对应目录安装依赖并启动，例如月球网站：

```sh
cd sites/lunar-parallax
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

运行后打开 [月球网站](http://127.0.0.1:5174/)。小星球默认使用 [4410 端口](http://127.0.0.1:4410/)，大头默认使用 [4320 端口](http://127.0.0.1:4320/)。手表项目可用 `npm run dev -- --host 127.0.0.1 --port 5175` 启动，再打开 [手表网站](http://127.0.0.1:5175/)。各项目的检查命令见目录内的 README。

手表目录还保留了可直接用浏览器打开的 [preview.html](sites/fs50p-watch/preview.html)，以及可编辑的 [Blender 机芯工程](sites/fs50p-watch/blender/movement-precision.blend)。月球目录保留完整背景视频、图片、字体、原始视频提示词及 OJO 上传文件。

## 部署到 Vercel

同一个 GitHub 仓库可以连接多个 Vercel 项目，分别设置以下目录：

| 案例 | Root Directory | Framework | Build Command | Output Directory |
| --- | --- | --- | --- | --- |
| 作品衣橱 | `sites/wardrobe/dist` | Other | 留空 | `.` |
| 小星球 | `sites/planet` | Vite | `npm run build` | `dist` |
| 弹性大头 | `sites/elastic-head` | Vite | `npm run build` | `dist` |
| 月球太空舱 | `sites/lunar-parallax` | Vite | `npm run build` | `dist` |
| FS50P 手表 | `sites/fs50p-watch` | Vite | `npm run build` | `dist/client` |

本仓库的上传不包含 Vercel 重新部署。线上状态按 2026-11-19 核查结果记录。

木塔启动方法见 [项目说明](sites/yingxian-pagoda/README.md)。部署目录 `sites/yingxian-pagoda`，构建 `npm run build`，输出 `dist`。

## 文件与素材

每个源码项目都有运行说明。`docs/source-manifest.json` 记录收录文件的 SHA-256 和新增项目的来源提交，可用于检查下载后的文件完整性。原仓库继续保留，本仓库集中保存这些案例的可运行副本。

仓库保留当前网站使用的素材。替换图片、模型或字体时，请保留适用的许可说明；本仓库未统一授予这些素材额外的使用许可。
