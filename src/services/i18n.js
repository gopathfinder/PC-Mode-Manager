// Язык интерфейса. Исходные тексты написаны по-русски; при выборе English текстовые узлы,
// placeholder и title переводятся по словарю. Незнакомые строки остаются русскими.
const EN = {
  "Выберите режим работы": "Choose a mode", "Загрузка…": "Loading…", "Режим не выбран": "No mode selected", "Нет связи с backend": "No connection to backend",
  "Профили": "Profiles", "Создайте режимы и настраивайте автоматический запуск программ": "Create modes and configure program automation",
  "Создавайте режимы и настраивайте автоматический запуск программ": "Create modes and configure program automation",
  "＋ Создать профиль": "＋ New profile", "⇪ Импорт": "⇪ Import", "↺ Стандартные": "↺ Defaults", "⇩ Экспорт": "⇩ Export",
  "Настроить": "Edit", "Удалить": "Delete", "Включён": "Enabled", "Отключён": "Disabled", "Описание не задано": "No description",
  "Профилей пока нет.": "No profiles yet.", "Загрузка профилей…": "Loading profiles…",
  "Настройка профиля": "Edit profile", "Новый профиль": "New profile", "Назад": "Back",
  "Укажите параметры и программы для автоматического запуска": "Set options and programs to launch automatically",
  "ID профиля": "Profile ID", "Название": "Name", "Описание": "Description", "Цвет профиля": "Profile color", "Иконка": "Icon",
  "Профиль доступен на Mode": "Profile is shown on Mode page", "Профиль доступен на Dashboard": "Profile is shown on Mode page",
  "Игры": "Games", "Разработка": "Development", "Работа": "Work", "Другое": "Other",
  "Автоматизация запуска": "Launch automation", "Действия выполняются по порядку при включении этого режима": "Actions run in order when this mode is activated",
  "Пока нет программ для автозапуска.": "No actions yet.", "Убрать": "Remove",
  "Путь к файлу (.exe, .bat, .cmd, .ps1)": "File path (.exe, .bat, .cmd, .ps1)", "Аргументы (необязательно)": "Arguments (optional)",
  "Рабочая папка (необязательно)": "Working folder (optional)", "по умолчанию — папка файла": "default: the file's folder",
  "Скрыть окно консоли": "Hide console window", "Добавить файл": "Add file", "Пауза перед следующим действием, сек": "Pause before next action, sec", "Добавить паузу": "Add pause",
  "Выбрать файл": "Choose file", "Выбрать папку": "Choose folder", "Сохранить профиль": "Save profile", "Профиль сохранён": "Profile saved", "Профиль удалён": "Profile deleted",
  "Укажите путь к файлу": "Enter a file path", "Поддерживаются файлы .exe, .bat, .cmd и .ps1": "Only .exe, .bat, .cmd and .ps1 files are supported",
  "Пауза должна быть от 1 до 60 секунд": "Pause must be 1–60 seconds", "Профиль экспортирован": "Profile exported",
  "Указывайте полный путь к существующему файлу. Если файлу нужен администратор, запустите PC Mode Manager от его имени": "Use the full path of an existing file. If it needs administrator rights, run PC Mode Manager as administrator",
  "Запускаются только файлы, которые вы добавили сами (.exe, .bat, .cmd, .ps1). Права администратора скрыто не повышаются.": "Only files you added yourself are launched (.exe, .bat, .cmd, .ps1). Administrator rights are never raised silently.",
  "Просмотр и безопасное управление процессами Windows": "View and safely manage Windows processes", "↻ Обновить": "↻ Refresh",
  "Запуск приложения": "Launch application", "Укажите абсолютный путь к файлу. Аргументы — по одному на строку.": "Enter the absolute path. One argument per line.",
  "Аргумент 1\nАргумент 2": "Argument 1\nArgument 2", "Запустить": "Launch", "Поиск по имени или PID…": "Search by name or PID…",
  "Процесс": "Process", "Память": "Memory", "Статус": "Status", "Действия": "Actions", "Закрыть": "Close", "Завершить": "End",
  "Процессы не найдены": "No processes found", "Защищённый процесс": "Protected process", "Принудительное завершение": "Force end",
  "Защищённые процессы нельзя завершить. «Закрыть» отправляет стандартный запрос Windows WM_CLOSE. Принудительное завершение доступно отдельно и требует подтверждения.": "Protected processes cannot be ended. “Close” sends the standard Windows WM_CLOSE request. Force end is separate and can require confirmation.",
  "Мониторинг производительности компьютера в реальном времени": "Real-time PC performance monitoring", "Получение системных показателей…": "Reading system metrics…",
  "Загрузка CPU": "CPU usage", "Загрузка GPU": "GPU usage", "Оперативная память": "Memory", "Время работы ПК": "PC uptime", "С момента последней загрузки": "Since last boot",
  "Производительность": "Performance", "Температурные датчики": "Temperature sensors", "Накопители": "Drives", "Железо": "Hardware", "Видеокарта": "Graphics", "Процессор": "Processor",
  "Информация о дисках недоступна.": "Drive information unavailable.", "Обновить сейчас": "Refresh now", "Данные предоставлены Windows / sysinfo / nvidia-smi": "Data from Windows / sysinfo / nvidia-smi",
  "Показатель недоступен": "Not available", "Измеряется": "Measuring…",
  "Датчики температуры не предоставлены Windows или оборудованием.": "No temperature sensors are exposed by Windows or the hardware.",
  "Температуры отображаются только если датчики доступны через системные интерфейсы. Для CPU на многих ПК нужны драйверы производителя.": "Temperatures are shown only when sensors are exposed. On many PCs CPU temperature needs vendor drivers.",
  "System Settings": "System Settings", "Конфигурация интерфейса и поведения приложения": "Interface and application behavior",
  "Внешний вид": "Appearance", "Тема": "Theme", "Тёмная": "Dark", "Светлая": "Light", "Компактные отступы": "Compact spacing", "Анимации интерфейса": "Interface animations",
  "Язык": "Language", "Запуск": "Startup", "Запускать PC Mode Manager при включении Windows": "Start PC Mode Manager when Windows starts",
  "Автозапуск включён": "Autostart enabled", "Автозапуск выключен": "Autostart disabled", "Безопасность процессов": "Process safety",
  "Всегда спрашивать подтверждение перед принудительным завершением процесса": "Always ask for confirmation before force-ending a process",
  "Защита системных процессов остаётся включённой в любом случае.": "System process protection stays on regardless.",
  "Настройки сохраняются локально на этом компьютере.": "Settings are stored locally on this computer.",
  "Профили и режимы хранятся отдельно от настроек оформления.": "Profiles and modes are stored separately from appearance settings.",
};
const RULES = [
  [/^(\d+) из (\d+) процессов$/, "$1 of $2 processes"], [/^Активен: (.+)$/, "Active: $1"], [/^(.+) включён$/, "$1 enabled"], [/^(.+) выключен$/, "$1 disabled"],
  [/^(\d+) логических потоков$/, "$1 logical threads"], [/^(\d+) обнаружено$/, "$1 detected"], [/^(\d+) действий$/, "$1 actions"], [/^(\d+) запусков$/, "$1 launches"],
  [/^Запрос закрытия отправлен: (.+)$/, "Close request sent: $1"], [/^Процесс (.+) завершён$/, "Process $1 ended"], [/^Приложение запущено \(PID (\d+)\)$/, "Application started (PID $1)"],
  [/^Запустить (\S+): (.*)$/, "Launch $1: $2"], [/^Пауза (.+) с$/, "Pause $1 s"], [/^Последние (\d+) секунд$/, "Last $1 seconds"],
  [/^(.+) · свободно (.+)$/, "$1 · $2 free"], [/^(.+) из (.+)$/, "$1 of $2"], [/^Профиль «(.+)» экспортирован$/, "Profile “$1” exported"],
  [/^Импортирован профиль «(.+)»$/, "Imported profile “$1”"], [/^Восстановлено стандартных профилей: (\d+)$/, "Default profiles restored: $1"],
  [/^Удалить профиль «(.+)»\?$/, "Delete profile “$1”?"],
];
let lang = "ru";
let observer = null;

function tr(text) {
  if (lang === "ru" || !text) return text;
  const t = text.trim();
  if (!t) return text;
  if (EN[t]) return text.replace(t, EN[t]);
  for (const [re, rep] of RULES) if (re.test(t)) return text.replace(t, t.replace(re, rep));
  return text;
}
function walk(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = tr(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v; return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || ["SCRIPT", "STYLE", "TEXTAREA"].includes(node.tagName)) return;
  for (const attr of ["placeholder", "title", "aria-label"]) {
    const v = node.getAttribute(attr); if (v) { const n = tr(v); if (n !== v) node.setAttribute(attr, n); }
  }
  node.childNodes.forEach(walk);
}
export const translate = (text) => tr(text);
export function getLanguage() { return lang; }
export function setLanguage(next) {
  lang = next === "en" ? "en" : "ru";
  if (!observer) {
    observer = new MutationObserver((mutations) => {
      observer.disconnect();
      mutations.forEach((m) => { m.addedNodes.forEach(walk); if (m.type === "characterData") walk(m.target); });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }
  observer.disconnect();
  if (lang === "en") { walk(document.body); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
}
