# Icon attribution / 图标来源

Every glyph below is bundled with the plugin: game assets come from the PRTS wiki
and are inlined into `lib/client.js` and `assets/skin.css` as data URIs, so the plugin
needs no extra requests and no files outside the package. They are Hypergryph's
property, bundled for a personal, local interface skin. The four signatures are the
user's own files and also ship as sources under `assets/signatures/`.

下面每个图形都随插件分发：游戏素材取自 PRTS Wiki（`media.prts.wiki`），以 data URI
内联进 `lib/client.js` 与 `assets/skin.css`，因此插件不需要额外请求、也不依赖包外文件。
它们版权归鹰角网络所有，仅用于个人本地的界面美化。四张签名的原图同时放在
`assets/signatures/` 里随包分发。

Source / 来源: [PRTS wiki](https://prts.wiki/w/%E9%A6%96%E9%A1%B5) · fetched by `fetch-prts-icons.mjs`

| Bundle key | PRTS file / 来源 | Role / 用途 |
| --- | --- | --- |
| `amiya-special` | 文件:Avatar special 35.png（用户提供） | New-session glyph: the illustration the user supplied. It is a 150x150 scene with a black vignette reaching every edge and no transparency (0.0% of pixels are clear), so it is not usable as-is at glyph size — the `medallion` transform cuts it to the lit subject and masks it to a soft circle, which removes the frame and lifts the exposure. |
| `sign-doctor` | 博士签名（用户提供：D:\夸克下载\签名\博士.png） | The Doctor's handwritten signature, 603x172, dark ink on transparency (median alpha 0.91). Signs the confirm button of the question card, beside 提交. |
| `sign-theresa` | 特蕾西娅签名（用户提供：D:\夸克下载\签名\特蕾西娅.png） | Theresa's handwritten signature, 616x264, dark ink on transparency (median alpha 1.00). Signs the skip button of the question card, beside 跳过本题. |
| `sign-kaltsit` | 干员签名 · 凯尔希（用户提供的本地文件 `signatures/kaltsit.png`） | Kal'tsit's handwritten signature, 190x55, dark ink on transparency — the occupant of the dispatch bar slot between the wallpaper controls and the model switcher. PRTS hosts only Amiya's autograph, so this comes from the `signatures/` drop folder; the slot falls back to `sign-amiya` if the file is not there. |
| `rhodes-island` | [文件:Logo 罗德岛.png](https://media.prts.wiki/4/41/Logo_%E7%BD%97%E5%BE%B7%E5%B2%9B.png) | Sidebar brand mark. 510x510, the faction emblem. |
| `amiya-avatar` | [文件:头像 阿米娅.png](https://media.prts.wiki/3/36/%E5%A4%B4%E5%83%8F_%E9%98%BF%E7%B1%B3%E5%A8%85.png) | Amiya operator avatar. Picker header and the footer wallpaper button. |
| `amiya-avatar-skin2` | [文件:头像 阿米娅 skin2.png](https://media.prts.wiki/b/b4/%E5%A4%B4%E5%83%8F_%E9%98%BF%E7%B1%B3%E5%A8%85_skin2.png) | Amiya alternate skin avatar, used as the faint backdrop watermark. |
| `originium-pure` | [文件:道具 至纯源石.png](https://media.prts.wiki/8/8a/%E9%81%93%E5%85%B7_%E8%87%B3%E7%BA%AF%E6%BA%90%E7%9F%B3.png) | Pure originium. Section marker above the wallpaper grid. |
| `op-kaltsit` | [文件:头像 凯尔希.png](https://media.prts.wiki/c/c5/%E5%A4%B4%E5%83%8F_%E5%87%AF%E5%B0%94%E5%B8%8C.png) | Kal'tsit operator portrait (凯尔希), 256x256. Assigned to green wallpapers. |
| `sign-amiya` | [文件:收藏贴 阿米娅签名.png](https://media.prts.wiki/6/60/%E6%94%B6%E8%97%8F%E8%B4%B4_%E9%98%BF%E7%B1%B3%E5%A8%85%E7%AD%BE%E5%90%8D.png) | Amiya's own handwritten signature, 228x118. Signs the wallpaper picker's header plate, inverted into the skin's amber. |
| `logo-ursus` | [文件:Logo 乌萨斯.png](https://media.prts.wiki/d/d8/Logo_%E4%B9%8C%E8%90%A8%E6%96%AF.png) | Ursus national emblem, 510x510 white line art. Leads the consumption pill in the composer's instrument strip (tokens spent / cache hits). |
| `icon-draft` | [文件:图标 未定稿.png](https://media.prts.wiki/b/bd/%E5%9B%BE%E6%A0%87_%E6%9C%AA%E5%AE%9A%E7%A8%BF.png) | The game's 'unfinalised draft' marker, 31x31. Leads the preview badge beside the blank-session headline — the badge says 预览版, and this is the game's own glyph for exactly that. |
| `arknights-logo` | [文件:Logo 明日方舟.svg](https://media.prts.wiki/b/bf/Logo_%E6%98%8E%E6%97%A5%E6%96%B9%E8%88%9F.svg) | The game's own wordmark, in front of the blank-session headline where the host puts its fish. Shipped as an SVG (viewBox 0 0 203 113) and rasterised by sharp at build time: the source is 52 KiB, the 172x96 PNG it becomes is 3.3 KiB. |
| `logo-sherag` | [文件:Logo 谢拉格.png](https://media.prts.wiki/d/d8/Logo_%E8%B0%A2%E6%8B%89%E6%A0%BC.png) | Sherag (Kjerag) national emblem, 510x510 white line art. Leads the activity pill in the composer's instrument strip (turns / steps / tok per second). |

Drawn in this repository rather than sourced — interface affordances, not game art:
本仓库绘制、非游戏素材（界面装饰）：

- `hazard-rule`
- `panel-collapse`
- `panel-expand`
- `wallpaper-step`

Registered in the catalogue with its provenance but not rendered by anything in this
version, so it is deliberately not inlined:
已登记来源、但当前版本没有任何地方渲染，因此不内联（留在素材目录里备用）：

`originium`, `rhodes-elite`, `op-rosmontis`, `op-rosmontis-alt`, `op-chen`, `op-exusiai`, `op-silverash`, `class-vanguard`, `class-guard`, `class-defender`, `class-sniper`, `class-caster`, `class-medic`, `class-supporter`, `class-specialist`, `class-vanguard-lg`, `class-guard-lg`, `class-defender-lg`, `class-sniper-lg`, `class-caster-lg`, `class-medic-lg`, `class-supporter-lg`, `class-specialist-lg`, `amiya-elite`, `amiya-guard`, `icon-time`, `logo-columbia`, `logo-victoria`, `logo-leithanien`, `logo-kazimierz`, `logo-iberia`.
