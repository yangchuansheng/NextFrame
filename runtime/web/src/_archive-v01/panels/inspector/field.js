function stringifyValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function renderField({
  label,
  type = "text",
  name,
  value,
  min,
  max,
  step,
  options = [],
  description,
  readOnly = false,
  inlineAction = null,
  details = null,
  onChange,
} = {}) {
  const field = document.createElement("label");
  field.className = "inspector-field";

  const copy = document.createElement("div");
  copy.className = "inspector-field-copy";

  const title = document.createElement("span");
  title.className = "inspector-field-label";
  title.textContent = label || name || "Field";

  copy.appendChild(title);

  if (description) {
    const hint = document.createElement("span");
    hint.className = "inspector-field-description";
    hint.textContent = description;
    copy.appendChild(hint);
  }

  let control;
  if (type === "select") {
    control = document.createElement("select");
    options.forEach((option) => {
      const element = document.createElement("option");
      if (typeof option === "object") {
        element.value = option.value;
        element.textContent = option.label || option.value;
      } else {
        element.value = option;
        element.textContent = option;
      }
      control.appendChild(element);
    });
    control.value = stringifyValue(value);
  } else if (type === "text" && name === "text") {
    control = document.createElement("textarea");
    control.value = stringifyValue(value);
    control.rows = 4;
  } else {
    control = document.createElement("input");
    control.type = type;
    control.value = stringifyValue(value);
  }

  control.className = "inspector-input";
  control.name = name || "";

  if (type !== "select") {
    if (typeof min === "number") {
      control.min = String(min);
    }
    if (typeof max === "number") {
      control.max = String(max);
    }
    if (typeof step === "number") {
      control.step = String(step);
    }
  }

  if (readOnly) {
    control.readOnly = true;
    control.disabled = true;
  }

  if (!readOnly && typeof onChange === "function") {
    const handler = (event) => {
      const rawValue = event.target.value;
      const nextValue = type === "number" || type === "range" ? Number(rawValue) : rawValue;
      onChange(nextValue, rawValue);
    };

    const eventName = type === "text" ? "input" : "change";
    control.addEventListener(eventName, handler);
  }

  const controlRow = document.createElement("div");
  controlRow.className = "inspector-input-row";
  controlRow.appendChild(control);

  if (inlineAction && typeof inlineAction === "object") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inspector-field-inline-action";
    button.textContent = inlineAction.label || "Action";
    button.disabled = Boolean(readOnly || inlineAction.disabled);
    button.title = inlineAction.title || inlineAction.label || "Action";
    button.setAttribute("aria-pressed", String(Boolean(inlineAction.pressed)));

    if (inlineAction.pressed) {
      button.classList.add("is-active");
    }

    if (!button.disabled && typeof inlineAction.onClick === "function") {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        inlineAction.onClick(event);
      });
    }

    controlRow.appendChild(button);
  }

  field.append(copy, controlRow);

  if (details instanceof Node) {
    field.appendChild(details);
  }

  return field;
}
