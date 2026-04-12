use super::{
    autosave_storage_test_lock, build_ffmpeg_filter_complex, dispatch, home_dir, initialize,
    mock_ffmpeg_state, recent_storage_test_lock, reset_ffmpeg_path_cache_for_tests,
    resolve_write_path, set_autosave_storage_path_override_for_tests,
    set_recent_storage_path_override_for_tests, AudioSource, CommandOutput, FfmpegCommand,
    MockFfmpegState, Request, MOCK_FFMPEG_TEST_LOCK,
};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process;
use std::sync::MutexGuard;
use std::thread;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn fs_read_dispatch_happy_and_error() {
    let temp = TestDir::new("fs-read");
    let file_path = temp.join("note.txt");
    fs::write(&file_path, "hello bridge").expect("write fixture");

    let response = dispatch(request(
        "fs.read",
        json!({ "path": file_path.display().to_string() }),
    ));
    assert!(response.ok);
    assert_eq!(
        response.result,
        json!({
            "path": file_path.display().to_string(),
            "contents": "hello bridge",
        })
    );

    let error_response = dispatch(request(
        "fs.read",
        json!({ "path": disallowed_absolute_path() }),
    ));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "outside sandbox");
}

#[test]
fn fs_read_rejects_parent_traversal_path() {
    let response = dispatch(request("fs.read", json!({ "path": "../../../etc/passwd" })));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_read_rejects_symlink_escape() {
    let temp = TestDir::new("fs-read-symlink");
    let link_path = temp.join("passwd-link");
    create_file_symlink(Path::new(&disallowed_absolute_path()), &link_path)
        .expect("create symlink");

    let response = dispatch(request(
        "fs.read",
        json!({ "path": link_path.display().to_string() }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_write_dispatch_happy_and_error() {
    let temp = TestDir::new("fs-write");
    let file_path = temp.join("write.txt");

    let response = dispatch(request(
        "fs.write",
        json!({
            "path": file_path.display().to_string(),
            "contents": "written from test",
        }),
    ));
    assert!(response.ok);
    assert_eq!(
        fs::read_to_string(&file_path).expect("read written file"),
        "written from test"
    );

    let error_response = dispatch(request(
        "fs.write",
        json!({
            "path": "../escape.txt",
            "contents": "nope",
        }),
    ));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "outside sandbox");
}

#[test]
fn fs_write_rejects_absolute_system_path() {
    let response = dispatch(request(
        "fs.write",
        json!({
            "path": absolute_write_rejection_path(),
            "contents": "blocked write",
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_write_rejects_symlink_parent_escape() {
    let temp = TestDir::new("fs-write-parent-symlink");
    let link_path = temp.join("escape-dir");
    create_dir_symlink(Path::new(&disallowed_dir_path()), &link_path).expect("create symlink");

    let response = dispatch(request(
        "fs.write",
        json!({
            "path": link_path.join("blocked.txt").display().to_string(),
            "contents": "blocked write",
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_write_rejects_symlink_target_escape() {
    let temp = TestDir::new("fs-write-target-symlink");
    let link_path = temp.join("hosts-link");
    create_file_symlink(Path::new(&absolute_write_rejection_path()), &link_path)
        .expect("create symlink");

    let response = dispatch(request(
        "fs.write",
        json!({
            "path": link_path.display().to_string(),
            "contents": "blocked write",
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_list_dir_dispatch_happy_and_error() {
    let temp = TestDir::new("fs-list");
    fs::write(temp.join("b.txt"), "b").expect("write b");
    fs::write(temp.join("a.txt"), "a").expect("write a");
    fs::create_dir(temp.join("nested")).expect("create nested dir");

    let response = dispatch(request(
        "fs.listDir",
        json!({ "path": temp.path.display().to_string() }),
    ));
    assert!(response.ok);

    let entries = response
        .result
        .get("entries")
        .and_then(Value::as_array)
        .expect("entries array");
    let names = entries
        .iter()
        .filter_map(|entry| entry.get("name").and_then(Value::as_str))
        .collect::<Vec<_>>();
    assert_eq!(names, vec!["a.txt", "b.txt", "nested"]);

    let error_response = dispatch(request("fs.listDir", json!({})));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "missing params.path");
}

#[test]
fn fs_list_dir_rejects_symlink_escape() {
    let temp = TestDir::new("fs-list-symlink");
    let link_path = temp.join("etc-link");
    create_dir_symlink(Path::new(&disallowed_dir_path()), &link_path).expect("create symlink");

    let response = dispatch(request(
        "fs.listDir",
        json!({ "path": link_path.display().to_string() }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn fs_dialog_open_dispatch_happy_and_error() {
    let response = dispatch(request(
        "fs.dialogOpen",
        json!({
            "filters": [
                ".nfproj"
            ]
        }),
    ));
    assert!(response.ok);
    assert_eq!(
        response.result.get("path"),
        Some(&json!(env::temp_dir()
            .join("dialog-open.nfproj")
            .display()
            .to_string()))
    );
    assert_eq!(response.result.get("canceled"), Some(&json!(false)));

    let error_response = dispatch(request("fs.dialogOpen", json!({})));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "missing params.filters");
}

#[test]
fn fs_dialog_save_dispatch_happy_and_error() {
    let response = dispatch(request(
        "fs.dialogSave",
        json!({ "defaultName": "project.nfproj" }),
    ));
    assert!(response.ok);
    assert_eq!(
        response.result.get("path"),
        Some(&json!(env::temp_dir()
            .join("project.nfproj")
            .display()
            .to_string()))
    );
    assert_eq!(response.result.get("canceled"), Some(&json!(false)));

    let error_response = dispatch(request("fs.dialogSave", json!({})));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "missing params.defaultName");
}

#[test]
fn fs_reveal_dispatch_happy_and_error() {
    let temp = TestDir::new("fs-reveal");
    let file_path = temp.join("export.mp4");
    fs::write(&file_path, "video").expect("write export file");

    let response = dispatch(request(
        "fs.reveal",
        json!({ "path": file_path.display().to_string() }),
    ));
    assert!(response.ok);
    assert_eq!(response.result.get("revealed"), Some(&json!(true)));

    let error_response = dispatch(request("fs.reveal", json!({})));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "missing params.path");
}

#[test]
fn log_dispatch_happy_and_error() {
    let response = dispatch(request(
        "log",
        json!({
            "level": "info",
            "msg": "hello from tests",
        }),
    ));
    assert!(response.ok);
    assert_eq!(response.result.get("logged"), Some(&json!(true)));

    let error_response = dispatch(request(
        "log",
        json!({
            "level": "info",
        }),
    ));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "missing params.msg");
}

#[test]
fn scene_list_dispatch_happy_and_error() {
    let response = dispatch(request("scene.list", json!({})));
    assert!(response.ok);

    let scenes = response.result.as_array().expect("scene array");
    assert_eq!(scenes.len(), 10);
    assert_eq!(scenes[0].get("id"), Some(&json!("auroraGradient")));
    assert_eq!(scenes[9].get("id"), Some(&json!("cornerBadge")));

    let error_response = dispatch(request("scene.list", json!("bad params")));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "params must be a JSON object");
}

#[test]
fn timeline_load_dispatch_happy_path() {
    let temp = TestDir::new("timeline-load");
    let timeline_path = temp.join("timeline.json");
    fs::write(
        &timeline_path,
        r##"{"version":"1","duration":30,"background":"#0b0b14","tracks":[{"id":"track-1","kind":"video","clips":[]}]}"##,
    )
    .expect("write timeline");

    let response = dispatch(request(
        "timeline.load",
        json!({ "path": timeline_path.display().to_string() }),
    ));
    assert!(response.ok);
    assert_eq!(
        response.result,
        json!({
            "version": "1",
            "duration": 30,
            "background": "#0b0b14",
            "tracks": [
                { "id": "track-1", "kind": "video", "clips": [] }
            ]
        })
    );
}

#[test]
fn timeline_load_dispatch_error_on_invalid_json() {
    let temp = TestDir::new("timeline-load-invalid");
    let timeline_path = temp.join("timeline.json");
    fs::write(&timeline_path, "not-json").expect("write invalid timeline");
    let error_response = dispatch(request(
        "timeline.load",
        json!({ "path": timeline_path.display().to_string() }),
    ));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "failed to parse timeline");
}

#[test]
fn timeline_load_rejects_symlink_escape() {
    let temp = TestDir::new("timeline-load-symlink");
    let link_path = temp.join("timeline-link.json");
    create_file_symlink(Path::new(&disallowed_absolute_path()), &link_path)
        .expect("create symlink");

    let response = dispatch(request(
        "timeline.load",
        json!({ "path": link_path.display().to_string() }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn timeline_save_dispatch_happy_path() {
    let temp = TestDir::new("timeline-save");
    let timeline_path = temp.join("saved-timeline.json");
    let timeline_path_string = timeline_path.display().to_string();

    let response = dispatch(request(
        "timeline.save",
        json!({
            "path": timeline_path_string,
            "json": {
                "version": "1",
                "duration": 30,
                "background": "#0b0b14",
                "tracks": [
                    { "id": "track-2", "kind": "video", "clips": [] }
                ]
            }
        }),
    ));
    assert!(response.ok);
    assert_eq!(
        response.result.get("path"),
        Some(&json!(timeline_path.display().to_string()))
    );

    let saved = fs::read_to_string(&timeline_path).expect("read saved timeline");
    let saved_json: Value = serde_json::from_str(&saved).expect("parse saved timeline");
    assert_eq!(
        saved_json,
        json!({
            "version": "1",
            "duration": 30,
            "background": "#0b0b14",
            "tracks": [
                { "id": "track-2", "kind": "video", "clips": [] }
            ]
        })
    );
}

#[test]
fn timeline_save_accepts_timeline_alias() {
    let temp = TestDir::new("timeline-save-alias");
    let timeline_path = temp.join("saved-timeline-alias.json");
    let timeline_path_string = timeline_path.display().to_string();

    let response = dispatch(request(
        "timeline.save",
        json!({
            "path": timeline_path_string,
            "timeline": {
                "version": "1",
                "duration": 45,
                "background": "#050814",
                "tracks": [
                    { "id": "track-3", "kind": "video", "clips": [] }
                ]
            }
        }),
    ));
    assert!(response.ok);

    let saved = fs::read_to_string(&timeline_path).expect("read saved timeline");
    let saved_json: Value = serde_json::from_str(&saved).expect("parse saved timeline");
    assert_eq!(
        saved_json,
        json!({
            "version": "1",
            "duration": 45,
            "background": "#050814",
            "tracks": [
                { "id": "track-3", "kind": "video", "clips": [] }
            ]
        })
    );
}

#[test]
fn timeline_save_dispatch_error_on_disallowed_path() {
    let error_response = dispatch(request(
        "timeline.save",
        json!({
            "path": disallowed_absolute_path(),
            "json": { "version": 3 }
        }),
    ));
    assert!(!error_response.ok);
    assert_error_contains(&error_response.error, "outside sandbox");
}

#[test]
fn timeline_save_rejects_symlink_parent_escape() {
    let temp = TestDir::new("timeline-save-parent-symlink");
    let link_path = temp.join("escape-dir");
    create_dir_symlink(Path::new(&disallowed_dir_path()), &link_path).expect("create symlink");

    let response = dispatch(request(
        "timeline.save",
        json!({
            "path": link_path.join("blocked.json").display().to_string(),
            "json": minimal_timeline_json(),
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn timeline_save_rejects_symlink_target_escape() {
    let temp = TestDir::new("timeline-save-target-symlink");
    let link_path = temp.join("timeline-link.json");
    create_file_symlink(Path::new(&absolute_write_rejection_path()), &link_path)
        .expect("create symlink");

    let response = dispatch(request(
        "timeline.save",
        json!({
            "path": link_path.display().to_string(),
            "json": minimal_timeline_json(),
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "outside sandbox");
}

#[test]
fn recent_add_dispatch_dedupes_and_caps_entries() {
    let home = home_dir().expect("home dir");
    let temp = TestDir::new_in(&home, "recent-add");
    let _recent_override = RecentStorageOverrideGuard::new(temp.join(".nextframe/recent.json"));

    for index in 0..12 {
        let project_path = temp.join(&format!("project-{index}.nfproj"));
        fs::write(&project_path, "{}").expect("write project");

        let response = dispatch(request(
            "recent.add",
            json!({ "path": project_path.display().to_string() }),
        ));
        assert!(response.ok);
    }

    let duplicate_path = temp.join("project-5.nfproj");
    let response = dispatch(request(
        "recent.add",
        json!({ "path": duplicate_path.display().to_string() }),
    ));
    assert!(response.ok);

    let list_response = dispatch(request("recent.list", json!({})));
    assert!(list_response.ok);

    let entries = list_response
        .result
        .as_array()
        .expect("recent entries array");
    assert_eq!(entries.len(), 10);

    let names = entries
        .iter()
        .map(|entry| {
            entry
                .get("name")
                .and_then(Value::as_str)
                .expect("recent entry name")
        })
        .collect::<Vec<_>>();
    assert_eq!(
        names,
        vec![
            "project-5.nfproj",
            "project-11.nfproj",
            "project-10.nfproj",
            "project-9.nfproj",
            "project-8.nfproj",
            "project-7.nfproj",
            "project-6.nfproj",
            "project-4.nfproj",
            "project-3.nfproj",
            "project-2.nfproj",
        ]
    );

    let unique_paths = entries
        .iter()
        .map(|entry| {
            entry
                .get("path")
                .and_then(Value::as_str)
                .expect("recent entry path")
        })
        .collect::<HashSet<_>>();
    assert_eq!(unique_paths.len(), entries.len());
}

#[test]
fn autosave_dispatch_round_trips_and_lists_entries() {
    let home = home_dir().expect("home dir");
    let temp = TestDir::new_in(&home, "autosave-round-trip");
    let autosave_dir = temp.join(".nextframe/autosave");
    let _autosave_override = AutosaveStorageOverrideGuard::new(autosave_dir.clone());

    let untitled_response = dispatch(request(
        "autosave.write",
        json!({
            "projectId": "untitled-1234",
            "timeline": minimal_timeline_json(),
        }),
    ));
    assert!(untitled_response.ok);

    thread::sleep(Duration::from_millis(5));

    let saved_project_id = "path-%2FUsers%2Fdemo%2Fedit.nfproj";
    let saved_response = dispatch(request(
        "autosave.write",
        json!({
            "projectId": saved_project_id,
            "timeline": {
                "version": "1",
                "duration": 45,
                "tracks": []
            },
        }),
    ));
    assert!(saved_response.ok);

    let list_response = dispatch(request("autosave.list", json!({})));
    assert!(list_response.ok);

    let entries = list_response
        .result
        .as_array()
        .expect("autosave entries array");
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].get("projectId"), Some(&json!(saved_project_id)));
    assert_eq!(entries[1].get("projectId"), Some(&json!("untitled-1234")));
    assert!(entries[0]
        .get("path")
        .and_then(Value::as_str)
        .expect("autosave path")
        .ends_with(".nfproj"));

    let recover_response = dispatch(request(
        "autosave.recover",
        json!({ "projectId": saved_project_id }),
    ));
    assert!(recover_response.ok);
    assert_eq!(
        recover_response.result,
        json!({
            "version": "1",
            "duration": 45,
            "tracks": []
        })
    );

    let clear_response = dispatch(request(
        "autosave.clear",
        json!({ "projectId": saved_project_id }),
    ));
    assert!(clear_response.ok);
    assert_eq!(clear_response.result.get("cleared"), Some(&json!(true)));

    let remaining = dispatch(request("autosave.list", json!({})));
    assert!(remaining.ok);
    let remaining_entries = remaining.result.as_array().expect("remaining autosaves");
    assert_eq!(remaining_entries.len(), 1);
    assert_eq!(
        remaining_entries[0].get("projectId"),
        Some(&json!("untitled-1234"))
    );
}

#[test]
fn autosave_rejects_invalid_project_id() {
    let home = home_dir().expect("home dir");
    let temp = TestDir::new_in(&home, "autosave-invalid-id");
    let _autosave_override = AutosaveStorageOverrideGuard::new(temp.join(".nextframe/autosave"));

    let response = dispatch(request(
        "autosave.write",
        json!({
            "projectId": "../escape",
            "timeline": minimal_timeline_json(),
        }),
    ));

    assert!(!response.ok);
    assert_error_contains(&response.error, "invalid autosave project id");
}

#[test]
fn resolve_write_path_expands_home_and_allows_missing_export_dirs() {
    let home = home_dir().expect("home dir");
    let result = resolve_write_path("~/Movies/NextFrame/render.mp4")
        .expect("resolve export path under home");
    assert_eq!(result, home.join("Movies/NextFrame/render.mp4"));
}

#[test]
fn export_mux_audio_copies_video_when_no_audio_sources() {
    let temp = TestDir::new("mux-copy");
    let video_path = temp.join("video-only.mp4");
    let output_path = temp.join("final.mp4");
    fs::write(&video_path, "silent-video").expect("write source video");

    let response = dispatch(request(
        "export.muxAudio",
        json!({
            "videoPath": video_path.display().to_string(),
            "audioSources": [],
            "outputPath": output_path.display().to_string(),
        }),
    ));

    assert!(response.ok);
    assert_eq!(response.result.get("ok"), Some(&json!(true)));
    assert_eq!(
        fs::read_to_string(&output_path).expect("read copied output"),
        "silent-video"
    );
}

#[test]
fn export_mux_audio_reports_missing_ffmpeg() {
    let _mock = MockFfmpegHarness::new();
    let temp = TestDir::new("mux-no-ffmpeg");
    let video_path = temp.join("video-only.mp4");
    let audio_path = temp.join("voiceover.mp3");
    let output_path = temp.join("final.mp4");
    fs::write(&video_path, "silent-video").expect("write source video");
    fs::write(&audio_path, "audio").expect("write source audio");

    let response = dispatch(request(
        "export.muxAudio",
        json!({
            "videoPath": video_path.display().to_string(),
            "audioSources": [
                {
                    "path": audio_path.display().to_string(),
                    "startTime": 1.25,
                    "volume": 0.8
                }
            ],
            "outputPath": output_path.display().to_string(),
        }),
    ));

    assert!(response.ok);
    assert_eq!(response.result.get("ok"), Some(&json!(false)));
    assert_eq!(
        response.result.get("error"),
        Some(&json!(
            "Install ffmpeg to export with audio. `brew install ffmpeg`"
        ))
    );
}

#[test]
fn initialize_primes_ffmpeg_cache_before_mux_requests() {
    let mock = MockFfmpegHarness::new();
    mock.set_lookup_result(Ok(Some(PathBuf::from("/mock/bin/ffmpeg"))));
    initialize().expect("initialize bridge");

    {
        let mut state = mock_ffmpeg_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.lookup_result = Ok(None);
    }
    mock.push_run_result(Ok(CommandOutput {
        success: true,
        stderr: String::new(),
    }));

    let temp = TestDir::new("mux-init-cache");
    let video_path = temp.join("video-only.mp4");
    let audio_path = temp.join("voiceover.mp3");
    let output_path = temp.join("final.mp4");
    fs::write(&video_path, "silent-video").expect("write source video");
    fs::write(&audio_path, "audio").expect("write source audio");

    let response = dispatch(request(
        "export.muxAudio",
        json!({
            "videoPath": video_path.display().to_string(),
            "audioSources": [
                {
                    "path": audio_path.display().to_string(),
                    "startTime": 0,
                    "volume": 1
                }
            ],
            "outputPath": output_path.display().to_string(),
        }),
    ));

    assert!(response.ok);
    assert_eq!(response.result.get("ok"), Some(&json!(true)));

    let invocations = mock.take_invocations();
    assert_eq!(invocations.len(), 1);
    assert_eq!(invocations[0].program, PathBuf::from("/mock/bin/ffmpeg"));
}

#[test]
fn export_mux_audio_builds_expected_ffmpeg_command() {
    let mock = MockFfmpegHarness::new();
    mock.set_lookup_result(Ok(Some(PathBuf::from("/mock/bin/ffmpeg"))));
    mock.push_run_result(Ok(CommandOutput {
        success: true,
        stderr: String::new(),
    }));

    let temp = TestDir::new("mux-command");
    let video_path = temp.join("video-only.mp4");
    let audio_a = temp.join("dialog.mp3");
    let audio_b = temp.join("music.wav");
    let output_path = temp.join("final.mp4");
    fs::write(&video_path, "silent-video").expect("write source video");
    fs::write(&audio_a, "audio-a").expect("write source audio a");
    fs::write(&audio_b, "audio-b").expect("write source audio b");
    let video_path_string = fs::canonicalize(&video_path)
        .expect("canonicalize source video")
        .display()
        .to_string();
    let audio_a_string = fs::canonicalize(&audio_a)
        .expect("canonicalize source audio a")
        .display()
        .to_string();
    let audio_b_string = fs::canonicalize(&audio_b)
        .expect("canonicalize source audio b")
        .display()
        .to_string();
    let output_path_string = output_path.display().to_string();

    let response = dispatch(request(
        "export.muxAudio",
        json!({
            "videoPath": video_path_string.clone(),
            "audioSources": [
                {
                    "path": audio_a_string.clone(),
                    "startTime": 0.5,
                    "volume": 1.0
                },
                {
                    "path": audio_b_string.clone(),
                    "startTime": 2.25,
                    "volume": 0.35
                }
            ],
            "outputPath": output_path_string.clone(),
        }),
    ));

    assert!(response.ok);
    assert_eq!(response.result.get("ok"), Some(&json!(true)));

    let invocations = mock.take_invocations();
    assert_eq!(invocations.len(), 1);
    assert_eq!(
        invocations[0],
        FfmpegCommand {
            program: PathBuf::from("/mock/bin/ffmpeg"),
            args: vec![
                "-y",
                "-i",
                &video_path_string,
                "-i",
                &audio_a_string,
                "-i",
                &audio_b_string,
                "-filter_complex",
                "[1:a]adelay=500:all=1,volume=1[a0];[2:a]adelay=2250:all=1,volume=0.35[a1];[a0][a1]amix=inputs=2:normalize=0[aout]",
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                &output_path_string,
            ]
            .into_iter()
            .map(|value| value.to_string())
            .collect(),
        }
    );
}

#[test]
fn export_mux_audio_surfaces_ffmpeg_stderr() {
    let mock = MockFfmpegHarness::new();
    mock.set_lookup_result(Ok(Some(PathBuf::from("/mock/bin/ffmpeg"))));
    mock.push_run_result(Ok(CommandOutput {
        success: false,
        stderr: "ffmpeg stderr output".to_string(),
    }));

    let temp = TestDir::new("mux-stderr");
    let video_path = temp.join("video-only.mp4");
    let audio_path = temp.join("voiceover.mp3");
    let output_path = temp.join("final.mp4");
    fs::write(&video_path, "silent-video").expect("write source video");
    fs::write(&audio_path, "audio").expect("write source audio");

    let response = dispatch(request(
        "export.muxAudio",
        json!({
            "videoPath": video_path.display().to_string(),
            "audioSources": [
                {
                    "path": audio_path.display().to_string(),
                    "startTime": 0,
                    "volume": 1
                }
            ],
            "outputPath": output_path.display().to_string(),
        }),
    ));

    assert!(response.ok);
    assert_eq!(response.result.get("ok"), Some(&json!(false)));
    assert_eq!(
        response.result.get("error"),
        Some(&json!("ffmpeg stderr output"))
    );
}

#[test]
fn build_ffmpeg_filter_complex_formats_delays_and_mix() {
    let filter = build_ffmpeg_filter_complex(&[
        AudioSource {
            path: PathBuf::from("/tmp/a.mp3"),
            start_time: 0.25,
            volume: 1.0,
        },
        AudioSource {
            path: PathBuf::from("/tmp/b.wav"),
            start_time: 1.5,
            volume: 0.4,
        },
    ]);

    assert_eq!(
        filter,
        "[1:a]adelay=250:all=1,volume=1[a0];[2:a]adelay=1500:all=1,volume=0.4[a1];[a0][a1]amix=inputs=2:normalize=0[aout]"
    );
}

struct MockFfmpegHarness {
    _guard: MutexGuard<'static, ()>,
}

impl MockFfmpegHarness {
    fn new() -> Self {
        let guard = MOCK_FFMPEG_TEST_LOCK
            .get_or_init(|| std::sync::Mutex::new(()))
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        {
            let mut state = mock_ffmpeg_state()
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            *state = MockFfmpegState::default();
        }
        reset_ffmpeg_path_cache_for_tests();

        Self { _guard: guard }
    }

    fn set_lookup_result(&self, result: Result<Option<PathBuf>, String>) {
        let mut state = mock_ffmpeg_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.lookup_result = result;
        drop(state);
        reset_ffmpeg_path_cache_for_tests();
    }

    fn push_run_result(&self, result: Result<CommandOutput, String>) {
        let mut state = mock_ffmpeg_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.runs.push_back(result);
    }

    fn take_invocations(&self) -> Vec<FfmpegCommand> {
        let mut state = mock_ffmpeg_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        std::mem::take(&mut state.invocations)
    }
}

impl Drop for MockFfmpegHarness {
    fn drop(&mut self) {
        let mut state = mock_ffmpeg_state()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *state = MockFfmpegState::default();
        reset_ffmpeg_path_cache_for_tests();
    }
}

fn request(method: &str, params: Value) -> Request {
    Request {
        id: format!("req-{method}"),
        method: method.to_string(),
        params,
    }
}

fn assert_error_contains(error: &Option<String>, expected: &str) {
    let error = error.as_deref().expect("response should include an error");
    assert!(
        error.contains(expected),
        "expected '{error}' to contain '{expected}'"
    );
}

fn disallowed_absolute_path() -> String {
    if cfg!(windows) {
        "C:\\Windows\\system32\\drivers\\etc\\hosts".to_string()
    } else {
        "/etc/passwd".to_string()
    }
}

fn absolute_write_rejection_path() -> String {
    if cfg!(windows) {
        "C:\\Windows\\system32\\drivers\\etc\\hosts".to_string()
    } else {
        "/etc/hosts".to_string()
    }
}

fn disallowed_dir_path() -> String {
    if cfg!(windows) {
        "C:\\Windows\\System32".to_string()
    } else {
        "/etc".to_string()
    }
}

fn minimal_timeline_json() -> Value {
    json!({
        "version": 1,
        "metadata": {
            "name": "Test Timeline",
            "fps": 30,
            "width": 1920,
            "height": 1080,
            "durationMs": 1000
        },
        "tracks": []
    })
}

struct RecentStorageOverrideGuard {
    _lock: MutexGuard<'static, ()>,
}

impl RecentStorageOverrideGuard {
    fn new(path: PathBuf) -> Self {
        let lock = recent_storage_test_lock()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        set_recent_storage_path_override_for_tests(Some(path));
        Self { _lock: lock }
    }
}

impl Drop for RecentStorageOverrideGuard {
    fn drop(&mut self) {
        set_recent_storage_path_override_for_tests(None);
    }
}

struct AutosaveStorageOverrideGuard {
    _lock: MutexGuard<'static, ()>,
}

impl AutosaveStorageOverrideGuard {
    fn new(path: PathBuf) -> Self {
        let lock = autosave_storage_test_lock()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        set_autosave_storage_path_override_for_tests(Some(path));
        Self { _lock: lock }
    }
}

impl Drop for AutosaveStorageOverrideGuard {
    fn drop(&mut self) {
        set_autosave_storage_path_override_for_tests(None);
    }
}

struct TestDir {
    path: PathBuf,
}

impl TestDir {
    fn new(label: &str) -> Self {
        Self::new_in(&std::env::temp_dir(), label)
    }

    fn new_in(base: &Path, label: &str) -> Self {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let path = base.join(format!(
            "nextframe-bridge-{label}-{}-{unique}",
            process::id()
        ));

        fs::create_dir_all(&path).expect("create temp test dir");
        Self { path }
    }

    fn join(&self, child: &str) -> PathBuf {
        self.path.join(child)
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        if self.path.exists() {
            let _ = remove_dir_all_if_present(&self.path);
        }
    }
}

fn remove_dir_all_if_present(path: &Path) -> std::io::Result<()> {
    if path.exists() {
        fs::remove_dir_all(path)?;
    }

    Ok(())
}

#[cfg(unix)]
fn create_file_symlink(target: &Path, link: &Path) -> io::Result<()> {
    std::os::unix::fs::symlink(target, link)
}

#[cfg(windows)]
fn create_file_symlink(target: &Path, link: &Path) -> io::Result<()> {
    std::os::windows::fs::symlink_file(target, link)
}

#[cfg(unix)]
fn create_dir_symlink(target: &Path, link: &Path) -> io::Result<()> {
    std::os::unix::fs::symlink(target, link)
}

#[cfg(windows)]
fn create_dir_symlink(target: &Path, link: &Path) -> io::Result<()> {
    std::os::windows::fs::symlink_dir(target, link)
}
