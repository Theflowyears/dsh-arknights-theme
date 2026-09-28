# 明日方舟主题美化包 · Arknights Theme Pack

> 一款专为粥批定制的明日方舟主题拓展包，旨在为每一位明日方舟提供最沉浸式的DSH体验，无论是背景里的阿米娅还是各处细节中的干员签名，都在提醒你一件事：博士，您还有许多事情需要处理。 现在还不能休息哦。

**为《明日方舟》玩家在 DeepSeek Harness Web 上构建沉浸感。**
**Building immersion for Arknights players on the DeepSeek Harness Web GUI.**

整屏壁纸、按每张图解算的玻璃与文字色、罗德岛图标体系，以及签字式的授权与选择交互 ——
它们一起构成一种像在罗德岛里工作的感觉，而不是把界面刷一层主题色。
A full-screen picture, glass and ink solved from each image, Rhodes Island iconography, and
sign-off style interactions — together they feel like working inside Rhodes Island, rather than
a coat of theme paint.

## 安装 / Install

**预构建包（推荐） / Prebuilt tarball (recommended)**

```sh
dsh plugin add https://github.com/Theflowyears/dsh-arknights-theme/releases/download/v1.0.1/dsh-arknights-theme-1.0.1.tgz
```

**从仓库安装 / From the repository**

```sh
dsh plugin add Theflowyears/dsh-arknights-theme
```

装完**重启 `dsh web`** 再刷新页面。插件在 `package.json` 里声明了 `dsh.bundle`，两种装法都行；
预构建包已经把客户端与素材打包好，省掉构建授权那一步。
Restart `dsh web` afterwards, then reload. The package declares `dsh.bundle`, so it installs
straight from the repository; the prebuilt tarball ships the client and assets ready-made, which
skips the build-approval step. Requires a DSH build whose `@deepseek-ai/cordis` is 4.x.

## 亮点 / Highlights

- **12 张壁纸，参数按图算**：虚化半径、羽化宽度、四周遮罩浓度由每张图自己的色彩统计得出，不是一套固定参数
  （实测虚化 σ 落在 16.7–33.3）。
  **Twelve wallpapers, solved per image**: blur radius, feathering and scrim come from each
  picture's own colour statistics rather than one fixed recipe (measured σ 16.7–33.3).
- **可读性是解出来的**：文字色取画面主色相、用 OKLCH 求亮度，保证在最差那层玻璃上仍达 WCAG AA
  （正文 ≥ 4.5:1）；沉浸度滑杆在「看得清」与「看得见壁纸」之间连续插值，并实时显示实测对比度。
  **Readability is solved**: ink takes the picture's hue and a lightness solved in OKLCH to hold
  WCAG AA on the worst surface; the dial interpolates between readable and immersive and shows
  the measured contrast as you drag.
- **罗德岛图标体系**：侧栏品牌、新会话、文件夹行、折叠控件、壁纸控件、选择器页眉、输入栏圆章、
  会话数据前的国家徽记 —— 全部换成 PRTS 素材，或本仓库为界面绘制的图形（逐项来源见 ICON-ATTRIBUTION.md）。
  **Rhodes Island iconography** across the brand plate, new session, folder rows, fold chip,
  wallpaper controls, picker header, composer roundel and the session figures — all PRTS art or
  glyphs drawn here for the interface, itemised in ICON-ATTRIBUTION.md.
- **签字式的确认**：权限批准条上「允许」带阿米娅签名、「拒绝」带凯尔希签名；选项卡上「提交」带博士签名、
  「跳过本题」带特蕾西娅签名。四张签名都随包分发，并以图片的 alpha 通道上色（`mask-image`），
  所以在深色与浅色两套配色下都清楚，不会出现"浅色盖浅色"。
  **Sign-off interactions**: Amiya and Kal'tsit sign the approval panel; the Doctor and Theresa
  sign the question card's submit and skip. All four signatures ship with the package and are
  painted through their alpha channel (`mask-image`), so they read on both palettes instead of
  pale-on-pale.
- **空会话页**：明日方舟字标、「重铸未来，方舟启航」艺术字标题，以及方舟配色的预览角标。
  **Blank session**: the Arknights wordmark, a gradient wordmark headline, and a preview badge in
  the game's palette.
- **一键换壁纸**：选择器有 640×360 预览、每张的分析标签、沉浸度滑杆与可折叠的画师名单；侧栏「切换」
  按钮直接下一张（Shift 反向）。**默认落在第 12 张**，选择按 id 记住，重启后仍在。
  **One-click switching**: previews, per-image labels, the dial and a collapsible illustrator
  credit; the 切换 button steps straight to the next picture (Shift reverses). A fresh install
  lands on **wallpaper 12**, remembered by id across restarts.

## 截图 / Screenshots

见 [screenshots.json](./screenshots.json)（选用的是壁纸挑选器里的预览图）。界面截图欢迎提 PR 补充。
See [screenshots.json](./screenshots.json) for the picker previews; screenshots of the interface
itself are welcome as a PR.

## 素材与版权 / Assets and rights

**代码 MIT；美术素材不是。** 游戏美术版权归鹰角网络（Hypergryph / Studio Montagne）所有，
**每张插画仍归绘制它的画师本人所有**；图标与签名同理。素材随包分发，**仅供个人在本地为自己的界面
使用**：请勿商用、请勿二次分发。画师名单见 [ARTWORK-ATTRIBUTION.md](./ARTWORK-ATTRIBUTION.md)
（壁纸选择界面里也有一份可折叠的名单），图标来源见 [ICON-ATTRIBUTION.md](./ICON-ATTRIBUTION.md)。
**The code is MIT; the artwork is not.** Game art belongs to Hypergryph / Studio Montagne, and each
illustration remains its illustrator's — as do the icons and the signatures. The assets are
bundled for **personal, local use only**: not for commercial use, not for redistribution.

**画师 / Illustrators：** 阿没MEInoss · soho · ぷらねっと · NUEE · 史里爬 · 最上-川 · Coomlee · momostima

---

以下为完整文档：安装、功能清单、壁纸管线、图标与签名、包内结构、重建方式与已知边界。
The full documentation follows: install, what you get, the wallpaper pipeline, iconography and
signatures, what is inside the package, how to rebuild, and known limits.

# dsh-amiya-wallpaper

**包内文档 / Package documentation.** 讲它由什么构成、每张壁纸被算了什么、每个图标用在哪里、
怎么重建、以及边界在哪。安装步骤与亮点在仓库首页。
This is the manual: what the package is made of, what is measured per wallpaper, where every
glyph is used, how to rebuild it, and where its limits are. Installation and the highlight reel
live on the repository front page.

- 版本 / Version: **1.0.1**
- 适用 / Requires: DSH Web，`@deepseek-ai/cordis` 4.x
- 许可 / Licence: 代码 MIT，美术素材不在 MIT 范围内（见 [版权与署名](#版权与署名--rights-and-credit)）

---

## 安装 / Install

```sh
dsh plugin add Theflowyears/dsh-arknights-theme
```

装完**重启 `dsh web`**，然后刷新页面。
Restart `dsh web` afterwards, then reload the page.

包内声明了 `dsh.bundle.patch`，所以可以按仓库直接安装；插件由宿主与浏览器两半组成，
**重启 `dsh web`** 让两半都重新载入（只改 CSS 的话刷新页面就够 —— 客户端会带着
`no-store` 去拉 live 样式表并替换注入的那份）。
The package declares `dsh.bundle.patch`, so it installs straight from the repository. It has a
host half and a browser half; restart `dsh web` so both load. A CSS-only change needs nothing
but a page reload — the client re-fetches the live stylesheet with `no-store` and swaps it in.

---

## 装完你会看到什么 / What you get

| 位置 / Where | 效果 / What it does |
| --- | --- |
| 整屏壁纸 / Full-screen wallpaper | 12 张壁纸自己的固定图层，界面叠在它上面。**默认落在第 12 张**（按 id 记住，重新导入壁纸顺序变了也不会漂）/ A fixed layer per wallpaper with the app stacked above it. A fresh install lands on **wallpaper 12**, remembered by id rather than by position |
| 边缘虚化 / Edge blur | **按每张图自己的"繁杂度"算**：主体清晰、四周按高斯半径虚化并混回原色。实测 σ 落在 **16.7 – 33.3** / Solved per image from its own busyness: the centre stays sharp, the sides blur and are mixed back. Measured σ lands between **16.7 and 33.3** |
| 亚克力侧栏 / Acrylic sidebar | 左侧栏一层 `blur(32px)` 的玻璃，不是一块实心板 / One layer of `blur(32px)` glass on the left column, not a slab |
| 沉浸度滑杆 / Immersion dial | 0–100 可调，**默认 20**；拖动时玻璃与文字色实时重算，并显示实测对比度 / A 0–100 dial, **default 20**; glass and ink are recomputed as you drag, with the measured contrast shown |
| 罗德岛图标体系 / Rhodes Island iconography | 侧栏品牌、新会话、文件夹、折叠、壁纸控件、选择器、输入栏圆章等全部换成游戏素材（逐项清单见下）/ Brand plate, new-session, folder rows, fold chip, wallpaper controls, picker, composer roundel — all game art, itemised below |
| 壁纸选择器 / Wallpaper picker | 一键换壁纸：高清预览、每张的分析标签、沉浸度滑杆、可折叠的画师名单 / One-click wallpaper switching: hi-res previews, a per-image analysis label, the immersion dial, and the illustrator credit in a collapsible block |
| 快速切换 / Quick step | 侧栏底部一个「切换」按钮直接下一张（Shift 反向），不用打开选择器 / One 切换 button steps straight to the next picture (Shift reverses) |
| 权限批准条 / Approval panel | 工具请求授权时，**允许**带阿米娅签名、**拒绝**带凯尔希签名 / When a tool needs approval, 允许 carries Amiya's signature and 拒绝 carries Kal'tsit's |
| 选项卡 / Question card | 给出选项让你选的那张卡：**提交**带博士签名、**跳过本题**带特蕾西娅签名 / The card that offers you a choice: 提交 carries the Doctor's signature, 跳过本题 carries Theresa's |
| 空会话页 / Blank session | 明日方舟字标 + 「重铸未来，方舟启航」艺术字 + 方舟配色的预览角标 / The Arknights wordmark, the 重铸未来，方舟启航 wordmark, and a preview badge in the game's palette |
| 选择会被记住 / Choice is remembered | 壁纸、沉浸度、深浅配色偏好都写进 `localStorage`，重启后仍在 / Wallpaper, immersion and palette preference persist in `localStorage` |

---

## 壁纸 / The wallpapers

12 张，每张在导入时都会被量一次，并把结果写进 `assets/wallpapers.json`：
Twelve, each measured once at import time, with the result recorded in `assets/wallpapers.json`:

| 量的是什么 / What is measured | 用在哪 / What it drives |
| --- | --- |
| 饱和度、色相、亮度、色彩分布 / saturation, hue, luminance, spread | 边缘虚化半径、羽化比例、四周遮罩浓度 / blur radius, feather ratio, scrim alpha |
| 画面的平均色 / the picture's mean colour | 玻璃与文字的**解算**（见下）/ the solved glass and ink |
| 宽屏 / 窄屏两种裁切 + LQIP / wide and narrow cuts plus a placeholder | 首帧先用 LQIP 占位，再换成真实图片 / the first frame paints the LQIP, then the real cut |
| 640×360 预览图 / a 640×360 preview | 选择器里的缩略图 / the picker's cells |

实测范围 / Measured ranges: `blurSigma` 16.7–33.3 · `featherRatio` 0.110–0.147 ·
`saturation` 0.07–0.42 · 12 张 / 12 images, 7.9 MiB 包内 / inside the package.

---

## 可读性是算出来的 / Readability is solved, not guessed

这是这套皮肤的核心，也是它和"换个背景图"最大的区别。
This is the heart of the skin, and the difference between it and "set a background image".

1. **文字色来自壁纸，而不是写死的黑或白。**
   取画面的主色相，用 OKLCH 求解亮度，保证正文在承载它的每一层面板上仍达 **WCAG AA**（≥ 4.5:1）。
   亮度只允许为了这一点颜色偏离配色自带的文字色 **0.055**（OKLCH 亮度）——否则就会像上一版那样，
   为了 0.025 的色度把文字压到灰扑扑的 L 0.75，看着像褪色而不是文字。
   **Ink is derived from the picture**, not hard-coded: the hue comes from the image, the
   lightness is solved in OKLCH so body text keeps **WCAG AA** (≥ 4.5:1) on every panel it lands on.
   The tint may pull the text's lightness **0.055** (OKLCH) away from the palette's own label
   colour and no further — the previous release spent 0.24 of lightness to buy 0.025 of chroma and
   shipped grey-looking text.
2. **玻璃的浓度也来自画面**：亮壁纸得到更厚的霜，暗壁纸得到更薄的板，沉浸度滑杆在这个区间内
   插值，两端分别是"完全沉浸"和"最好读"；读数解算只作为下限，保证不会薄到读不清。
   **Glass opacity is solved from the picture's luminance** — a bright wallpaper gets a heavier
   frost than a dark one — and the immersion dial interpolates within that band, between "fully
   immersive" and "most readable"; the readability solve is a lower bound, not the whole answer.
3. **承载文字的每一层面板，最薄处也不低于 0.45 不透明度**（`TEXT_SURFACE_MIN_ALPHA`，实测最低
   0.500）。画布 `bg-base` 是唯一允许更薄的一层，它的薄端按对比度解算：**暗色配色满沉浸仍
   ≥ 4.5:1**（实测最差 4.84:1）；**浅色配色的白纱只发解算值的一半**——半张白纸盖上去就不是壁纸了，
   所以浅色配色配暗壁纸在极高沉浸度落到 3.5–3.9:1，守住 3:1 的可读底线但低于 AA。选择器显示的是
   实测值，不是承诺值。
   **Every panel that carries text stays at or above 0.45 alpha** (`TEXT_SURFACE_MIN_ALPHA`;
   measured floor 0.500). The `bg-base` canvas is the one layer allowed to go thinner, and its thin
   end is solved for contrast: the **dark palette still clears 4.5:1 at full immersion** (measured
   worst 4.84:1), while the **light palette ships half of its solved white veil** — half a white
   sheet over a dark wallpaper is no longer a wallpaper — which puts the light palette on dark
   wallpapers at 3.5–3.9:1 at the far end of the dial: above the 3:1 legibility floor, below AA. The
   picker shows the measured figure, not a promise.
4. 选择器实时显示当前壁纸在当前沉浸度下的**实测对比度**。
   The picker shows the *measured* contrast for the current picture at the current immersion.

浅色与深色两套配色各自解算，互不借用。
The light and dark palettes are solved independently; neither borrows the other's numbers.

以上五条由 `tools/audit-core.mjs` 逐条对着**构建产物里的数字**核对，而不是对着"本该生成这些数字的
代码"核对：读的是打进 `lib/client.js` 的那份解算结果，任何一条不成立就以非零码退出。在仓库根目录
执行 `node tools/audit-core.mjs` 即可自己跑一遍。
All five are checked by `tools/audit-core.mjs` against the numbers *in the build output* — the
solved values baked into `lib/client.js` — rather than against the code that was supposed to
produce them; a claim that stops being true fails the script. Run it yourself from the repository
root with `node tools/audit-core.mjs`.

---

## 图标与签名 / Iconography and signatures

**每一个图形都来自 PRTS 或由本仓库绘制，逐项来源记录在 `ICON-ATTRIBUTION.md`。**
**Every glyph is either PRTS game art or drawn in this repository; the per-item provenance is
in `ICON-ATTRIBUTION.md`.**

| 用在哪 / Where | 素材 / Asset |
| --- | --- |
| 侧栏品牌板 / sidebar brand plate | `Logo 罗德岛.png` — 罗德岛徽记 / the Rhodes Island emblem |
| 新会话 / new session | 用户提供的头像，经 `medallion` 变换裁成圆形徽章（28px）/ the supplied portrait, cut to a lit circle |
| 空会话字标 / hero wordmark | `Logo 明日方舟.svg` — 游戏字标，构建时光栅化（172×96，3.3 KiB）/ the game's wordmark, rasterised at build time |
| 预览角标 / preview badge | `图标 未定稿.png` — 游戏里表示"未定稿"的图标 / the game's "unfinalised draft" marker |
| 文件夹行 / folder rows | `道具 至纯源石.png` / the pure-originium shard |
| 折叠控件 / fold chip | 本仓库绘制（面板轮廓 + 双箭头）/ drawn here: a panel outline with a doubled chevron |
| 警示斜纹 / caution stripe | 本仓库绘制（装饰纹理，不是游戏素材）/ drawn here — a texture, not game art |
| 输入栏圆章 / composer roundel | `头像 凯尔希.png` / Kal'tsit's portrait |
| 输入栏签名 / composer signature | 凯尔希手写签名（`signatures/kaltsit.png`）/ Kal'tsit's autograph |
| 选择器页眉 / picker header | `收藏贴 阿米娅签名.png` / Amiya's autograph |
| 仪表栏两条 / instrument strip | `Logo 谢拉格.png` 与 `Logo 乌萨斯.png` — 两条会话数据前的国家徽记 / national emblems before the two session figures |
| 授权卡 / approval panel | 阿米娅（允许）、凯尔希（拒绝）/ Amiya for 允许, Kal'tsit for 拒绝 |
| 选项卡 / question card | 博士（提交）、特蕾西娅（跳过本题）/ the Doctor for 提交, Theresa for 跳过本题 |
| 角标水印 / corner watermark | `头像 阿米娅 skin2.png` / Amiya's skin-2 portrait |
| 壁纸控件 / wallpaper controls | 当前壁纸缩略图 + 本仓库绘制的双箭头 / the picture's own thumbnail plus an authored chevron |

**四张签名都在包内**：`assets/signatures/` 里是原图，同时被内联进样式表（所以装完即用，
不需要额外请求）。签名的上色一律走 `mask-image` —— 图片只提供 alpha，颜色由 CSS 画，
并按配色给两套实测色值（深色玻璃 `rgb(255 206 98)`，浅色玻璃 `rgb(74 44 0)`）。
如果不是这样，白色线稿会在浅色玻璃上直接消失。
**All four signatures ship inside the package**: the sources are in `assets/signatures/`, and
they are also inlined into the stylesheet, so they work with no extra requests. They are
recoloured through `mask-image` — the artwork supplies only its alpha and CSS paints the
colour, in two measured inks per palette. Otherwise white line art would vanish on the light
plate.

---

## 包内结构 / Inside the package

| 路径 / Path | 作用 / Role |
| --- | --- |
| `lib/index.js` | 宿主半：一条路由提供 `assets/`，并往 `index.html` 注入样式表与皮肤标记 / host half: serves `assets/` on one route and injects the stylesheet plus the skin attribute |
| `lib/client.js` | 浏览器半（生成物）：画壁纸、解算玻璃与文字色、占据各个插槽 / browser half (generated): paints, solves, and occupies the slots |
| `cordis.patch.yml` | 把插件行插进 profile 的组合 / inserts the plugin row into the profile |
| `assets/wallpapers.json` | 每张壁纸的测量与解算结果 / per-image measurements and solved values |
| `assets/*-wide.webp`, `*-narrow.webp` | 两种裁切 / both cuts |
| `assets/*-lqip.webp`, `*-preview.webp` | 首帧占位与选择器预览 / first-frame placeholder and picker previews |
| `assets/skin.css` | 完全替换占位符后的样式表，可独立使用 / the fully substituted stylesheet, usable standalone |
| `assets/signatures/*.png` | 四张签名的原图 / the four signatures, as supplied |
| `icons/*.svg` | 本仓库绘制的四个图形 / the four glyphs drawn here |
| `ICON-ATTRIBUTION.md` | 每个图形的来源与用途 / per-glyph provenance |
| `README.md` | 本文档 / this document |

---

## 自己重建 / Rebuilding

包是**生成物**：`lib/client.js` 与 `assets/skin.css` 由工具链从壁纸、图标与源码模板产出，
不手改。要改行为就改源码再构建，这样下一次构建不会把你的手改覆盖掉。
The package is generated: `lib/client.js` and `assets/skin.css` come out of the build, and are
not hand-edited — change the sources and rebuild, or the next build will overwrite your edit.

需要素材时，图标由 `prts-assets.json` 描述的地址从 PRTS 重新抓取，签名则从
`signatures/` 读取（包里也带了一份，`assets/signatures/`）。
Icons are re-fetched from PRTS by the addresses in `prts-assets.json`; signatures are read from
`signatures/` — and the package carries its own copy under `assets/signatures/` so a clone can
build without this machine's working copy.

---

## 版权与署名 / Rights and credit

**代码 MIT；美术素材不是。** 游戏美术版权归 **鹰角网络（Hypergryph / Studio Montagne）** 所有，
每一张插画仍归绘制它的画师本人所有；图标与签名同理。素材随包分发，**仅供个人在本地为自己的
界面使用**：请勿商用、请勿二次分发。若你是权利人并希望移除其中任何一项，请开 issue。
**The code is MIT; the artwork is not.** Game art belongs to **Hypergryph / Studio Montagne**, and
each illustration remains its illustrator's. The assets are bundled for **personal, local use
only** — not for commercial use, not for redistribution. Rights holders: open an issue and the
item will be removed.

**画师 / Illustrators：** 阿没MEInoss · soho · ぷらねっと · NUEE · 史里爬 · 最上-川 · Coomlee ·
momostima —— 整套图以合集形式提供，未给出逐张对应关系，因此按整组署名，不臆测分配。
The set arrived as a group without a file-by-file mapping, so the names are credited as a group
rather than spread across the twelve files as a guess.

细节见 / Details: [`ARTWORK-ATTRIBUTION.md`](./ARTWORK-ATTRIBUTION.md) ·
[`ICON-ATTRIBUTION.md`](./ICON-ATTRIBUTION.md)

---

## 已知边界 / Known limits

- **皮肤的许多选择器锚在宿主 CSS 模块的类名尾部**（如 `[class$='_titleGroup']`）。
  这些局部名不是公开契约：DSH 升级若改名，对应的装饰会**静默失效**（不会报错，只是不生效）。
  Many selectors anchor on the tail of the host's CSS-module class names. Those local names are
  not a public contract; if a DSH release renames one, that decoration stops applying — silently.
- 选择界面、设置界面、对话框只做**颜色、描边与圆角**，不改布局：那三处是宿主自己的版面。
  The picker chrome, settings screen and dialogs are only re-coloured — their layout is the
  host's own, and stays that way.
- 壁纸按宽屏与窄屏两种裁切生成；极端超宽比例下会以 `cover` 填充并依赖边缘虚化遮住裁切。
  Two cuts are generated; at extreme aspect ratios the picture is `cover`-fitted and the edge
  blur hides the crop.
- 本仓库的构建产物经过量化验收（对比度矩阵、资源完整性、结构检查），但**没有任何自动化测试
  能代替肉眼**：配色是否好看，最终以你眼睛为准。
  The build is verified quantitatively (contrast matrix, asset integrity, structural checks),
  and none of that replaces looking at it.
