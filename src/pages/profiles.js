import { getProfiles, createProfile, updateProfile, deleteProfile, exportProfile, importProfile, restoreDefaultProfiles } from "../services/profile-service.js";
import { notify } from "../components/notification.js";
import { ICON_GROUPS, iconGlyph } from "../components/icons.js";
import { pickFile, pickFolder, pickJson, pickSaveJson } from "../components/file-picker.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const KINDS = { exe: "EXE", bat: "BAT", cmd: "CMD", ps1: "PowerShell" };
const SUPPORTED = /\.(exe|bat|cmd|ps1)$/i;
let profiles = [];
let busy = false;

// Разбор аргументов с кавычками: -a "my file.txt" -> ["-a", "my file.txt"]
function splitArgs(text) {
  const out = []; const re = /"([^"]*)"|(\S+)/g; let m;
  while ((m = re.exec(text))) out.push(m[1] ?? m[2]);
  return out;
}
function actionLabel(action) {
  const p = action.parameters || {};
  if (action.type === "launch_application") {
    const kind = KINDS[String(p.path || "").split(".").pop().toLowerCase()] || "?";
    const args = (p.args || []).length ? ` ${p.args.join(" ")}` : "";
    const dir = p.working_dir ? ` [папка: ${p.working_dir}]` : "";
    return `Запустить ${kind}: ${p.path || "путь не указан"}${args}${dir}`;
  }
  if (action.type === "delay") return `Пауза ${(Number(p.ms) / 1000).toFixed(1)} с`;
  if (action.type === "close_application") return `Закрыть приложение: ${p.name || "не указано"}`;
  return `${action.type}`;
}

/* ---------- список профилей ---------- */
function drawList(root) {
  const cards = profiles.map(profile => {
    const launches = profile.actions.filter(a => a.type === "launch_application" && a.enabled).length;
    return `<article class="profile-card" style="--profile-color:${esc(profile.color)}">
      <div class="profile-card-head"><div class="profile-icon">${esc(iconGlyph(profile.icon))}</div>
        <span class="profile-state ${profile.enabled ? "enabled" : ""}">${profile.enabled ? "Включён" : "Отключён"}</span></div>
      <h2>${esc(profile.name)}</h2>
      <p>${esc(profile.description || "Описание не задано")}</p>
      <div class="profile-meta"><span>${profile.actions.length} действий</span><span>${launches} запусков</span></div>
      <div class="profile-actions">
        <button class="mini-btn" data-edit="${esc(profile.id)}">Настроить</button>
        <button class="mini-btn" data-export="${esc(profile.id)}" title="Экспорт">⇩ Экспорт</button>
        <button class="mini-btn danger" data-delete="${esc(profile.id)}">Удалить</button>
      </div></article>`;
  }).join("");

  root.innerHTML = `
    <header class="page-header">
      <div><h1>Profiles Manager</h1><p class="muted">Создавайте режимы и настраивайте автоматический запуск программ</p></div>
      <div class="header-actions">
        <button class="mini-btn" id="restore-defaults">↺ Стандартные</button>
        <button class="mini-btn" id="import-profile">⇪ Импорт</button>
        <button class="primary-btn" id="new-profile">＋ Создать профиль</button>
      </div>
    </header>
    <section class="profiles-grid">${cards || `<p class="muted">Профилей пока нет.</p>`}</section>
    <p class="profile-footnote">Запускаются только файлы, которые вы добавили сами (.exe, .bat, .cmd, .ps1). Права администратора скрыто не повышаются.</p>`;

  root.querySelector("#new-profile").addEventListener("click", () => drawEditor(root, null));
  root.querySelector("#import-profile").addEventListener("click", () => doImport(root));
  root.querySelector("#restore-defaults").addEventListener("click", () => doRestore(root));
  root.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => drawEditor(root, profiles.find(p => p.id === b.dataset.edit))));
  root.querySelectorAll("[data-export]").forEach(b => b.addEventListener("click", () => doExport(b.dataset.export)));
  root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => removeProfile(root, b.dataset.delete)));
}

/* ---------- редактор ---------- */
function drawEditor(root, profile) {
  const p = profile || { schema_version: 1, id: "", name: "", description: "", enabled: true, color: "#c8102e", icon: "🎮", actions: [] };
  const currentIcon = iconGlyph(p.icon);
  const actions = [...(p.actions || [])];

  root.innerHTML = `
    <div class="editor-top">
      <button class="icon-btn" id="back" title="Назад">←</button>
      <div><h1>${profile ? "Настройка профиля" : "Новый профиль"}</h1><p class="muted">Укажите параметры и программы для автоматического запуска</p></div>
    </div>
    <div class="chips">
      ${profiles.map(x => `<button type="button" class="chip ${profile && x.id === profile.id ? "active" : ""}" data-switch="${esc(x.id)}">${esc(iconGlyph(x.icon))} ${esc(x.name)}</button>`).join("")}
      <button type="button" class="chip ${profile ? "" : "active"}" data-switch="">＋ Новый профиль</button>
    </div>
    <section class="profile-editor">
      <form id="profile-form">
        <div class="profile-fields">
          <label>ID профиля<input name="id" value="${esc(p.id)}" placeholder="my-gaming" ${profile ? "readonly" : ""} required pattern="[A-Za-z0-9_-]{1,64}" maxlength="64"></label>
          <label>Название<input name="name" value="${esc(p.name)}" placeholder="Мой игровой режим" maxlength="80" required></label>
          <label class="field-wide">Описание<textarea name="description" rows="2" maxlength="500">${esc(p.description)}</textarea></label>
          <label>Цвет профиля<input name="color" type="color" value="${esc(p.color)}"></label>
          <label class="toggle-field"><input type="checkbox" name="enabled" ${p.enabled ? "checked" : ""}> Профиль доступен на Dashboard</label>
          <div class="field-wide"><span class="muted">Иконка</span>
            <div class="icon-picker">${ICON_GROUPS.map(([group, list]) => `<div class="icon-group"><small>${group}</small><div>${list.map(i => `<label class="icon-opt"><input type="radio" name="icon" value="${i}" ${i === currentIcon ? "checked" : ""}><span>${i}</span></label>`).join("")}</div></div>`).join("")}</div>
          </div>
        </div>
        <div class="actions-editor">
          <div class="editor-heading"><div><h3>Автоматизация запуска</h3><p class="muted">Действия выполняются по порядку при включении этого режима</p></div></div>
          <div id="launch-list" class="launch-list"></div>
          <div class="launch-add">
            <label>Путь к файлу (.exe, .bat, .cmd, .ps1)<div class="pick-row"><input id="app-path" placeholder="C:\\zapret\\general.bat"><button type="button" class="mini-btn pick-btn" id="pick-file" title="Выбрать файл">📂</button></div></label>
            <label>Аргументы (необязательно)<input id="app-args" placeholder="-silent"></label>
            <label>Рабочая папка (необязательно)<div class="pick-row"><input id="app-cwd" placeholder="по умолчанию — папка файла"><button type="button" class="mini-btn pick-btn" id="pick-cwd" title="Выбрать папку">📂</button></div></label>
            <label class="toggle-field"><input type="checkbox" id="app-hide"> Скрыть окно консоли</label>
            <button type="button" class="mini-btn" id="add-launch">Добавить файл</button>
          </div>
          <div class="launch-add launch-delay">
            <label>Пауза перед следующим действием, сек<input id="delay-sec" type="number" min="1" max="60" value="3"></label>
            <button type="button" class="mini-btn" id="add-delay">Добавить паузу</button>
          </div>
        </div>
        <div class="editor-footer"><span class="muted">Указывайте полный путь к существующему файлу. Если файлу нужен администратор, запустите PC Mode Manager от его имени</span>
          <span class="header-actions">${profile ? `<button type="button" class="mini-btn" id="export-this">⇩ Экспорт</button>` : ""}<button class="primary-btn" type="submit">Сохранить профиль</button></span></div>
      </form>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const list = $("#launch-list");
  const redraw = () => {
    list.innerHTML = actions.length
      ? actions.map((a, i) => `<div class="launch-row"><span class="launch-row-icon">▶</span><span class="launch-row-text">${esc(actionLabel(a))}</span><button type="button" class="mini-btn danger" data-remove="${i}">Убрать</button></div>`).join("")
      : `<p class="muted empty-actions">Пока нет программ для автозапуска.</p>`;
    list.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { actions.splice(Number(b.dataset.remove), 1); redraw(); }));
  };
  redraw();

  $("#back").addEventListener("click", () => drawList(root));
  root.querySelectorAll("[data-switch]").forEach(b => b.addEventListener("click", () => drawEditor(root, profiles.find(x => x.id === b.dataset.switch) || null)));
  $("#export-this")?.addEventListener("click", () => doExport(p.id));

  const pick = async (fn, target) => {
    try { const path = await fn(); if (path) $(target).value = path; }
    catch (e) { notify(e.message, "error"); }
  };
  $("#pick-file").addEventListener("click", () => pick(() => pickFile(), "#app-path"));
  $("#pick-cwd").addEventListener("click", () => pick(pickFolder, "#app-cwd"));

  $("#add-launch").addEventListener("click", () => {
    const path = $("#app-path").value.trim();
    if (!path) return notify("Укажите путь к файлу", "error");
    if (!SUPPORTED.test(path)) return notify("Поддерживаются файлы .exe, .bat, .cmd и .ps1", "error");
    const cwd = $("#app-cwd").value.trim();
    const parameters = { path, args: splitArgs($("#app-args").value.trim()) };
    if (cwd) parameters.working_dir = cwd;
    if ($("#app-hide").checked) parameters.hide_window = true;
    actions.push({ id: `launch-${Date.now()}-${actions.length}`, type: "launch_application", enabled: true, parameters, timeout_ms: 15000, on_error: "continue" });
    ["#app-path", "#app-args", "#app-cwd"].forEach(s => { $(s).value = ""; });
    $("#app-hide").checked = false;
    redraw();
  });
  $("#add-delay").addEventListener("click", () => {
    const sec = Number($("#delay-sec").value);
    if (!(sec >= 1 && sec <= 60)) return notify("Пауза должна быть от 1 до 60 секунд", "error");
    actions.push({ id: `delay-${Date.now()}-${actions.length}`, type: "delay", enabled: true, parameters: { ms: Math.round(sec * 1000) }, timeout_ms: 65000, on_error: "continue" });
    redraw();
  });

  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const f = new FormData(event.currentTarget);
    const payload = {
      schema_version: 1, id: String(f.get("id")).trim(), name: String(f.get("name")).trim(),
      description: String(f.get("description") || "").trim(), enabled: f.get("enabled") === "on",
      color: String(f.get("color")), icon: String(f.get("icon") || "✦"), actions,
    };
    try {
      busy = true;
      if (profile) await updateProfile(payload); else await createProfile(payload);
      notify("Профиль сохранён", "success");
      await load(root);
    } catch (error) { notify(error.message, "error", 7000); }
    finally { busy = false; }
  });
}

/* ---------- операции ---------- */
async function doExport(id) {
  try {
    const path = await pickSaveJson(`${id}.json`);
    if (!path) return;
    await exportProfile(id, path);
    notify("Профиль экспортирован", "success");
  } catch (e) { notify(e.message, "error", 7000); }
}
async function doImport(root) {
  try {
    const path = await pickJson();
    if (!path) return;
    const p = await importProfile(path);
    notify(`Импортирован профиль «${p.name}»`, "success");
    await load(root);
  } catch (e) { notify(e.message, "error", 7000); }
}
async function doRestore(root) {
  try {
    const n = await restoreDefaultProfiles();
    notify(`Восстановлено стандартных профилей: ${n}`, "success");
    await load(root);
  } catch (e) { notify(e.message, "error", 7000); }
}
async function removeProfile(root, id) {
  if (!confirm(`Удалить профиль «${profiles.find(p => p.id === id)?.name || id}»?`)) return;
  try { await deleteProfile(id); notify("Профиль удалён", "success"); await load(root); }
  catch (error) { notify(error.message, "error"); }
}
async function load(root) { profiles = await getProfiles(); drawList(root); }

export async function renderProfiles(root) {
  root.innerHTML = `<div class="monitor-loading">Загрузка профилей…</div>`;
  try { await load(root); }
  catch (error) {
    root.innerHTML = `<h1>Profiles Manager</h1><p class="muted">Не удалось загрузить профили.</p>`;
    notify(error.message, "error", 7000);
  }
}
