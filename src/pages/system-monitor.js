import { getSystemSnapshot, getGpuNames, getLiveSensors, formatBytes, formatUptime } from "../services/monitor-service.js";
import { notify } from "../components/notification.js";

let timer = null;
let sensorTimer = null;
let busy = false;
let sensorBusy = false;
let hoverFrac = null; // позиция курсора над графиком (0..1), чтобы подсказка переживала перерисовку
let gpuNames = [];
let sensors = null;
const history = { cpu: [], memory: [], gpu: [] };
const MAX_POINTS = 36;

const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const line = (values) => values.map((v, i) => v == null ? null : `${(i / (MAX_POINTS - 1)) * 600},${100 - clamp(v)}`).filter(Boolean).join(" ");
const pct = (v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

function metricCard(label, value, detail, percent, color) {
  return `<article class="metric-card">
    <div class="metric-top"><span>${label}</span><span class="metric-dot" style="background:${color}"></span></div>
    <strong>${value}</strong><small>${detail}</small>
    <div class="meter"><span style="width:${clamp(percent)}%;background:${color}"></span></div>
  </article>`;
}

function showTip(root, frac) {
  const wrap = root.querySelector(".chart-wrap");
  const tip = root.querySelector(".chart-tip");
  const cursor = root.querySelector(".chart-cursor");
  if (!wrap || !tip || !cursor) return;
  const idx = Math.round(frac * (MAX_POINTS - 1));
  if (idx >= history.cpu.length) { tip.hidden = true; cursor.hidden = true; return; }
  tip.textContent = `CPU ${pct(history.cpu[idx])} · RAM ${pct(history.memory[idx])} · GPU ${pct(history.gpu[idx])}`;
  tip.hidden = false; cursor.hidden = false;
  const x = (idx / (MAX_POINTS - 1)) * wrap.clientWidth;
  cursor.style.left = `${x}px`;
  tip.style.left = `${Math.min(x + 10, Math.max(0, wrap.clientWidth - tip.offsetWidth))}px`;
}

function render(snapshot, root) {
  const cpu = clamp(snapshot.cpu_usage_percent);
  const mem = clamp(snapshot.memory_usage_percent);
  const gpu = sensors?.gpu_usage_percent ?? null;
  history.cpu.push(cpu); history.memory.push(mem); history.gpu.push(gpu);
  for (const k of Object.keys(history)) if (history[k].length > MAX_POINTS) history[k].shift();

  const disks = (snapshot.disks || []).map(d => {
    const used = Math.max(0, d.total_bytes - d.available_bytes);
    const p = d.total_bytes ? used / d.total_bytes * 100 : 0;
    return `<div class="disk-row">
      <div class="disk-heading"><b>${esc(d.name || d.mount_point || "Диск")}</b><span>${formatBytes(used)} / ${formatBytes(d.total_bytes)}</span></div>
      <div class="meter"><span style="width:${clamp(p)}%;background:var(--accent-purple)"></span></div>
      <small>${esc(d.mount_point)} · свободно ${formatBytes(d.available_bytes)}</small></div>`;
  }).join("") || `<p class="muted">Информация о дисках недоступна.</p>`;

  const temps = [
    ...(snapshot.temperatures || []).map(t => [t.label, t.celsius]),
    ...(sensors?.gpu_temperature_c != null ? [["GPU", sensors.gpu_temperature_c]] : []),
    ...(sensors?.acpi_temperatures_c || []).map((c, i) => [`ACPI Thermal Zone ${i + 1}`, c]),
  ].map(([label, c]) => `<div class="sensor-row"><span>${esc(label)}</span><b>${Number(c).toFixed(1)} °C</b></div>`).join("")
    || `<p class="muted">Датчики температуры не предоставлены Windows или оборудованием.</p>`;

  const gpuDetail = sensors?.gpu_memory_total_mb
    ? `${esc(gpuNames[0] || "GPU")} · ${sensors.gpu_memory_used_mb} / ${sensors.gpu_memory_total_mb} MB`
    : esc(gpuNames[0] || "Показатель недоступен");
  const hw = `<div class="hw-list">
    <div><b>Процессор</b>${esc(snapshot.cpu_name || "—")}</div>
    ${gpuNames.length ? gpuNames.map(n => `<div><b>Видеокарта</b>${esc(n)}</div>`).join("") : ""}
    <div><b>RAM</b>${formatBytes(snapshot.memory_total_bytes)}</div></div>`;

  root.innerHTML = `
    <header class="page-header">
      <div><h1>System Monitor</h1><p class="muted">Мониторинг производительности компьютера в реальном времени</p></div>
      <div class="monitor-live"><span class="live-dot"></span> LIVE · обновление 2 сек.</div>
    </header>
    <section class="metrics-grid">
      ${metricCard("Загрузка CPU", `${cpu.toFixed(1)}%`, `${esc(snapshot.cpu_name || "")} · ${snapshot.logical_cpu_count} логических потоков`, cpu, "var(--accent-blue)")}
      ${metricCard("Загрузка GPU", gpu == null ? "—" : `${gpu.toFixed(1)}%`, gpuDetail, gpu ?? 0, "#ff8998")}
      ${metricCard("Оперативная память", `${mem.toFixed(1)}%`, `${formatBytes(snapshot.memory_used_bytes)} из ${formatBytes(snapshot.memory_total_bytes)}`, mem, "var(--accent-purple)")}
      ${metricCard("Время работы ПК", formatUptime(snapshot.uptime_seconds), "С момента последней загрузки", 0, "var(--accent-green)")}
    </section>
    <section class="monitor-grid">
      <article class="monitor-panel">
        <div class="panel-heading"><h2>Производительность</h2><span class="muted">Последние 72 секунд</span></div>
        <div class="chart-legend"><span><i style="background:var(--accent-blue)"></i> CPU</span><span><i style="background:#ff8998"></i> GPU</span><span><i style="background:#aaa0a2"></i> RAM</span></div>
        <div class="chart-wrap">
          <svg class="monitor-chart" viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="График загрузки CPU, GPU и RAM">
            <path class="chart-grid" d="M0 25H600 M0 50H600 M0 75H600 M0 100H600"/>
            <polyline class="chart-line cpu-line" points="${line(history.cpu)}"/>
            <polyline class="chart-line gpu-line" points="${line(history.gpu)}"/>
            <polyline class="chart-line ram-line" points="${line(history.memory)}"/>
          </svg>
          <div class="chart-cursor" hidden></div><div class="chart-tip" hidden></div>
        </div>
        <div class="chart-scale"><span>0%</span><span>100%</span></div>
      </article>
      <article class="monitor-panel">
        <div class="panel-heading"><h2>Температурные датчики</h2></div>
        <div class="sensor-list">${temps}</div>
        <p class="monitor-note">Температуры отображаются только если датчики доступны через системные интерфейсы. Для CPU на многих ПК нужны драйверы производителя.</p>
      </article>
    </section>
    <section class="monitor-grid">
      <article class="monitor-panel"><div class="panel-heading"><h2>Железо</h2></div>${hw}</article>
      <article class="monitor-panel disk-panel">
        <div class="panel-heading"><h2>Накопители</h2><span class="muted">${(snapshot.disks || []).length} обнаружено</span></div>
        <div class="disk-list">${disks}</div>
      </article>
    </section>
    <footer class="monitor-footer"><span>Данные предоставлены Windows / sysinfo / nvidia-smi</span><button class="mini-btn" id="monitor-refresh">Обновить сейчас</button></footer>`;

  root.querySelector("#monitor-refresh")?.addEventListener("click", () => refresh(root, true));
  const wrap = root.querySelector(".chart-wrap");
  wrap.addEventListener("mousemove", (e) => {
    const r = wrap.getBoundingClientRect();
    hoverFrac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    showTip(root, hoverFrac);
  });
  wrap.addEventListener("mouseleave", () => { hoverFrac = null; showTip(root, -1); });
  if (hoverFrac != null) showTip(root, hoverFrac);
}

async function refresh(root, showError = false) {
  if (busy || !root.isConnected) return;
  busy = true;
  try { render(await getSystemSnapshot(), root); }
  catch (error) { if (showError) notify(`Не удалось получить показатели: ${error.message}`, "error"); }
  finally { busy = false; }
}
// GPU и дополнительные датчики опрашиваются реже: это отдельные системные запросы.
async function refreshSensors() {
  if (sensorBusy) return;
  sensorBusy = true;
  try { sensors = await getLiveSensors(); } catch { sensors = null; }
  finally { sensorBusy = false; }
}

export async function renderSystemMonitor(root) {
  stopSystemMonitor();
  history.cpu.length = history.memory.length = history.gpu.length = 0;
  hoverFrac = null;
  root.innerHTML = `<div class="monitor-loading">Получение системных показателей…</div>`;
  getGpuNames().then(n => { gpuNames = n; }).catch(() => {});
  refreshSensors();
  await refresh(root, true);
  timer = setInterval(() => refresh(root), 2000);
  sensorTimer = setInterval(refreshSensors, 5000);
}
export function stopSystemMonitor() {
  if (timer) clearInterval(timer);
  if (sensorTimer) clearInterval(sensorTimer);
  timer = sensorTimer = null;
}
