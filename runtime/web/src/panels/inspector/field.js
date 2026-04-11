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

    control.addEventListener("change", handler);
  }

  field.append(copy, control);
  return field;
}
