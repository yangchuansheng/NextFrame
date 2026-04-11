import { createDispatcher } from "./commands.js";

const DEFAULT_PROJECT = {
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
};

export function createDefaultTimeline() {
  return {
    version: "1",
    duration: 30,
    background: "#0b0b14",
    tracks: [],
  };
}

function createInitialState() {
  return {
    playhead: 0,
    playing: true,
    showSafeArea: false,
    project: { ...DEFAULT_PROJECT },
    timeline: createDefaultTimeline(),
    filePath: null,
    dirty: false,
    selectedClipId: null,
    searchQuery: "",
    assets: [],
    selection: {
      trackId: null,
      clipId: null,
    },
    ui: {
      zoom: 1,
      timelineVisible: true,
      inspectorVisible: true,
    },
  };
}

function cloneState(state) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(state);
  }

  return JSON.parse(JSON.stringify(state));
}

function cloneValue(value) {
  return cloneState(value);
}

function sortClips(clips) {
  return [...clips].sort((left, right) => {
    const startDelta = (Number(left?.start) || 0) - (Number(right?.start) || 0);
    if (startDelta !== 0) {
      return startDelta;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function findTrackIdByClipId(timeline, clipId) {
  const tracks = Array.isArray(timeline?.tracks) ? timeline.tracks : [];

  for (const track of tracks) {
    const clips = Array.isArray(track?.clips) ? track.clips : [];
    if (clips.some((clip) => clip?.id === clipId)) {
      return track.id ?? null;
    }
  }

  return null;
}

export const store = {
  state: createInitialState(),
  listeners: new Set(),
  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("store.subscribe(listener) requires a function");
    }

    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  replace(nextState) {
    if (!nextState || typeof nextState !== "object") {
      throw new TypeError("store.replace(nextState) requires a state object");
    }

    const previousState = cloneState(this.state);
    const previousDirty = this.state.dirty;
    const previousTimeline = this.state.timeline;
    let resolvedState = nextState;

    if (resolvedState.timeline !== previousTimeline && resolvedState.dirty === previousDirty) {
      resolvedState = {
        ...resolvedState,
        dirty: true,
      };
    }

    this.state = resolvedState;

    for (const listener of this.listeners) {
      listener(this.state, previousState);
    }

    return this.state;
  },
  mutate(recipe) {
    if (typeof recipe !== "function") {
      throw new TypeError("store.mutate(recipe) requires a function");
    }

    const previousState = cloneState(this.state);
    const prevDirty = this.state.dirty;
    const prevTimeline = this.state.timeline;
    let dirtyAssigned = false;
    const proxy = new Proxy(this.state, {
      get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (prop === "dirty") {
          dirtyAssigned = true;
        }

        return Reflect.set(target, prop, value, receiver);
      },
    });

    recipe(proxy);

    if (!dirtyAssigned && this.state.timeline !== prevTimeline && this.state.dirty === prevDirty) {
      this.state.dirty = true;
    }

    for (const listener of this.listeners) {
      listener(this.state, previousState);
    }

    return this.state;
  },
  addClip(trackId, clip) {
    if (typeof trackId !== "string" || trackId.length === 0) {
      throw new TypeError("store.addClip(trackId, clip) requires a non-empty track id");
    }

    if (!clip || typeof clip !== "object") {
      throw new TypeError("store.addClip(trackId, clip) requires a clip object");
    }

    const timeline = this.state.timeline || createDefaultTimeline();
    const tracks = Array.isArray(timeline.tracks) ? timeline.tracks : [];
    const trackIndex = tracks.findIndex((track) => track?.id === trackId);
    if (trackIndex < 0) {
      throw new Error(`store.addClip(trackId, clip) could not find track "${trackId}"`);
    }

    const nextTracks = tracks.map((track, index) => {
      if (index !== trackIndex) {
        return track;
      }

      return {
        ...track,
        clips: sortClips([...(Array.isArray(track?.clips) ? track.clips : []), cloneValue(clip)]),
      };
    });

    return this.replace({
      ...this.state,
      timeline: {
        ...timeline,
        tracks: nextTracks,
      },
    });
  },
  selectClip(clipId) {
    const nextClipId = clipId == null ? null : String(clipId);
    const trackId = nextClipId ? findTrackIdByClipId(this.state.timeline, nextClipId) : null;

    return this.replace({
      ...this.state,
      selectedClipId: trackId ? nextClipId : null,
      selection: {
        trackId,
        clipId: trackId ? nextClipId : null,
      },
    });
  },
};

const dispatcher = createDispatcher(store);

store.dispatch = (command) => dispatcher.dispatch(command);
store.undo = () => dispatcher.undo();
store.redo = () => dispatcher.redo();

Object.defineProperties(store, {
  canUndo: {
    enumerable: true,
    get() {
      return dispatcher.canUndo;
    },
  },
  canRedo: {
    enumerable: true,
    get() {
      return dispatcher.canRedo;
    },
  },
});
