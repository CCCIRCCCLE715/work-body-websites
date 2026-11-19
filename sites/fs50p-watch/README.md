# FS 50P · Time in Motion

手表主题的三维滚动交互网站。包含 12 个连续章节、活动表链、机芯展示、拆解转场、移动端布局及约 46 秒自动演示。页面文案为英文。

## 预览

下载仓库后，直接用浏览器打开 `preview.html`。该文件已包含运行所需的模型、字体和解码器。

## 本地开发

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run test:sites
npx vite build --config vite.offline.config.mjs
```

常规构建输出到 `dist/client`，离线单文件构建输出到 `dist-offline/index.html`。

## 项目内容

- `src/`：页面、灯光、镜头路径与活动表链。
- [`blender/movement-precision.blend`](blender/movement-precision.blend)：含 245 个独立零件的可编辑机芯工程。
- `public/models/watch.glb`：表壳与表盘的基础模型。
- `public/models/movement-precision.glb`：网页当前使用的规整机芯。
- `public/models/movement.glb`：保留的原始 Lux3D 机芯参考。
- `preview.html`：可直接打开的完整预览。
- `licenses/`：所附字体及相关依赖许可。

采用 React、Three.js、GSAP 和 Vite。机芯以 Lux3D 生成布局为参考，在 Blender 中重建齿轮、桥板、螺丝等可见结构。网页运行不需要 Lux3D API Key。

## 素材来源与复刻范围

视觉参考来自用户提供的网页录屏，原视频未随仓库分发。当前模型、部分小字、粒子和镜头与原网页仍有差异；型号与尺寸文字仅用于视觉演示，不是商品规格承诺。机芯与活动表链是展示结构，未实现完整机械传动仿真。

基础手表模型：[Threepipe 示例](https://samples.threepipe.org/demos/classic-watch.glb)，[来源项目](https://github.com/repalash/threepipe)。历史反射环境来自该示例记录的 iJewel 资源，当前灯光由 `src/studio.js` 本地生成。字体使用 Inter、Barlow Condensed、IBM Plex Mono。

第三方模型及素材的权利归各自权利人；本仓库未为这些素材另行授予商业使用许可。
