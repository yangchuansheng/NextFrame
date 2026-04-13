/* === state.js === */
var DESKTOP_CONNECT_MESSAGE = "Connect via desktop app to load projects";
var NO_PROJECTS_MESSAGE = "No projects — create one with `nextframe project-new <name>`";
var IPC_HOME_TIMEOUT_MS = 1500;
var IPC_LOAD_TIMEOUT_MS = 4000;
var IPC_POLL_TIMEOUT_MS = 1200;
var IPC_COMPOSE_TIMEOUT_MS = 20000;
var HOME_RETRY_DELAY_MS = 500;
var HOME_RETRY_COUNT = 3;
var ACCENT_NAMES = ["accent", "warm", "blue"];
var GLOW_NAMES = ["glow-accent", "glow-warm", "glow-blue"];

var TOTAL_DURATION = 26;
var isPlaying = false;
var currentTime = 2.4;
var playRAF = null;
var lastTS = null;

var playerPlaying = false;
var playerAnim = null;
var playerDur = 26;

var overlay = null;

var currentProject = null;
var currentEpisode = null;
var currentSegment = null;
var currentSegmentPath = null;
var currentTimeline = null;
var currentSelectedClipId = null;
var previewEngine = null;
var previewStageHost = null;
var previewTimeline = null;
var previewStageClickHandler = null;
var previewReloadSeq = 0;

var projectsCache = [];
var episodesCache = [];
var segmentsCache = [];
var episodesCacheProject = null;
var exportsCache = [];

var homeLoadSeq = 0;
var projectLoadSeq = 0;
var editorLoadSeq = 0;
