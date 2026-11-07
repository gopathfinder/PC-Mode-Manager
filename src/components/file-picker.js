// Системный диалог «Проводник» (tauri-plugin-dialog). Возвращает путь или null, если выбор отменён.
const dialog = () => {
  const api = window.__TAURI__?.dialog;
  if (!api) throw new Error("Диалог выбора файлов недоступен");
  return api;
};
export const FILE_FILTERS = [
  { name: "Программы и скрипты", extensions: ["exe", "bat", "cmd", "ps1"] },
  { name: "Все файлы", extensions: ["*"] },
];
const asPath = (r) => (typeof r === "string" ? r : null);
export async function pickFile(filters = FILE_FILTERS) {
  return asPath(await dialog().open({ multiple: false, directory: false, filters }));
}
export async function pickFolder() {
  return asPath(await dialog().open({ multiple: false, directory: true }));
}
export async function pickJson() {
  return pickFile([{ name: "Профиль PC Mode Manager", extensions: ["json"] }]);
}
export async function pickSaveJson(defaultPath) {
  return asPath(await dialog().save({ defaultPath, filters: [{ name: "Профиль PC Mode Manager", extensions: ["json"] }] }));
}
