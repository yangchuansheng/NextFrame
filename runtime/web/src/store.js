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
    playing: false,
    showSafeArea: false,
    project: { ...DEFAULT_PROJECT },
    timeline: createDefaultTimeline(),
    filePath: null,
    dirty: false,
    ui: {
      zoom: 1,
      timelineVisible: true,
      inspectorVisible: true,
    },
  };
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
  mutate(recipe) {
    if (typeof recipe !== "function") {
      throw new TypeError("store.mutate(recipe) requires a function");
    }

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
      listener(this.state);
    }

    return this.state;
  },
};
