export function createInspectorSection(title, subtitle) {
  const section = document.createElement("section");
  section.className = "inspector-section";

  const header = document.createElement("div");
  header.className = "inspector-section-header";

  const heading = document.createElement("strong");
  heading.textContent = title;
  header.appendChild(heading);

  if (subtitle) {
    const hint = document.createElement("span");
    hint.textContent = subtitle;
    header.appendChild(hint);
  }

  const body = document.createElement("div");
  body.className = "inspector-section-body";

  section.append(header, body);
  return { section, body };
}

export function createReadonlyRow(label, value) {
  const row = document.createElement("div");
  row.className = "inspector-static-row";

  const title = document.createElement("span");
  title.className = "inspector-static-label";
  title.textContent = label;

  const content = document.createElement("span");
  content.className = "inspector-static-value";
  content.textContent = value;

  row.append(title, content);
  return row;
}
