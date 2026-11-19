# HUANGBAI DESIGN — Lunar Parallax

月球太空舱视差滚动网站：两次开门连接三个页面，包含首页品牌标题、动态信息页和图片展览页。

## 本地启动

使用 Node.js 22.12 或更新的兼容版本。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

打开 http://127.0.0.1:5174/。

## 检查与构建

```sh
npm run lint
npm run build
npm run preview
```

## 文件说明

- `src/`：React 页面及滚动动画逻辑。
- `public/`：完整的视频、图片和本地字体素材；视频保持原始文件，不重新压缩。
- `OJO_UPLOAD_CODE/`：可逐个粘贴给 OJO 的 HTML、CSS、JavaScript 和字体；素材上传与路径对应方式见其中的 `OJO_PASTE_ORDER.txt`。
- `Lunar_*.txt`：原始视频生成提示词。

依赖与构建结果不进入版本库，使用 `npm ci` 和 `npm run build` 重新生成。
