import { getSettings, saveSettings } from "../services/settings.js";
import { notify } from "../components/notification.js";

const autostart = () => window.__TAURI__?.autostart;

export async function renderSettings(root, { onLanguageChange } = {}) {
  const s = getSettings();
  let autostartOn = false;
  let autostartKnown = false;
  try { autostartOn = await autostart()?.isEnabled(); autostartKnown = !!autostart(); } catch { /* недоступно вне Tauri */ }

  root.innerHTML = `
    <header class="page-header"><div><h1>System Settings</h1><p class="muted">Конфигурация интерфейса и поведения приложения</p></div><span class="status-pill"><span class="dot" style="background:#c8102e"></span> PC MODE MANAGER</span></header>
    <section class="settings-grid">
      <article class="monitor-panel settings-panel"><h2>Внешний вид</h2>
        <label class="settings-row"><span>Тема</span><select id="theme"><option value="dark" ${s.theme === "dark" ? "selected" : ""}>Тёмная</option><option value="light" ${s.theme === "light" ? "selected" : ""}>Светлая</option></select></label>
        <label class="settings-row"><span>Язык</span><select id="lang"><option value="ru" ${s.lang === "ru" ? "selected" : ""}>Русский</option><option value="en" ${s.lang === "en" ? "selected" : ""}>English</option></select></label>
        <label class="settings-toggle"><input id="compact" type="checkbox" ${s.compact ? "checked" : ""}> Компактные отступы</label>
        <label class="settings-toggle"><input id="motion" type="checkbox" ${s.motion ? "checked" : ""}> Анимации интерфейса</label>
        <p class="muted">Настройки сохраняются локально на этом компьютере.</p>
      </article>
      <article class="monitor-panel settings-panel"><h2>Запуск</h2>
        <label class="settings-toggle"><input id="autostart" type="checkbox" ${autostartOn ? "checked" : ""} ${autostartKnown ? "" : "disabled"}> Запускать PC Mode Manager при включении Windows</label>
        <h2>Безопасность процессов</h2>
        <label class="settings-toggle"><input id="confirm-force" type="checkbox" ${s.confirmForce ? "checked" : ""}> Всегда спрашивать подтверждение перед принудительным завершением процесса</label>
        <p class="muted">Защита системных процессов остаётся включённой в любом случае.</p>
        <div class="settings-info"><b>PC MODE MANAGER</b><span>v1.2.0 · Tauri 2</span><span>Профили и режимы хранятся отдельно от настроек оформления.</span></div>
      </article>
    </section>`;

  const $ = (id) => root.querySelector(id);
  $("#theme").addEventListener("change", (e) => saveSettings({ theme: e.target.value }));
  $("#compact").addEventListener("change", (e) => saveSettings({ compact: e.target.checked }));
  $("#motion").addEventListener("change", (e) => saveSettings({ motion: e.target.checked }));
  $("#confirm-force").addEventListener("change", (e) => saveSettings({ confirmForce: e.target.checked }));
  $("#lang").addEventListener("change", (e) => { saveSettings({ lang: e.target.value }); onLanguageChange?.(); });
  $("#autostart").addEventListener("change", async (e) => {
    try {
      if (e.target.checked) await autostart().enable(); else await autostart().disable();
      notify(e.target.checked ? "Автозапуск включён" : "Автозапуск выключен", "success");
    } catch (err) { e.target.checked = !e.target.checked; notify(String(err?.message ?? err), "error", 7000); }
  });
}
