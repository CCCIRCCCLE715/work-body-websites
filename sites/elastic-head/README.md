# 弹性大头作品集

[成品网站](https://huangbai-portfolio.vercel.app/)

黑色背景的个人作品集，首屏包含大字纵向渐变和可拉扯的互动头像。头像用透明 WebP 贴在 WebGL 细分网格上，拖动时产生局部形变，松手后通过阻尼弹簧回弹；泛红随皮肤变形并逐渐消退。下方包含作品封面滚动墙、介绍、服务和项目卡片。

## 运行

需要 Node.js 22.12 或更新版本。在本目录执行：

```sh
npm ci
npm run dev
```

打开 [本地网站](http://127.0.0.1:4320/)。检查与构建：

```sh
npm test
npm run build
```

构建结果位于 `dist/`。使用 `npm run preview` 查看构建版本。头像素材浏览入口为 `/portrait-library.html`。

## 修改入口

| 文件 | 用途 |
| --- | --- |
| `src/content.ts` | 姓名、介绍、服务、作品封面和项目内容 |
| `src/main.tsx` | 页面结构、背景大字和组件 |
| `src/style.css` | 页面排版和手机布局 |
| `src/portrait-engine.js` | 网格形变、回弹、泛红和表情状态 |
| `src/portrait-config.ts` | 表情文件名与素材路径 |
| `src/portrait.css` | 头像容器与画布样式 |
| `public/assets/huangbai-portrait-v10/` | 当前头像素材，包含 59 张 WebP |
| `public/assets/video-covers/` | 作品封面 |
| `public/assets/projects/` / `public/assets/decor/` | 项目图片和装饰图 |

替换头像时，所有表情使用相同画布尺寸、面部位置和透明轮廓，避免切换时跳动。修改形变范围后运行已有回归检查，重点核对快速短拉、连续抓取、失焦释放、网格翻折和泛红消退。
