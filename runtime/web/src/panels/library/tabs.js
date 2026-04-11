export const LIBRARY_TABS = [
  { id: "scenes", label: "Scenes" },
  { id: "media", label: "Media" },
  { id: "audio", label: "Audio" },
];

export function createLibraryTabs(activeTab, onSelect) {
  const row = document.createElement("div");
  row.className = "library-tabs";
  row.setAttribute("role", "tablist");
  row.setAttribute("aria-label", "Asset library categories");

  LIBRARY_TABS.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-tab";
    button.textContent = tab.label;
    button.dataset.tabId = tab.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", tab.id === activeTab ? "true" : "false");

    if (tab.id === activeTab) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => onSelect(tab.id));
    row.appendChild(button);
  });

  return row;
}
