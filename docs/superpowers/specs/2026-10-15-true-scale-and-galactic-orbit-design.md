# 真实比例与银心公转——把「真实」做成真的（2026-10-15 设计说明）

用户验收（原文）：「你这真实比例啊一定要真实 而且我不是让你这个太阳要公转吗，整个体系也要公转啊」。
经三问确认，三条决定（已与用户对齐，实施依据）：

1. **单一比例 + 明示系数**：所有天体共用同一个放大系数 k，太阳 : 地球 = 109.2 : 1 严格成立；四颗内行星不再被 minSize 压成同一尺寸；界面标出 k 与每个天体在本视图的真实像素直径；行星靠「标记环」保证可寻，不靠放大球体。
2. **新增「星系视角」，主视图不动**：主页与探索主视图的构图、大小保持不变；另加一个拉远的视角，把整条银心公转轨道装进画面，并带比例尺（真实轨道半径 = 海王星轨道的 5,678 万倍，由常数现算）。
3. **提高更多的挡位**：时间流速在 1×/4×/16×/60× 之上加 240×、720×（星系视角下一圈约 6.3 s / 2.1 s）。

## 旧实现为什么是假的（实测）

- `TRUE_SCALE.sunMag: 20`、`planetMag: 160` 是两套系数：渲染出的 sun/earth = 13.1，真实是 109.2，低了 8.33 倍。
- `minSize: .011` 把水星/金星/地球/火星全部钳成 0.011——四颗行星同尺寸，比例是假的。
- 公转不可见：银道环半径 R=.97×span（582），比太阳系跨度 600 还小；相机又吃掉约 86%（浏览）/95%（探索）的位移，实测主页 1.04 px/s、探索 0.02 px/s——肉眼为零。

## 真实比例的单一系数律（`src/visual/solarData.ts`）

```
TRUE_SCALE = { AU: 1.55, magnify: 20, earthSpeed: .15, earthRadiusAU: 4.2588e-5 }
trueRadius = body.radiusEarth × earthRadiusAU × AU × magnify   // 无分支、无钳制
```
任意两天体的半径比严格等于真实半径比；sun/earth = 109.2 精确成立。取景跨度集中为
`SPAN = { artistic: 600, true: 51 }` + `spanFor(mode)`，环半径与相机距离都从它推导。

## 「星系视角」的取景律（`createUniverseController.ts`）

- 半径切换：`GALAXY.viewRadiusRatio = 24`（示意环 24×跨度），主视图仍用 `.97`；切视角只改环与相机，不动体系构图。
- 相机：环心居中，`distance = 2.12 R / sin(halfFov)`，方向 = 环内 0.62 + 法线 0.82（纯法线会把环压成一条线）。
- 跟随律：`computeShift(view, fraction, follow = !galacticView)`——星系视角下相机**不**吃位移，太阳真的一圈圈走。
- 天空球随之放大（`environmentSpan = 2.6 R`），否则相机在银道尺度会飞出天球。
- 近/远平面随距离放宽（`setCameraRange`），近处看行星、远处看银道都不裁剪。

## 诚实的读数（`SolarExplorer.tsx` + `data-scene-*`）

- `统一放大系数 20×`、`本视图真实直径 N px`（画布逐帧写 `data-scene-body-pixels`，面板只读不算）。
- 比例尺卡片：真实距离 8.277 kpc ≈ 1.71×10⁹ AU；`5,678 万倍` 由
  `GALACTIC_REAL.distanceKpc×1000×auPerParsec / neptuneAU / 1e4` 现算，不写死在文案里；
  画面里的环半径按模式换算成 AU（真实模式 ÷1.55）并注明「环半径只为示意」。
- 标记环：真实比例模式下九个主天体各一个 11px 圆环（`.celestial-marker`），只标位置、不标大小。
- `已绕行 N°`：由与 `system.position` 同源的 simulationTime 推出，读数与画面不可能不一致。

## 主视图不动的验收

银道环开关像素测试、相机飞行、纹理生命周期、窄屏/矮屏布局断言全部保持；
时间挡位只是同一仿真时钟的倍率（换挡=同一画面跑得更快，天体不跳位）。

## 已验证

`npm run test:unit` 8/8；`npm run test:browser` 六套全绿（含新增：单一系数读数、9 个标记环、
星系视角取景与角度推进、比例尺内容、720×/240× 换挡）。`npx tsc --noEmit` 干净。

## 第二轮：参考视频的运动语言（BV19N411C7VY，2026-10-15 晚）

用户追加（原文）：「【最真实的太阳系运动，3D动画】https://www.bilibili.com/video/BV19N411C7VY 我说要是这样的」。
视频无旁白（ASR 只有标题句），全部信息在画面里（已抽帧分析）。它的三个标志性元素与落地方式：

1. **行星亮尾迹（彗尾状，颜色随行星）**：64 点拖尾由 `LineBasicMaterial` 改为自定义
   `ShaderMaterial`（`trailVertex`/`trailFragment`，`createSolarSystem.ts`）——1px 的 WebGL
   线无法加宽，改为顶点沿视线方向抬向相机（`uPixelScale × .006 × 深度`），片元用
   `intensity = (1.2 + 3.2·glow) · min(uPixelScale, 2)` 加亮，`tint = mix(vColor, 白, glow·.35)`
   保留每行星的色相、头部泛白。`uCamera` 每帧由控制器传入 model 空间（`setTrailCamera`），
   `uPixelScale` 由 `resize()` 写入（`setPixelScale`）。
   **弧长律**：`arcSpan = clamp(1.15 · (speed/mercurySpeed)^-.28, .3, 4.2)` rad——越慢（越外）的
   行星尾迹越长，参考视频 f_012 里外行星的长弧最抢眼；arcSpan 是整条弧的张角、均分给 63 段
   （早期实现每段都走满 arcSpan，64 点扫了 63×arcSpan ≈ 海王星 8 圈，画面折成多边形网——教训：
   弧长参数必须除以段数）。
2. **太阳的金色行进光束**：`sunBeam` 圆台（`CylinderGeometry(.14,.34)`，加性混合、双面、
   `frustumCulled=false`）挂在 system 组里，每帧 `setFromUnitVectors(+Y, GALACTIC.l90)`——
   l90 = 银经 90°（天鹅座）方向 = 太阳系真实的运动方向；长度 `sun.radius × 12.5`，
   不透明度随日面脉动呼吸（`.34 + pulse·.1 + energy·.14`）。
3. **银河系语境**：已有的银道环、星系视角与天球银河贴图承接了这一层，不再重复造。

拖尾与光束都是**示意**（真实运动没有可见尾迹），且只在艺术化压缩的构图里可见；
真实比例模式下距离尺度变大，尾迹弧随之变短，与「1 AU ≈ 1.55 单位」的声明不冲突。

## 第二轮已验证

`npx tsc --noEmit` 干净；`npm run build` 通过（lazy chunks）；`npm run test:unit` 8/8；
`node tests/solar-quality.cjs`、`node tests/solar-system.cjs` 通过；
`_probe/look-check.cjs` 五张截图（hero/探索/16×/真实比例/星系视角）shader 错误为 0，
16× 概览的亮弧贴合轨道、金束可见，无布局回归。

## 第三轮：让太阳在主视图里真的走起来

用户反馈「太阳你要动啊，你不要再日心说了」——公转机制一直在
（`system.position = gCentre·R(1−cosθ) + gL90·R·sinθ`），但相机把 86–95% 的位移跟掉了，
加上 25 分钟一圈太慢，屏幕上只剩每秒一两个像素的漂移。三个改动：

1. **残差预算提为纯比例**：`cruiseBudget = fraction × half`（删掉 `.85·max(0, half − span·scale)`
   的海王星余量项），browse .18 → .30、explore .22 → .28。屏幕上留下两三成的可视宽度给公转滑行。
2. **探索全景取景退 22%**（`overview()` 距离 ×1.22）：滑行会顶出标准取景，多退的距离就是余量；
   构图仍是同一张全景，只是更宽。
3. **周期 25 分钟 → 5 分钟**（`GALAXY.omega = 2π/300`，真实一圈仍为 2.3 亿年，只是演示速率）。
   文案同步（「真实一周约 2.3 亿年，演示约 5 分钟」）。

配套：拾取加了最近邻兜底（光标附近 `max(radius×3, 距离×.02)` 内最近的天体算命中，
命中 mesh 优先）——滑行后真实比例行星可能不足 1 像素，纯射线拾取会失效。

实测（`_probe/sun-move.cjs`，10 秒采样太阳标签 transform）：browse 1.73 px/s（原 1.04）、
explore 1.91 px/s（原 0.02，约 95 倍）、60× 下 5 秒 48.3 px——肉眼清晰可见太阳带着整个体系
沿银道滑行。`npm run test:browser` 六套全绿后以 `ca1bd2a3` 提交推送。
