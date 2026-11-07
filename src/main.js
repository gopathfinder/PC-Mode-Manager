import { renderSidebar } from "./components/sidebar.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderProcessManager } from "./pages/process-manager.js";
import { renderSystemMonitor, stopSystemMonitor } from "./pages/system-monitor.js";
import { renderProfiles } from "./pages/profiles.js";
import { renderSettings } from "./pages/settings.js";
import { applySettings } from "./services/settings.js";

const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
let activePage = "dashboard";

async function navigate(page) {
  stopSystemMonitor();
  activePage = page;
  renderSidebar(sidebar, navigate, activePage);
  if (page === "dashboard") await renderDashboard(content);
  else if (page === "processes") await renderProcessManager(content);
  else if (page === "monitor") await renderSystemMonitor(content);
  else if (page === "profiles") await renderProfiles(content);
  else if (page === "settings") await renderSettings(content, { onLanguageChange: () => navigate("settings") });
}

applySettings(); // тема, язык, отступы — до первого рендера
navigate(activePage);
