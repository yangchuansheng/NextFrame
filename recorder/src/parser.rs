//! Parsing utilities for recorder HTML files, manifests, subtitles, and cue maps.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;
use serde::Deserialize;

#[derive(Debug, Clone)]
/// One parsed subtitle entry with start and end times.
pub struct SubtitleCue {
    pub start: f64,
    pub end: f64,
    pub text: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlideType {
    Bridge,
    Clip,
    Unknown,
}

impl SlideType {
    pub fn label(self) -> &'static str {
        match self {
            Self::Bridge => "bridge",
            Self::Clip => "clip",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone)]
/// All metadata extracted from a recorder HTML frame file.
pub struct FrameMetadata {
    pub html_path: PathBuf,
    pub slide_type: SlideType,
    pub audio_path: Option<PathBuf>,
    pub subtitles: Vec<SubtitleCue>,
    pub cuemap: Vec<usize>,
    pub total_cues: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SegmentsManifest {
    #[serde(rename = "audioBase")]
    #[serde(default)]
    audio_base: Option<String>,
    #[serde(rename = "srtBase")]
    #[serde(default)]
    srt_base: Option<String>,
    #[serde(default)]
    cover: Option<SpecialSegment>,
    #[serde(default)]
    ending: Option<SpecialSegment>,
    #[serde(default)]
    segments: Vec<ManifestSegment>,
}

#[derive(Debug, Deserialize)]
struct SpecialSegment {
    #[serde(default)]
    audio: Option<String>,
    #[serde(default)]
    srt: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ManifestSegment {
    id: usize,
    #[serde(default)]
    audio: Option<String>,
    #[serde(default)]
    srt: Option<String>,
}

static DATA_CUE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"data-cue\s*=\s*['"](\d+)['"]"#).unwrap());
static STEM_NUMBER_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(\d+)").unwrap());
static SRT_TIME_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$",
    )
    .unwrap()
});

pub fn detect_slide_type(html_content: &str) -> SlideType {
    if html_content.contains("<clip-slide") || html_content.contains("clip-slide.js") {
        SlideType::Clip
    } else if html_content.contains("<bridge-slide") || html_content.contains("bridge-slide.js") {
        SlideType::Bridge
    } else {
        SlideType::Unknown
    }
}

/// Parses an HTML frame file and derives its audio, subtitle, and cue metadata.
pub fn parse_frame_file(path: &Path) -> Result<FrameMetadata, String> {
    let html_path = path
        .canonicalize()
        .map_err(|err| format!("failed to canonicalize {}: {err}", path.display()))?;
    let html = fs::read_to_string(&html_path)
        .map_err(|err| format!("failed to read {}: {err}", html_path.display()))?;
    let slide_type = detect_slide_type(&html);

    let mut warnings = Vec::new();
    let mut audio_path = extract_assignment_string(&html, "AUDIO_SRC")
        .map(|rel| resolve_relative(&html_path, rel))
        .transpose()?;
    let mut subtitles = extract_srt_array(&html)?;
    let mut cuemap = extract_cuemap(&html)?;
    let mut total_cues = extract_number(&html, "TOTAL").map(|n| n as usize);

    // ── __SLIDE_SEGMENTS fallback ──
    // slide-audio.js v4 uses __SLIDE_SEGMENTS = { audio: '...', segments: [...] }
    // instead of separate AUDIO_SRC / SRT / CUEMAP variables.
    if audio_path.is_none()
        && let Some(seg_audio) = extract_slide_segments_audio(&html)
    {
        audio_path = Some(resolve_relative(&html_path, seg_audio)?);
        warnings.push("used __SLIDE_SEGMENTS.audio as audio source".into());
    }
    if subtitles.is_empty() {
        let seg_subs = extract_slide_segments_srt(&html);
        if !seg_subs.is_empty() {
            subtitles = seg_subs;
            warnings.push("used __SLIDE_SEGMENTS.srt as subtitle source".into());
        }
    }

    if (audio_path.is_none() || subtitles.is_empty() || cuemap.is_empty() || total_cues.is_none())
        && let Some(fallback) = load_manifest_fallback(&html_path)?
    {
        if audio_path.is_none() {
            audio_path = fallback.audio_path;
            if audio_path.is_some() {
                warnings.push(
                    "AUDIO_SRC missing inline; used segments.json/convention fallback".into(),
                );
            }
        }
        if subtitles.is_empty() {
            subtitles = fallback.subtitles;
            if !subtitles.is_empty() {
                warnings.push("SRT missing inline; used sibling .srt fallback".into());
            }
        }
        if cuemap.is_empty() {
            cuemap = fallback.cuemap;
            if !cuemap.is_empty() {
                warnings.push("CUEMAP missing inline; derived fallback mapping".into());
            }
        }
        if total_cues.is_none() {
            total_cues = fallback.total_cues;
            if total_cues.is_some() {
                warnings.push("TOTAL missing inline; derived fallback total".into());
            }
        }
    }

    let total_cues = total_cues.unwrap_or_else(|| {
        max_data_cue(&html)
            .map(|value| value + 1)
            .or_else(|| (!cuemap.is_empty()).then_some(cuemap.len()))
            .or_else(|| (!subtitles.is_empty()).then_some(subtitles.len().max(1)))
            .unwrap_or(0)
    });

    if cuemap.is_empty() && !subtitles.is_empty() {
        let derived_len = total_cues.max(1).min(subtitles.len());
        cuemap = (0..derived_len).collect();
    }
    cuemap.retain(|index| *index < subtitles.len());

    Ok(FrameMetadata {
        html_path,
        slide_type,
        audio_path,
        subtitles,
        cuemap,
        total_cues,
        warnings,
    })
}

fn resolve_relative(html_path: &Path, rel: String) -> Result<PathBuf, String> {
    let parent = html_path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", html_path.display()))?;
    Ok(parent.join(rel))
}

fn extract_assignment_string(source: &str, name: &str) -> Option<String> {
    let start = source.find(name)?;
    let after_name = &source[start + name.len()..];
    let equals_index = after_name.find('=')?;
    let rest = after_name[equals_index + 1..].trim_start();
    parse_js_string(rest)
        .map(|(value, _)| value)
        .filter(|value| !value.is_empty())
}

fn extract_number(source: &str, name: &str) -> Option<f64> {
    let pattern = format!(r"(?m)\b{}\s*=\s*([0-9]+(?:\.[0-9]+)?)", regex::escape(name));
    Regex::new(&pattern)
        .ok()?
        .captures(source)?
        .get(1)?
        .as_str()
        .parse()
        .ok()
}

fn extract_cuemap(source: &str) -> Result<Vec<usize>, String> {
    let Some(array_source) = extract_assignment_array(source, "CUEMAP") else {
        return Ok(Vec::new());
    };
    array_source
        .split(',')
        .map(str::trim)
        .filter(|chunk| !chunk.is_empty())
        .map(|chunk| {
            chunk
                .parse::<usize>()
                .map_err(|err| format!("invalid CUEMAP entry {chunk:?}: {err}"))
        })
        .collect()
}

fn extract_srt_array(source: &str) -> Result<Vec<SubtitleCue>, String> {
    let Some(array_source) = extract_assignment_array(source, "SRT") else {
        return Ok(Vec::new());
    };
    let mut result = Vec::new();
    for object_source in extract_object_literals(&array_source)? {
        let start = extract_object_number(&object_source, "s")
            .ok_or_else(|| format!("SRT entry missing s: {object_source}"))?;
        let end = extract_object_number(&object_source, "e")
            .ok_or_else(|| format!("SRT entry missing e: {object_source}"))?;
        let text = extract_object_string(&object_source, "t")
            .ok_or_else(|| format!("SRT entry missing t: {object_source}"))?;
        result.push(SubtitleCue { start, end, text });
    }
    Ok(result)
}

fn extract_assignment_array(source: &str, name: &str) -> Option<String> {
    let start = source.find(name)?;
    let after_name = &source[start + name.len()..];
    let equals_index = after_name.find('=')?;
    let rest = after_name[equals_index + 1..].trim_start();
    let (slice, _) = parse_balanced_block(rest, '[', ']')?;
    Some(slice)
}

fn extract_object_literals(source: &str) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    let bytes = source.as_bytes();
    let mut idx = 0;
    while idx < bytes.len() {
        match bytes[idx] as char {
            '{' => {
                let (block, consumed) = parse_balanced_block(&source[idx..], '{', '}')
                    .ok_or_else(|| "unterminated SRT object literal".to_string())?;
                result.push(block);
                idx += consumed;
            }
            '\'' | '"' => {
                idx += parse_js_string_len(&source[idx..]).unwrap_or(1);
            }
            _ => idx += 1,
        }
    }
    Ok(result)
}

fn extract_object_number(source: &str, field: &str) -> Option<f64> {
    let pattern = format!(r"\b{}\s*:\s*([0-9]+(?:\.[0-9]+)?)", regex::escape(field));
    Regex::new(&pattern)
        .ok()?
        .captures(source)?
        .get(1)?
        .as_str()
        .parse()
        .ok()
}

fn extract_object_string(source: &str, field: &str) -> Option<String> {
    let field_idx = source.find(field)?;
    let rest = &source[field_idx + field.len()..];
    let colon_idx = rest.find(':')?;
    let value = rest[colon_idx + 1..].trim_start();
    parse_js_string(value).map(|(text, _)| text)
}

fn parse_balanced_block(source: &str, open: char, close: char) -> Option<(String, usize)> {
    let mut depth = 0usize;
    let mut in_string = false;
    let mut quote = '\0';
    let mut escape = false;
    for (idx, ch) in source.char_indices() {
        if in_string {
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' {
                escape = true;
                continue;
            }
            if ch == quote {
                in_string = false;
            }
            continue;
        }
        if ch == '\'' || ch == '"' {
            in_string = true;
            quote = ch;
            continue;
        }
        if ch == open {
            depth += 1;
        } else if ch == close {
            depth = depth.saturating_sub(1);
            if depth == 0 {
                let inner = source[1..idx].to_string();
                return Some((inner, idx + close.len_utf8()));
            }
        }
    }
    None
}

fn parse_js_string(source: &str) -> Option<(String, usize)> {
    let quote = source.chars().next()?;
    if quote != '\'' && quote != '"' {
        return None;
    }
    let mut output = String::new();
    let mut chars = source.char_indices();
    chars.next()?;
    let mut escaped = false;
    while let Some((idx, ch)) = chars.next() {
        if escaped {
            output.push(match ch {
                'n' => '\n',
                'r' => '\r',
                't' => '\t',
                '\\' => '\\',
                '\'' => '\'',
                '"' => '"',
                'u' => {
                    let digits = source.get(idx + 1..idx + 5)?;
                    let value = u16::from_str_radix(digits, 16).ok()?;
                    let character = char::from_u32(value as u32)?;
                    for _ in 0..4 {
                        chars.next();
                    }
                    character
                }
                other => other,
            });
            escaped = false;
            continue;
        }
        if ch == '\\' {
            escaped = true;
            continue;
        }
        if ch == quote {
            return Some((output, idx + ch.len_utf8()));
        }
        output.push(ch);
    }
    None
}

fn parse_js_string_len(source: &str) -> Option<usize> {
    parse_js_string(source).map(|(_, len)| len)
}

fn load_manifest_fallback(html_path: &Path) -> Result<Option<ManifestFallback>, String> {
    let manifest_path = html_path
        .parent()
        .into_iter()
        .flat_map(Path::ancestors)
        .map(|dir| dir.join("segments.json"))
        .find(|candidate| candidate.exists());

    let Some(manifest_path) = manifest_path else {
        return Ok(Some(default_file_convention_fallback(html_path)));
    };

    let manifest_source = fs::read_to_string(&manifest_path)
        .map_err(|err| format!("failed to read {}: {err}", manifest_path.display()))?;
    let manifest: SegmentsManifest = serde_json::from_str(&manifest_source)
        .map_err(|err| format!("failed to parse {}: {err}", manifest_path.display()))?;
    let manifest_dir = manifest_path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", manifest_path.display()))?;

    let stem = html_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let segment_number = STEM_NUMBER_RE
        .captures(stem)
        .and_then(|caps| caps.get(1))
        .and_then(|value| value.as_str().parse::<usize>().ok());

    let (audio_rel, srt_rel) = match special_segment_entry(&manifest, stem) {
        Some((audio, srt)) => (audio, srt),
        None => {
            let Some(id) = segment_number else {
                return Ok(Some(default_file_convention_fallback(html_path)));
            };
            let segment = manifest.segments.iter().find(|entry| entry.id == id);
            let audio_rel = segment.and_then(|entry| entry.audio.clone());
            let srt_rel = segment.and_then(|entry| entry.srt.clone());
            (audio_rel, srt_rel)
        }
    };

    let audio_base = manifest.audio_base.as_deref().unwrap_or("./audio/");
    let srt_base = manifest.srt_base.as_deref().unwrap_or(audio_base);
    let audio_path = audio_rel.map(|rel| manifest_dir.join(audio_base).join(rel));
    let srt_path = srt_rel.map(|rel| manifest_dir.join(srt_base).join(rel));

    let subtitles = match srt_path {
        Some(path) if path.exists() => parse_srt_file(&path)?,
        _ => Vec::new(),
    };
    let total_cues = max_data_cue(&fs::read_to_string(html_path).unwrap_or_default())
        .map(|value| value + 1)
        .or_else(|| (!subtitles.is_empty()).then_some(subtitles.len()));
    let cuemap = if subtitles.is_empty() {
        Vec::new()
    } else {
        (0..total_cues.unwrap_or(subtitles.len()).min(subtitles.len())).collect()
    };

    Ok(Some(ManifestFallback {
        audio_path,
        subtitles,
        cuemap,
        total_cues,
    }))
}

fn special_segment_entry(
    manifest: &SegmentsManifest,
    stem: &str,
) -> Option<(Option<String>, Option<String>)> {
    if stem.contains("cover") {
        return manifest
            .cover
            .as_ref()
            .map(|entry| (entry.audio.clone(), entry.srt.clone()));
    }
    if stem.contains("ending") || stem.starts_with("34-") {
        return manifest
            .ending
            .as_ref()
            .map(|entry| (entry.audio.clone(), entry.srt.clone()));
    }
    None
}

#[derive(Debug)]
struct ManifestFallback {
    audio_path: Option<PathBuf>,
    subtitles: Vec<SubtitleCue>,
    cuemap: Vec<usize>,
    total_cues: Option<usize>,
}

fn default_file_convention_fallback(html_path: &Path) -> ManifestFallback {
    let stem = html_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let segment_number = STEM_NUMBER_RE
        .captures(stem)
        .and_then(|caps| caps.get(1))
        .map(|value| value.as_str().to_string());
    let base_dir = html_path.parent().unwrap_or_else(|| Path::new("."));
    let project_dir = base_dir.parent().unwrap_or(base_dir);
    let audio_path = segment_number
        .as_ref()
        .map(|number| project_dir.join("audio").join(format!("{number}.mp3")))
        .filter(|path| path.exists());
    let subtitles = segment_number
        .as_ref()
        .map(|number| project_dir.join("audio").join(format!("{number}.srt")))
        .filter(|path| path.exists())
        .and_then(|path| parse_srt_file(&path).ok())
        .unwrap_or_default();
    let total_cues = (!subtitles.is_empty()).then_some(subtitles.len());
    let cuemap = (0..subtitles.len()).collect();
    ManifestFallback {
        audio_path,
        subtitles,
        cuemap,
        total_cues,
    }
}

fn parse_srt_file(path: &Path) -> Result<Vec<SubtitleCue>, String> {
    let source = fs::read_to_string(path)
        .map_err(|err| format!("failed to read {}: {err}", path.display()))?;
    parse_srt_text(&source)
}

fn parse_srt_text(source: &str) -> Result<Vec<SubtitleCue>, String> {
    let source = source.replace("\r\n", "\n");
    let mut entries = Vec::new();
    for block in source.split("\n\n") {
        let lines: Vec<&str> = block
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .collect();
        if lines.is_empty() {
            continue;
        }
        let timing_line = lines
            .iter()
            .find(|line| SRT_TIME_RE.is_match(line))
            .copied()
            .ok_or_else(|| format!("invalid SRT block: {block:?}"))?;
        let captures = SRT_TIME_RE
            .captures(timing_line)
            .ok_or_else(|| format!("invalid SRT timing line: {timing_line:?}"))?;
        let start = parse_srt_timestamp(&captures, 1)?;
        let end = parse_srt_timestamp(&captures, 5)?;
        let text = lines
            .iter()
            .skip_while(|line| **line != timing_line)
            .skip(1)
            .copied()
            .collect::<Vec<_>>()
            .join(" ");
        entries.push(SubtitleCue { start, end, text });
    }
    Ok(entries)
}

fn parse_srt_timestamp(captures: &regex::Captures<'_>, start: usize) -> Result<f64, String> {
    let hours: f64 = captures
        .get(start)
        .ok_or("missing hours capture")?
        .as_str()
        .parse()
        .map_err(|err| format!("invalid SRT hour field: {err}"))?;
    let minutes: f64 = captures
        .get(start + 1)
        .ok_or("missing minutes capture")?
        .as_str()
        .parse()
        .map_err(|err| format!("invalid SRT minute field: {err}"))?;
    let seconds: f64 = captures
        .get(start + 2)
        .ok_or("missing seconds capture")?
        .as_str()
        .parse()
        .map_err(|err| format!("invalid SRT second field: {err}"))?;
    let millis: f64 = captures
        .get(start + 3)
        .ok_or("missing millis capture")?
        .as_str()
        .parse()
        .map_err(|err| format!("invalid SRT millis field: {err}"))?;
    Ok(hours * 3600.0 + minutes * 60.0 + seconds + millis / 1000.0)
}

fn max_data_cue(html: &str) -> Option<usize> {
    DATA_CUE_RE
        .captures_iter(html)
        .filter_map(|caps| caps.get(1))
        .filter_map(|value| value.as_str().parse::<usize>().ok())
        .max()
}

// ── __SLIDE_SEGMENTS extraction ──────────────────────────────────
// Extracts audio path from: window.__SLIDE_SEGMENTS = { audio: '...', ... }
fn extract_slide_segments_audio(html: &str) -> Option<String> {
    let block = extract_assignment_object(html, "__SLIDE_SEGMENTS")?;
    extract_object_string(&block, "audio")
}

// Extracts all SRT entries from __SLIDE_SEGMENTS.segments[].srt arrays,
// adjusting timestamps by segment offset (duration + gap).
fn extract_slide_segments_srt(html: &str) -> Vec<SubtitleCue> {
    let Some(block) = extract_assignment_object(html, "__SLIDE_SEGMENTS") else {
        return Vec::new();
    };
    let gap = extract_object_number(&block, "gap").unwrap_or(1.0);
    let Some(segments_src) = extract_inner_array(&block, "segments") else {
        return Vec::new();
    };
    let Ok(seg_objects) = extract_object_literals(&segments_src) else {
        return Vec::new();
    };
    let mut result = Vec::new();
    let mut offset = 0.0_f64;
    for (i, seg_src) in seg_objects.iter().enumerate() {
        let duration = extract_object_number(seg_src, "duration").unwrap_or(0.0);
        // Extract the srt array inside this segment object
        if let Some(srt_src) = extract_inner_array(seg_src, "srt")
            && let Ok(srt_entries) = extract_object_literals(&srt_src)
        {
            for entry_src in &srt_entries {
                let s = extract_object_number(entry_src, "s").unwrap_or(0.0);
                let e = extract_object_number(entry_src, "e").unwrap_or(0.0);
                let t = extract_object_string(entry_src, "t").unwrap_or_default();
                result.push(SubtitleCue {
                    start: s + offset,
                    end: e + offset,
                    text: t,
                });
            }
        }
        offset += duration;
        if i < seg_objects.len() - 1 {
            offset += gap;
        }
    }
    result
}

/// Extracts the top-level object literal assigned to `name`.
/// e.g. `window.__SLIDE_SEGMENTS = { ... }` → inner content of `{ ... }`
fn extract_assignment_object(source: &str, name: &str) -> Option<String> {
    let start = source.find(name)?;
    let after_name = &source[start + name.len()..];
    let equals_index = after_name.find('=')?;
    let rest = after_name[equals_index + 1..].trim_start();
    let (inner, _) = parse_balanced_block(rest, '{', '}')?;
    Some(inner)
}

/// Extracts the content of a named array field inside an object literal.
/// e.g. from `segments: [ ... ]` → inner content of `[ ... ]`
fn extract_inner_array(source: &str, field: &str) -> Option<String> {
    let field_idx = source.find(field)?;
    let rest = &source[field_idx + field.len()..];
    let colon_idx = rest.find(':')?;
    let after_colon = rest[colon_idx + 1..].trim_start();
    let (inner, _) = parse_balanced_block(after_colon, '[', ']')?;
    Some(inner)
}
