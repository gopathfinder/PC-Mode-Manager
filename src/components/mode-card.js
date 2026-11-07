import { iconGlyph } from "./icons.js";

export function createModeCard(mode, isActive, busy, onToggle) {
  const el = document.createElement("article");
  el.className = `mode-card ${isActive ? "active" : ""}`;
  el.style.setProperty("--c", mode.color);

  const icon = document.createElement("div");
  icon.className = "mode-icon";
  icon.textContent = iconGlyph(mode.icon);

  const title = document.createElement("h2");
  title.textContent = mode.name;
  const desc = document.createElement("p");
  desc.textContent = mode.description;

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = isActive ? "Deactivate" : "Activate";
  btn.disabled = busy;
  btn.addEventListener("click", () => onToggle(mode, isActive));

  el.append(icon, title, desc, btn);
  return el;
}
