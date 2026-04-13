# NextFrame v0.4 — Video Production Pipeline

## Core Principle
Display-only UI. No buttons. All operations via CLI. AI-friendly.

## Data Model

```
~/NextFrame/projects/{project}/
├── project.json              ← project config + shared settings
├── {episode}/
│   ├── episode.json          ← episode metadata
│   ├── pipeline.json         ← NEW: pipeline data (script + audio + atoms + outputs)
│   └── {segment}.json        ← existing timeline files
```

### project.json (extended)
```json
{
  "name": "产品介绍视频",
  "created": "2026-04-13T00:00:00Z",
  "updated": "2026-04-13T00:00:00Z",
  "shared": {
    "brand": {
      "name": "NextFrame",
      "colors": ["#8a6fae", "#da7756"],
      "font": "system-ui"
    },
    "voice": {
      "name": "晓晓",
      "style": "女声·沉稳",
      "speed": 1.0
    },
    "principles": {
      "audience": "25-35岁创作者",
      "tone": "专业友好",
      "style": "数据驱动",
      "pace": "快-慢-快"
    },
    "templates": {
      "intro": null,
      "outro": null,
      "lowerThird": null
    },
    "exportPreset": {
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "codec": "h264",
      "crf": 23
    }
  }
}
```

### pipeline.json (per episode)
```json
{
  "version": "0.4",
  "script": {
    "principles": {
      "audience": "25-35岁创作者",
      "tone": "专业友好",
      "style": "数据驱动",
      "pace": "快-慢-快"
    },
    "arc": ["痛点", "方案", "原理", "证据", "行动"],
    "segments": [
      {
        "id": 1,
        "narration": "每天，我们花 3 小时在重复性工作上。这些时间，本可以用来做更有价值的事。",
        "visual": "大数字 \"3\" + 配文 \"小时/天\"",
        "role": "痛点",
        "logic": "用具体数字制造共鸣，不讲道理，讲感受"
      }
    ]
  },
  "audio": {
    "voice": "晓晓",
    "speed": 1.0,
    "segments": [
      {
        "id": 1,
        "status": "generated",
        "duration": 8.2,
        "file": "audio/seg-1.wav",
        "sentences": [
          { "text": "每天，我们花 3 小时在重复性工作上。", "start": 0, "end": 4.1 },
          { "text": "这些时间，本可以用来做更有价值的事。", "start": 4.1, "end": 8.2 }
        ]
      }
    ]
  },
  "atoms": [
    {
      "id": 1,
      "type": "component",
      "name": "数字统计",
      "scene": "numberCounter",
      "segment": 1,
      "params": { "value": 3, "unit": "小时/天", "color": "#8a6fae" }
    },
    {
      "id": 6,
      "type": "video",
      "name": "产品演示录屏",
      "file": "assets/screen-recording.mp4",
      "duration": 15.2,
      "resolution": "1920x1080"
    },
    {
      "id": 8,
      "type": "image",
      "name": "产品 Logo 高清",
      "file": "assets/logo-hd.png",
      "dimensions": "2400x2400",
      "size": "1.2MB"
    }
  ],
  "outputs": [
    {
      "id": 1,
      "name": "v1 — 初稿",
      "date": "2026-04-11T16:48:00Z",
      "file": "exports/v1.mp4",
      "specs": { "width": 1920, "height": 1080, "fps": 30, "codec": "h264", "duration": 43.2, "size": "12.8MB" },
      "changes": "首次导出",
      "published": []
    }
  ]
}
```

## CLI Commands

### Pipeline data
```
nextframe pipeline-get <project> <episode> [--stage=script|audio|atoms|outputs]
nextframe pipeline-set <project> <episode> --stage=script --data='{...}'
```

### Script
```
nextframe script-set <project> <episode> --segment=1 --narration="..." [--visual="..."] [--role="..."] [--logic="..."]
nextframe script-get <project> <episode> [--segment=1]
nextframe script-arc <project> <episode> --arc='["痛点","方案","原理","证据","行动"]'
nextframe script-principles <project> <episode> --audience="..." --tone="..." --style="..." --pace="..."
```

### Audio
```
nextframe audio-set <project> <episode> --segment=1 --status=generated --duration=8.2 --file=audio/seg-1.wav --sentences='[...]'
nextframe audio-get <project> <episode> [--segment=1]
nextframe audio-voice <project> <episode> --name="晓晓" --speed=1.0
```

### Atoms
```
nextframe atom-add <project> <episode> --type=component --name="..." --scene=numberCounter --segment=1 --params='{...}'
nextframe atom-add <project> <episode> --type=video --name="..." --file=path.mp4 --duration=15.2
nextframe atom-add <project> <episode> --type=image --name="..." --file=path.png --dimensions=2400x2400
nextframe atom-list <project> <episode> [--type=component|video|image]
nextframe atom-remove <project> <episode> --id=1
```

### Output
```
nextframe output-add <project> <episode> --name="v1" --file=path.mp4 --duration=42.6 --size=12.4MB [--changes="..."]
nextframe output-list <project> <episode>
nextframe output-publish <project> <episode> --id=1 --platform=douyin
```

### Shared config
```
nextframe project-config <project> [--get] [--set key=value]
```

## Display Pages

Preview server adds pipeline routes:
```
GET /pipeline?project=X&episode=Y           → pipeline overview (5 tabs)
GET /pipeline/script?project=X&episode=Y    → script page
GET /pipeline/audio?project=X&episode=Y     → audio page
GET /pipeline/atoms?project=X&episode=Y     → atoms page
GET /pipeline/assembly?project=X&episode=Y  → existing editor
GET /pipeline/output?project=X&episode=Y    → output page

GET /api/pipeline?project=X&episode=Y       → JSON: full pipeline data
GET /api/pipeline/script?project=X&episode=Y → JSON: script only
```

Pages are read-only HTML that fetch from /api/pipeline/* and render.
Obsidian Velvet theme. No buttons. No forms.

## Project-level shared tags
Shown as tags/pills on relevant pages:
- Script page: principles tags at top
- Audio page: voice tag
- Atoms page: brand tag
- Output page: export preset tag
