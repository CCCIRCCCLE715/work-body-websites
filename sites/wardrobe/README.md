# 作品衣橱

[成品网站](https://huangbai-wardrobe.vercel.app/)

以衣架和衣服承载作品的 3D 个人网站。Three.js 绘制服装、木质衣架和金属挂杆；衣物网格使用预烘焙数据，运行时计算布料动态。选择衣服后可查看对应作品封面。

## 运行

在本目录执行：

```sh
python3 -m http.server 4187 --bind 127.0.0.1 --directory dist
```

打开 [本地网站](http://127.0.0.1:4187/)。需要 Python 3；运行网站不需要安装 npm 依赖。已有几何检查使用 Node.js：

```sh
npm test
```

## 修改入口

| 文件 | 用途 |
| --- | --- |
| `dist/index.html` / `dist/style.css` | 页面结构与样式 |
| `dist/app.js` | 场景、加载和交互 |
| `dist/works.js` | 作品标题与封面 |
| `dist/island-collection.js` | 衣服与角色配置 |
| `dist/cloth-geometry.js` / `dist/cloth-neckline.js` | 网格和领口处理 |
| `dist/cloth-physics.js` / `dist/cloth-solver.js` | 布料模拟 |
| `dist/cloth-rail.js` | 衣服排列与切换 |
| `dist/store-hardware.js` | 衣架、挂杆和支撑形状 |
| `dist/assets/cloth-baked/` | 网格元数据与压缩顶点数据 |
| `dist/assets/identity-runtime/` | 衣服贴图 |
| `dist/assets/work-covers/` | 作品封面 |

`dist/` 是未打包的可编辑源码。修改后刷新页面即可查看。运行时会读取同目录下的贴图和压缩网格，不要移动或单独删除这些文件。新增服装轮廓时，需同时调整几何或烘焙数据、贴图、领口与衣架支撑范围。
