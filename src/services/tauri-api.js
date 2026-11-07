// Единая точка вызова Rust-команд. Используется глобальный объект Tauri 2 (app.withGlobalTauri = true).
export async function call(command, args = {}) {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) {
    throw new Error("Tauri API недоступен. Запустите приложение командой: npm run tauri dev");
  }
  try {
    return await invoke(command, args);
  } catch (e) {
    throw new Error(typeof e === "string" ? e : e?.message ?? String(e));
  }
}
