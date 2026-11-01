# preview/ · 过目页与验稿页（本地专用，不入远程仓库）

> 本文件是本目录**唯一入库件**。它存在的目的只有一个：把「preview/ 里放什么、要不要提交」这条约定写进仓库，
> 否则新 clone 下来的工作树里没有 preview/，后来的人无从判断该不该建、该不该提交。

## 一、口径（2026-11-01 裁定）

凡是**给用户看稿**的 HTML，一律视为评审工具，不是游戏资产：

- 不进远程仓库、不计入包体、不参与部署、不做版本管理；
- 与「美术生产中间件」（`artdraft/ai_gen/_raw/`、`artdraft/props3d/renders/`）同级，属**开发证据**；
- 唯一的入库例外就是本 README。

配套规则见仓根 `.gitignore` 末段：

```
/preview/*
!/preview/README.md
```

## 二、本地存放

- 位置：dev 仓工作树内的 `preview/`（与 `js/`、`assets/` 同级，但整目录被 ignore）。
  即「**在仓里，不在库里**」——文件跟着工作树走，不跟着 git 走。
- 归档：`preview/_archive/<场景>_<用途>_<YYYYMMDD>/`，保留旧版与来源原图，便于回溯「这一版是怎么来的」。
- 工作中间件：`preview/_<场景>_work/`（拆层产物、探针截图、拼接中间件）。

⚠️ **换机 / 重装 / 重新 clone 不会带走 preview/**。需要留存时手动整目录拷贝（含 `_archive/`）；
真正要长期留的结论必须写进 `游戏设计档案/`（workspace）或仓内文档，**不能只躺在过目页里**。

## 三、命名规范

| 类型 | 命名 | 例 |
|---|---|---|
| 场景过目页（横竖双版共用一页） | `s<N>_review.html` | `s3_review.html`、`s6_review.html` |
| 场景过目页（带陀螺仪交互） | `s<N>h-tilt-preview.html` / `s<N>v-tilt-preview.html` | `s7h-tilt-preview.html` |
| 陀螺仪原型（早期手感试验） | `s<N>-tilt-prototype.html` | `s1-tilt-prototype.html` |
| 多版对照 / 分层验稿 | `<主题>_对照.html`、`<主题>_验稿.html` | `S1_L3双版本对照.html` |
| 开发探针（不给人看，只给脚本看） | `dev-*.html` | `dev-scene.html`、`dev-slot-walk.html` |
| 模板（用于重新生成过目页） | `preview/_src/<页名>.tpl.html` | `_src/s7h-tilt-preview.tpl.html` |

## 四、生成约定（踩过的坑）

1. **必须自包含**：图片以 `data:image/webp;base64,` 内联，**不写 `../assets/...` 相对路径**——
   过目页常在预览面板/临时服务下打开，相对路径会 404，看到的是一片空白。
2. **静态可见优先**：首屏内容（图片 + 关键标注）用纯 HTML/CSS 直出，交互增强再靠脚本；
   这样即使脚本被拦，图仍然看得见。
3. **只读不改**：过目页只展示仓内文件的真实状态，不在页面里做"预览用的临时调色"——
   否则用户过的目和入包的图不是同一张。
4. **写明来源与口径**：页首注明用的是哪几张文件、什么尺寸、什么体积、本次做了什么处理、哪一条是待裁定的。
5. **不塞进游戏包体**：任何 `js/`、`index.html` 都不得引用 `preview/` 下的文件。

## 五、现状清单（截至 2026-11-01）

已被远程仓库移除、仅存本地的历史入库件：

- `s7h-tilt-preview.html`（S7 横版陀螺仪预览）
- `_src/s7h-tilt-preview.tpl.html`、`_src/s7h_bg_before_20261031.webp`（其模板与调色前原图）
- `m1-art-preview.html`（M1 美术预览）

其余全部为本地未跟踪文件，按上表命名，勿提交。
