#!/usr/bin/env node

const SUBCOMMANDS = {
  new: () => import("../src/cli/new.js"),
  validate: () => import("../src/cli/validate.js"),
  build: () => import("../src/cli/build.js"),
  scenes: () => import("../src/cli/scenes.js"),
  preview: () => import("../src/cli/preview.js"),
  frame: () => import("../src/cli/frame.js"),
  render: () => import("../src/cli/render.js"),
  "project-new": () => import("../src/cli/project-new.js"),
  "project-list": () => import("../src/cli/project-list.js"),
  "episode-new": () => import("../src/cli/episode-new.js"),
  "episode-list": () => import("../src/cli/episode-list.js"),
  "segment-new": () => import("../src/cli/segment-new.js"),
  "segment-list": () => import("../src/cli/segment-list.js"),
  "layer-add": () => import("../src/cli/layers.js"),
  "layer-move": () => import("../src/cli/layers.js"),
  "layer-resize": () => import("../src/cli/layers.js"),
  "layer-remove": () => import("../src/cli/layers.js"),
  "layer-set": () => import("../src/cli/layers.js"),
  "layer-list": () => import("../src/cli/layers.js"),
  app: () => import("../src/cli/app.js"),
  "app-eval": () => import("../src/cli/app-eval.js"),
  "app-screenshot": () => import("../src/cli/app-screenshot.js"),
  help: null,
};

const HELP = `nextframe v0.3 — AI video editor CLI

  Timeline JSON → multi-layer HTML → browser playback

CORE PRINCIPLE: 一个视觉元素 = 一个 layer（轨道）
  ✗ 错误：把整屏内容塞进一个 scene 组件
  ✓ 正确：拆成多个 layer，每个 layer 放一个 scene 组件

  示例 — 一个讲解 slide 应该拆成：
    z0  slideFrame      框架（品牌栏+进度条）    start=0 dur=30  全屏
    z1  codeBlock        代码窗口                start=0 dur=12  x=8% y=22% w=84% h=55%
    z2  bulletList       要点列表                start=12 dur=10 x=8% y=22% w=84% h=55%
    z3  calloutCard      说明卡片                start=12 dur=10 x=60% y=22% w=35% h=40%
    z4  numberCounter    大数字                  start=22 dur=8  全屏
    z5  syncSubs         字幕                    start=0 dur=30  全屏

  每个 layer 独立控制：位置(x/y/w/h)、时间(start/dur)、动画(enter/exit/keyframes)
  桌面端可看到每条轨道，单独调整

WORKFLOW
  1. nextframe scenes              查看组件
  2. nextframe scenes <id>         查看组件参数
  3. 设计轨道：列出每个视觉元素，每个一层
  4. 写 timeline.json              每个元素一个 layer
  5. nextframe validate <json>     检查格式 + 重叠
  6. nextframe build <json> -o X   生成 HTML
  7. nextframe preview <json>      截图 + 布局检查
  8. 看 preview 输出，调整位置/时间
  9. 没有合适组件？自己写一个 scene → 注册到 index.js

COMMANDS
  new <out.json>                         create v0.3 timeline
  validate <timeline>                    6 gates + overlap check
  build <timeline> [--output=out.html]   bundle → playable HTML
  scenes [id]                            list/inspect components
  preview <timeline> [--times=0,3,5]     screenshot + layout map
  frame <timeline> <t> <out.png>         render one frame
  render <timeline> <out.mp4>            render MP4

Project (三级存储)
  project-new / episode-new / segment-new
  project-list / episode-list / segment-list

Layer CRUD
  layer-list / layer-add / layer-move / layer-resize / layer-set / layer-remove

LAYER PROPERTIES (= CSS)
  必填：id, scene, start, dur, params
  位置：x, y, w, h (% 或 px)
  样式：opacity, rotation, scale, blend, filter, borderRadius, shadow, border, padding
  动画：enter(fadeIn/slideUp/scaleIn), exit(fadeOut/scaleOut), transition(dissolve/wipeLeft/zoomIn)
  关键帧：{"keys":[[t,v],...], "ease":"easeOut"} — 任意属性可动画

LAYOUT（同时多个内容层必须用 x/y/w/h 分区）
  左右分栏：左 x=5% w=45%, 右 x=52% w=45%
  上下分栏：上 y=5% h=45%, 下 y=52% h=45%
  画中画：  主 全屏, 小窗 x=65% y=5% w=30% h=30%

SCENE TYPES
  dom=文字/布局  canvas=特效/背景  svg=图表  webgl=GPU着色器  media=视频/音频

CREATING SCENES
  export default { id, type, name, category, defaultParams, create, update, destroy }
  写到 runtime/web/src/scenes-v2/xxx.js → 注册到 index.js
`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(HELP);
    process.exit(0);
  }

  const subcommand = argv[0];
  const loader = SUBCOMMANDS[subcommand];
  if (!loader) {
    process.stderr.write(`unknown subcommand: ${subcommand}\n\n${HELP}`);
    process.exit(3);
  }

  try {
    const mod = await loader();
    const code = await mod.run(argv.slice(1), { subcommand });
    process.exit(typeof code === "number" ? code : 0);
  } catch (error) {
    process.stderr.write(`uncaught: ${error.stack || error.message}\n`);
    process.exit(2);
  }
}

main();
