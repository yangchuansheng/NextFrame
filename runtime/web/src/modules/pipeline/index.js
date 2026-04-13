/* === pipeline/index.js === */
var pipelineData = null;
var pipelineStage = "script";

async function goPipeline(project, episode) {
  if (typeof project === "string") {
    currentProject = project;
  }
  if (typeof episode === "string") {
    currentEpisode = episode;
  }

  stopWatching();
  setPlaybackState(false);
  switchView("view-pipeline");

  var plProject = document.getElementById("pl-bc-project");
  var plEpisode = document.getElementById("pl-bc-episode");
  if (plProject) {
    plProject.textContent = currentProject || "Project";
  }
  if (plEpisode) {
    plEpisode.textContent = currentEpisode || "Episode";
  }

  pipelineData = null;
  renderPipelineStage();

  try {
    var homePath = "~/NextFrame/projects/" + currentProject + "/" + currentEpisode + "/pipeline.json";
    var result = await bridgeCall("fs.read", { path: homePath }, 3000);
    pipelineData = JSON.parse(result.contents);
  } catch (_error) {
    pipelineData = {
      version: "0.4",
      script: { principles: {}, arc: [], segments: [] },
      audio: { voice: null, speed: 1, segments: [] },
      atoms: [],
      outputs: [],
    };
  }
  renderPipelineStage();
}

function switchPipelineStage(stage) {
  pipelineStage = stage;
  if (stage === "assembly") {
    if (currentProject && currentEpisode) {
      goEditor(currentProject, currentEpisode);
    }
    return;
  }

  var activeView = document.querySelector(".view.active");
  if (activeView && activeView.id === "view-editor") {
    switchView("view-pipeline");
  }

  document.querySelectorAll(".pl-tab").forEach(function(tab) {
    tab.classList.toggle("active", tab.dataset.stage === stage);
  });
  renderPipelineStage();
}

function renderPipelineStage() {
  var container = document.getElementById("pipeline-content");
  if (!container) {
    return;
  }
  resetPipelineAudioPlayback();

  if (!pipelineData) {
    container.innerHTML = '<div class="pipeline-empty">Loading...</div>';
    return;
  }

  switch (pipelineStage) {
    case "script":
      container.innerHTML = renderPipelineScript(pipelineData);
      break;
    case "audio":
      container.innerHTML = renderPipelineAudio(pipelineData);
      break;
    case "clips":
      container.innerHTML = renderPipelineClips(pipelineData);
      break;
    case "atoms":
      container.innerHTML = renderPipelineAtoms(pipelineData);
      break;
    case "assembly":
      container.innerHTML = '<div class="pipeline-empty">正在加载编辑器...</div>';
      if (currentProject && currentEpisode) {
        goEditor(currentProject, currentEpisode);
      }
      break;
    case "output":
      container.innerHTML = renderPipelineOutput(pipelineData);
      break;
    default:
      container.innerHTML = '<div class="pipeline-empty">Unknown stage</div>';
  }

  bindPipelineEvents(container);
}

function bindPipelineEvents(container) {
  container.querySelectorAll("[data-audio-path]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      playPipelineAudio(btn, btn.dataset.audioPath);
    });
  });

  container.querySelectorAll("[data-video-path]").forEach(function(btn) {
    btn.addEventListener("click", function(event) {
      event.stopPropagation();
      playPipelineVideo(btn.dataset.videoPath);
    });
  });

  container.querySelectorAll("[data-filter-seg]").forEach(function(pill) {
    pill.addEventListener("click", function() {
      plFilterSeg(parseInt(pill.dataset.filterSeg, 10));
    });
  });

  container.querySelectorAll("[data-filter-type]").forEach(function(pill) {
    pill.addEventListener("click", function() {
      var type = pill.dataset.filterType;
      container.querySelectorAll("[data-filter-type]").forEach(function(entry) {
        entry.classList.toggle("active", entry.dataset.filterType === type);
      });
      container.querySelectorAll("[data-type]").forEach(function(card) {
        card.style.display = (type === "all" || card.dataset.type === type) ? "" : "none";
      });
    });
  });

  // Clips source sidebar click
  container.querySelectorAll("[data-clips-idx]").forEach(function(item) {
    item.addEventListener("click", function() {
      container.querySelectorAll("[data-clips-idx]").forEach(function(s) {
        s.style.borderColor = "transparent";
        s.style.background = "transparent";
      });
      item.style.borderColor = "rgba(124,106,239,0.25)";
      item.style.background = "rgba(124,106,239,0.03)";
      var idx = parseInt(item.dataset.clipsIdx, 10);
      var videos = (pipelineData.atoms || []).filter(function(a) { return a.type === "video"; });
      var detail = document.getElementById("clips-detail");
      if (detail && videos[idx]) {
        detail.innerHTML = renderClipDetail(videos[idx]);
        detail.querySelectorAll("[data-video-path]").forEach(function(btn) {
          btn.addEventListener("click", function(e) { e.stopPropagation(); playPipelineVideo(btn.dataset.videoPath); });
        });
      }
    });
  });
}
