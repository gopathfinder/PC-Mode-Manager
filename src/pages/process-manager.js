import { notify } from "../components/notification.js";
import { pickFile } from "../components/file-picker.js";
import { getSettings } from "../services/settings.js";
import { getProcesses, launchApplication, closeApplication, forceTerminateProcess } from "../services/process-service.js";

const formatMemory = (bytes) => {
  if (!Number.isFinite(bytes)) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

export async function renderProcessManager(root) {
  root.innerHTML = `
    <header class="page-header">
      <div><h1>Process Manager</h1><p class="muted">Просмотр и безопасное управление процессами Windows</p></div>
      <button class="btn process-refresh" id="refresh">↻ Обновить</button>
    </header>
    <section class="launch-panel">
      <div><h2>Запуск приложения</h2><p class="muted">Укажите абсолютный путь к файлу. Аргументы — по одному на строку.</p></div>
      <form id="launch-form" class="launch-form">
        <div class="pick-row"><input id="exe-path" type="text" placeholder="C:\\Program Files\\App\\app.exe" required /><button type="button" class="mini-btn pick-btn" id="pick-exe" title="Выбрать файл">📂</button></div>
        <textarea id="exe-args" rows="2" placeholder="Аргумент 1&#10;Аргумент 2"></textarea>
        <button class="btn" type="submit">Запустить</button>
      </form>
    </section>
    <section class="process-toolbar">
      <input id="search" type="search" placeholder="Поиск по имени или PID…" />
      <span class="muted" id="count">Загрузка процессов…</span>
    </section>
    <div class="process-table-wrap">
      <table class="process-table">
        <thead><tr>${["name:Процесс","pid:PID","memory:Память","status:Статус"].map(c => { const [k, l] = c.split(":"); return `<th>${l}<span class="sort-arrows"><button type="button" data-sort="${k}" data-dir="asc" title="▲">▲</button><button type="button" data-sort="${k}" data-dir="desc" title="▼">▼</button></span></th>`; }).join("")}<th>Действия</th></tr></thead>
        <tbody id="process-rows"><tr><td colspan="5">Загрузка…</td></tr></tbody>
      </table>
    </div>
    <p class="process-note">Защищённые процессы нельзя завершить. «Закрыть» отправляет стандартный запрос Windows WM_CLOSE. Принудительное завершение доступно отдельно и требует подтверждения.</p>`;

  const rows = root.querySelector("#process-rows");
  const count = root.querySelector("#count");
  const search = root.querySelector("#search");
  let processes = [];
  let sort = { key: "name", dir: "asc" };
  const compare = (a, b) => {
    const k = sort.key;
    const r = k === "pid" ? a.pid - b.pid : k === "memory" ? a.memory_bytes - b.memory_bytes
      : String(a[k] ?? "").toLowerCase().localeCompare(String(b[k] ?? "").toLowerCase());
    return sort.dir === "asc" ? r : -r;
  };
  const mark = () => root.querySelectorAll("[data-sort]").forEach(b => b.classList.toggle("on", b.dataset.sort === sort.key && b.dataset.dir === sort.dir));
  root.querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => { sort = { key: b.dataset.sort, dir: b.dataset.dir }; mark(); draw(); }));

  function draw() {
    const query = search.value.trim().toLowerCase();
    const filtered = processes.filter(p => p.name.toLowerCase().includes(query) || String(p.pid).includes(query)).sort(compare);
    count.textContent = `${filtered.length} из ${processes.length} процессов`;
    rows.replaceChildren();
    if (!filtered.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td"); td.colSpan = 5; td.textContent = "Процессы не найдены";
      tr.append(td); rows.append(tr); return;
    }
    for (const process of filtered) {
      const tr = document.createElement("tr");
      const nameCell = document.createElement("td");
      nameCell.innerHTML = `<strong></strong><small></small>`;
      nameCell.querySelector("strong").textContent = process.name || "Без имени";
      nameCell.querySelector("small").textContent = process.exe_path || "Путь недоступен";
      const pid = document.createElement("td"); pid.textContent = process.pid;
      const memory = document.createElement("td"); memory.textContent = formatMemory(process.memory_bytes);
      const status = document.createElement("td"); status.textContent = process.status;
      const actions = document.createElement("td"); actions.className = "process-actions";
      const close = document.createElement("button"); close.className = "mini-btn"; close.textContent = "Закрыть";
      close.disabled = process.protected;
      close.title = process.protected ? "Защищённый процесс" : "Отправить WM_CLOSE";
      close.addEventListener("click", async () => {
        try { await closeApplication(process.pid); notify(`Запрос закрытия отправлен: ${process.name}`, "success"); setTimeoutRefresh(); }
        catch (e) { notify(e.message, "error", 7000); }
      });
      const force = document.createElement("button"); force.className = "mini-btn danger"; force.textContent = "Завершить";
      force.disabled = process.protected;
      force.title = "Принудительное завершение";
      force.addEventListener("click", async () => {
        if (getSettings().confirmForce && !window.confirm(`Принудительно завершить ${process.name} (PID ${process.pid})? Несохранённые данные могут быть потеряны.`)) return;
        try { await forceTerminateProcess(process.pid); notify(`Процесс ${process.name} завершён`, "success"); await refresh(); }
        catch (e) { notify(e.message, "error", 7000); }
      });
      actions.append(close, force);
      tr.append(nameCell, pid, memory, status, actions); rows.append(tr);
    }
  }

  async function refresh() {
    try { processes = await getProcesses(); draw(); }
    catch (e) { rows.textContent = ""; const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 5; td.textContent = e.message; tr.append(td); rows.append(tr); notify(e.message, "error", 7000); }
  }
  function setTimeoutRefresh() { window.setTimeout(refresh, 1200); }

  mark();
  root.querySelector("#pick-exe").addEventListener("click", async () => {
    try { const path = await pickFile(); if (path) root.querySelector("#exe-path").value = path; }
    catch (e) { notify(e.message, "error"); }
  });
  root.querySelector("#refresh").addEventListener("click", refresh);
  search.addEventListener("input", draw);
  root.querySelector("#launch-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const path = root.querySelector("#exe-path").value.trim();
    const args = root.querySelector("#exe-args").value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    try {
      const result = await launchApplication(path, args);
      notify(`Приложение запущено (PID ${result.pid})`, "success");
      await refresh();
    } catch (e) { notify(e.message, "error", 7000); }
  });
  await refresh();
}
