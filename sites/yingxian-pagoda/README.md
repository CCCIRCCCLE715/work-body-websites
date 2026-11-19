# 应县木塔 · 一木千年

成品网站：https://huangbai-ai.github.io/yingxian-pagoda/

原仓库：https://github.com/huangbai-AI/yingxian-pagoda

六幕视差滚动、逐层拆解、柱网、斗栱近景与自由观塔，包含 v20 牌匾稳定模型。属于科普重建，非测绘复原。

## 运行

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5188
```

打开 http://127.0.0.1:5188/ 。构建使用 `npm run build`。

部署目录 `sites/yingxian-pagoda`，构建命令 `npm run build`，输出目录 `dist`。

本目录保留源码、模型、纹理、字体及历史展示页。部分制作脚本引用原仓库上级的 Blender 工程，重新建模请使用原仓库及版本附件；运行网站无需 Blender。小工具为独立旧版。本次收录不重新部署线上网站。

木纹来自 Poly Haven（CC0），其他素材沿用原项目许可说明。

来源提交：a11c8c721a0a88318b3c859247b0cdcac8628064
