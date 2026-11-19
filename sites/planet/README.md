# 可漫游小星球

[成品网站](https://huangbai-little-planet-1113.vercel.app/)

Three.js 制作的 3D 卡通作品集。球面地形、海水、植物、12 处作品地标及人物身体由代码构建；人物头部从现有 GLB 模型提取。支持转动视角、缩放、点击地面行走和靠近地标换装。

本目录收录 2026-11-18 的最新交互：点击作品地标，人物走近并完成换装后，在画面正中央弹出大尺寸作品卡片。上方成品链接目前仍指向此前的线上版本。

## 运行

需要 Node.js 22.12 或更新版本。在本目录执行：

```sh
npm ci
npm run dev
```

打开 [本地网站](http://127.0.0.1:4410/)。检查与构建：

```sh
npm test
npm run build
```

构建结果位于 `dist/`。使用 `npm run preview` 查看构建版本。

## 修改入口

| 文件 | 用途 |
| --- | --- |
| `src/main.js` | 渲染、镜头、输入与作品访问流程 |
| `src/style.css` | 界面、作品卡片与手机布局 |
| `src/work-visit.js` | 走近、换装与弹卡状态 |
| `src/data.js` / `src/portfolio.js` | 地标说明、作品标题和封面 |
| `src/planet-surface.js` | 球面地形、陆路与地标坐标 |
| `src/terrain.js` / `src/water.js` | 地表和水面 |
| `src/vegetation.js` / `src/atmosphere.js` | 植物、天空和云 |
| `src/landmarks/` | 各作品的代码建模 |
| `src/avatar-head.js` | 从 GLB 提取头部 |
| `src/avatar.js` / `src/outfits.js` | 人物身体、骨架、衣服与动作 |
| `public/models/tripo/` | 原有 GLB 素材 |
| `public/images/` | 网站图片 |

修改地标位置时，同步核对路线与人物站位。修改作品卡片时检查桌面和手机两种尺寸，保留关闭入口。已有测试覆盖地形、导航、人物装配、模型完整性和访问状态流程。
