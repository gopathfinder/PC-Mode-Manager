import { getModes, getActiveMode, setMode, deactivateMode } from "../services/mode-service.js";
import { createModeCard } from "../components/mode-card.js";
import { notify } from "../components/notification.js";

export async function renderDashboard(root) {
  root.innerHTML = `
    <header class="page-header">
      <div><h1>Mode</h1><p class="muted">Выберите режим работы</p></div>
      <div class="status-pill" id="status"><span class="dot"></span><span id="status-text">Загрузка…</span></div>
    </header>
    <section class="cards" id="cards"></section>`;

  const status = root.querySelector("#status");
  const statusText = root.querySelector("#status-text");
  const cards = root.querySelector("#cards");
  let modes = [];
  let active = null;
  let busy = false;

  const draw = () => {
    const current = modes.find((m) => m.id === active);
    status.className = `status-pill ${current ? "on" : ""}`;
    statusText.textContent = current ? `Активен: ${current.name}` : "Режим не выбран";
    cards.replaceChildren(...modes.map((m) => createModeCard(m, m.id === active, busy, onToggle)));
  };

  async function onToggle(mode, isActive) {
    if (busy) return; // не допускаем одновременных переключений
    busy = true; draw();
    try {
      if (isActive) { await deactivateMode(); active = null; notify(`${mode.name} выключен`, "success"); }
      else {
        const result = await setMode(mode.id);
        active = result.active;
        notify(`${mode.name} включён`, "success");
        (result.warnings || []).forEach((w) => notify(`⚠ ${w}`, "error", 9000));
      }
    } catch (e) {
      notify(e.message, "error");
    } finally {
      busy = false; draw();
    }
  }

  try {
    [modes, active] = await Promise.all([getModes(), getActiveMode()]);
    draw();
  } catch (e) {
    status.className = "status-pill err";
    statusText.textContent = "Нет связи с backend";
    notify(e.message, "error", 8000);
  }
}
