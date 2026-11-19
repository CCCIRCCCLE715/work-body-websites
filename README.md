# Work Body 网站案例集

三个可以独立运行的个人网站，包含源码、当前使用的图片与模型，以及已有的检查脚本。

| 案例 | 源码 | 成品网站 | 收录状态 |
| --- | --- | --- | --- |
| 作品衣橱 | [sites/wardrobe](sites/wardrobe) | [打开网站](https://huangbai-wardrobe.vercel.app/) | 与当前线上版本一致，包含魔法袍衣架修复 |
| 可漫游小星球 | [sites/planet](sites/planet) | [打开网站](https://huangbai-little-planet-1113.vercel.app/) | 收录 2026-11-18 最新源码；线上尚未包含走近、换装后居中弹出大卡片的交互 |
| 弹性大头作品集 | [sites/elastic-head](sites/elastic-head) | [打开网站](https://huangbai-portfolio.vercel.app/) | 与当前线上版本一致，包含背景大字纵向渐变 |

旧项目见 [之前的网站案例](docs/previous-websites.md)。该索引保留各项目原仓库链接。

## 运行

衣橱不需要安装依赖，使用 Python 3 启动：

```sh
cd sites/wardrobe
python3 -m http.server 4187 --bind 127.0.0.1 --directory dist
```

打开 [作品衣橱](http://127.0.0.1:4187/)。`dist/` 中保留的是可直接编辑的 HTML、CSS 和 JavaScript 源文件。

小星球和大头网站需要 Node.js 22.12 或更新版本。进入对应目录执行：

```sh
npm ci
npm run dev
```

小星球默认使用 [4410 端口](http://127.0.0.1:4410/)，大头默认使用 [4320 端口](http://127.0.0.1:4320/)。在各自目录运行 `npm test` 检查已有测试，运行 `npm run build` 生成 `dist/`。

## 部署到 Vercel

同一个 GitHub 仓库可以连接三个 Vercel 项目，分别设置以下目录：

| 案例 | Root Directory | Framework | Build Command | Output Directory |
| --- | --- | --- | --- | --- |
| 作品衣橱 | `sites/wardrobe/dist` | Other | 留空 | `.` |
| 小星球 | `sites/planet` | Vite | `npm run build` | `dist` |
| 弹性大头 | `sites/elastic-head` | Vite | `npm run build` | `dist` |

本仓库的上传不包含 Vercel 重新部署。线上状态按 2026-11-19 核查结果记录。

## 文件与素材

每个案例目录都有修改入口和运行说明。`docs/source-manifest.json` 记录收录文件的 SHA-256，可用于检查下载后的文件完整性。

仓库保留当前网站使用的素材。替换图片、模型或字体时，请保留适用的许可说明；本仓库未统一授予这些素材额外的使用许可。
