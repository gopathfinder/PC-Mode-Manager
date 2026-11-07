const ITEMS = [
  { id: "dashboard", label: "Mode", icon: "◈", enabled: true },
  { id: "profiles", label: "Profiles", icon: "☰", enabled: true },
  { id: "processes", label: "Processes", icon: "⚙", enabled: true },
  { id: "monitor", label: "System Monitor", icon: "◔", enabled: true },
  { id: "settings", label: "Settings", icon: "⌘", enabled: true },
];

export function renderSidebar(root, onNavigate, activePage = "dashboard") {
  root.innerHTML = `
    <div class="brand"><div class="brand-logo">PM</div><div class="brand-name">PC MODE<br>MANAGER</div></div>
    <nav class="nav">
      ${ITEMS.map(item => `
        <button class="nav-item ${item.id === activePage ? "active" : ""}" data-page="${item.id}" ${item.enabled ? "" : "disabled"}>
          <span>${item.icon}</span><span class="nav-label">${item.label}</span>
          ${item.stage ? `<span class="nav-badge">${item.stage}</span>` : ""}
        </button>`).join("")}
    </nav>`;
  root.querySelectorAll("[data-page]").forEach(button => {
    if (!button.disabled) button.addEventListener("click", () => onNavigate(button.dataset.page));
  });
}
