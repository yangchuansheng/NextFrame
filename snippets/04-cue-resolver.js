// ============================================================
// 04. cue resolver — "说到 XXX 时触发" → 毫秒时间戳
// ============================================================
//
// 场景：AI 写好了脚本和一些"锚点"（在讲到"傅立叶"的时候显示公式），
// 然后 whisper 把真实旁白转成带时间戳的文字。
//
// 任务：把锚点文本匹配到 whisper timeline 的具体时间位置。
//
// 输入：
//   whisperTimeline.segments = [
//     { start: 1200, end: 1400, text: '我们' },
//     { start: 1400, end: 1800, text: '来讲一下' },
//     { start: 1800, end: 2400, text: '傅立叶变换' },
//     ...
//   ]
//
//   cues = [
//     { id: 'show-formula', anchor: '傅立叶' },
//     { id: 'highlight',    anchor: '变换' },
//   ]
//
// 输出：
//   [{ id: 'show-formula', t: 1800 }, { id: 'highlight', t: 2100 }]
//
// ============================================================

/**
 * 去掉中文/英文标点，便于匹配
 */
export function stripPunct(s) {
  return s.replace(/[，。！？、；：""''（）《》「」【】,.\!?;:()\[\]<>"']/g, '')
          .replace(/\s+/g, '')
          .toLowerCase();
}

/**
 * 展开 whisper segments 成一个连续的字符数组
 * 每个字符记下它来自哪个 segment + 在 segment 内的相对位置
 * 这样可以按字符插值算出精确时间
 */
function expandToChars(segments) {
  const chars = [];  // [{ ch, t }]
  for (const seg of segments) {
    const clean = stripPunct(seg.text);
    if (clean.length === 0) continue;
    const dur = seg.end - seg.start;
    for (let i = 0; i < clean.length; i++) {
      const t = seg.start + (dur * i) / clean.length;
      chars.push({ ch: clean[i], t });
    }
  }
  return chars;
}

/**
 * 在字符数组里查找第一个匹配（startFromIdx 之后）
 * 返回匹配到的起始字符 index，找不到返回 -1
 */
function findFirst(chars, needle, startFromIdx = 0) {
  const n = stripPunct(needle);
  if (n.length === 0) return -1;
  for (let i = startFromIdx; i <= chars.length - n.length; i++) {
    let ok = true;
    for (let j = 0; j < n.length; j++) {
      if (chars[i + j].ch !== n[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

// ------------------------------------------------------------
// 同音字 / 常见转录错误 fallback
// whisper 经常把专业词转错，必须有兜底
// ------------------------------------------------------------
const HOMOPHONE_MAP = {
  '傅立叶': ['付立叶', '傅里叶', '富立叶', '付里叶'],
  '卷积':   ['卷机', '圈积'],
  'AI':     ['爱', '爱艾', '诶哎'],
  'GPU':    ['计pu', 'GP', 'gpu'],
  // 持续积累
};

function expandAnchorVariants(anchor) {
  const variants = [anchor];
  if (HOMOPHONE_MAP[anchor]) variants.push(...HOMOPHONE_MAP[anchor]);
  return variants;
}

/**
 * 主接口：把 cues 解析成带时间戳的事件
 * @param {object} whisperTimeline - { segments: [...] }
 * @param {Array}  cues            - [{ id, anchor, offset? }]
 * @returns {Array} [{ id, t, matched: boolean, reason?: string }]
 */
export function resolveCues(whisperTimeline, cues) {
  const chars = expandToChars(whisperTimeline.segments);
  const result = [];

  // 按 cues 声明顺序"推进"光标：后面的 cue 从前面的 cue 位置之后找
  // 这样同一个词出现多次也能按顺序匹配
  let cursor = 0;

  for (const cue of cues) {
    const variants = expandAnchorVariants(cue.anchor);
    let found = -1;
    let hit = null;
    for (const v of variants) {
      const idx = findFirst(chars, v, cursor);
      if (idx >= 0 && (found < 0 || idx < found)) {
        found = idx;
        hit = v;
      }
    }

    if (found < 0) {
      result.push({
        id: cue.id, t: null, matched: false,
        reason: `anchor "${cue.anchor}" not found after ${cursor}`,
      });
      continue;
    }

    const t = chars[found].t + (cue.offset || 0);
    result.push({
      id: cue.id, t: Math.round(t), matched: true,
      anchor: cue.anchor, matchedAs: hit,
    });
    cursor = found + stripPunct(hit).length;
  }

  return result;
}

// ============================================================
// 使用示例
// ============================================================
/*
import { resolveCues } from './04-cue-resolver.js';

const timeline = {
  segments: [
    { start: 0,    end: 800,  text: '大家好' },
    { start: 800,  end: 1400, text: '今天来讲' },
    { start: 1400, end: 2300, text: '付立叶变换' },   // ← whisper 转错了
    { start: 2300, end: 3200, text: '这是信号处理的核心' },
  ],
};

const cues = [
  { id: 'show-formula', anchor: '傅立叶' },
  { id: 'highlight',    anchor: '信号' },
];

console.log(resolveCues(timeline, cues));
// [
//   { id: 'show-formula', t: 1400, matched: true, anchor: '傅立叶', matchedAs: '付立叶' },
//   { id: 'highlight',    t: 2659, matched: true, anchor: '信号',   matchedAs: '信号' },
// ]
*/
