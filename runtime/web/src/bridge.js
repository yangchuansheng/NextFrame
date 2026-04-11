const pending = new Map();
let nextId = 0;

function createId() {
  nextId += 1;
  return `ipc-${Date.now()}-${nextId}`;
}

function toError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

window.__ipc = window.__ipc ?? {};
window.__ipc.resolve = function resolve(response) {
  const payload =
    typeof response === "string" ? JSON.parse(response) : response ?? {};
  const entry = pending.get(payload.id);

  if (!entry) {
    return;
  }

  pending.delete(payload.id);

  if (payload.ok) {
    entry.resolve(payload.result);
    return;
  }

  entry.reject(new Error(payload.error ?? "IPC request failed"));
};

export function call(method, params = {}) {
  if (typeof window.ipc?.postMessage !== "function") {
    return Promise.reject(
      new Error("window.ipc.postMessage is unavailable in this runtime"),
    );
  }

  const id = createId();
  const request = { id, method, params };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });

    try {
      window.ipc.postMessage(JSON.stringify(request));
    } catch (error) {
      pending.delete(id);
      reject(toError(error));
    }
  });
}

export default { call };
