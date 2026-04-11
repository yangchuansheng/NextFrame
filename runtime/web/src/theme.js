export const THEMES = {
  default: {
    name: "Default Dark",
    bg: "#0b0b14",
    surface: "#14141e",
    border: "#22222e",
    text: "#e6e6f0",
    accent: "#6366f1",
  },
  velvet: {
    name: "Velvet",
    bg: "#140d18",
    surface: "#201523",
    border: "#3a2740",
    text: "#f4eaf6",
    accent: "#ec4899",
  },
  ice: {
    name: "Ice",
    bg: "#07141d",
    surface: "#11222d",
    border: "#234152",
    text: "#e7f7ff",
    accent: "#22d3ee",
  },
};

function resolveTheme(themeName) {
  return THEMES[themeName] ?? THEMES.default;
}

export function applyTheme(themeName) {
  if (typeof document === "undefined") {
    return resolveTheme(themeName);
  }

  const root = document.documentElement;
  if (!root) {
    return resolveTheme(themeName);
  }

  const theme = resolveTheme(themeName);
  root.style.setProperty("--nf-bg", theme.bg);
  root.style.setProperty("--nf-surface", theme.surface);
  root.style.setProperty("--nf-border", theme.border);
  root.style.setProperty("--nf-text", theme.text);
  root.style.setProperty("--nf-accent", theme.accent);
  return theme;
}

export function initTheme(store) {
  if (!store || typeof store.subscribe !== "function") {
    throw new TypeError("initTheme(store) requires a compatible store");
  }

  applyTheme(store.state?.theme ?? "default");

  return store.subscribe((state, previousState) => {
    const nextTheme = state?.theme ?? "default";
    const previousTheme = previousState?.theme ?? "default";
    if (nextTheme === previousTheme) {
      return;
    }

    applyTheme(nextTheme);
  });
}
