//! Безопасный запуск файлов: .exe, .bat, .cmd, .ps1.
//! Никакого произвольного shell: файл и аргументы передаются раздельно, права не повышаются.
use crate::{models::process::LaunchResult, utils::errors::AppError};
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    process::Command,
};

const MAX_ARG_LEN: usize = 4096;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LaunchKind { Executable, Batch, PowerShell }

impl LaunchKind {
    pub fn from_path(path: &Path) -> Option<Self> {
        match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
            "exe" => Some(Self::Executable),
            "bat" | "cmd" => Some(Self::Batch),
            "ps1" => Some(Self::PowerShell),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct LaunchSpec {
    pub path: String,
    pub args: Vec<String>,
    pub working_dir: Option<String>,
    pub hide_window: bool,
}

impl LaunchSpec {
    /// Читает параметры действия профиля: path, args[], working_dir, hide_window.
    pub fn from_parameters(p: &Value) -> Result<Self, AppError> {
        let text = |key: &str| p.get(key).and_then(Value::as_str).map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned);
        let path = text("path").ok_or_else(|| AppError::Validation("В действии не указан путь к файлу".into()))?;
        let args = p.get("args").and_then(Value::as_array)
            .map(|items| items.iter().filter_map(|v| v.as_str().map(str::to_owned)).collect())
            .unwrap_or_default();
        Ok(Self {
            path,
            args,
            working_dir: text("working_dir"),
            hide_window: p.get("hide_window").and_then(Value::as_bool).unwrap_or(false),
        })
    }
}

#[derive(Debug)]
pub struct LaunchPlan {
    pub kind: LaunchKind,
    pub program: PathBuf,
    pub args: Vec<String>,
    pub working_dir: PathBuf,
}

/// Проверяет запрос и строит команду, ничего не запуская (удобно для тестов).
pub fn plan_launch(spec: &LaunchSpec) -> Result<LaunchPlan, AppError> {
    let script = Path::new(&spec.path);
    if !script.is_absolute() {
        return Err(AppError::Validation("Укажите абсолютный путь к файлу".into()));
    }
    if !script.is_file() {
        return Err(AppError::Validation(format!("Файл не найден: {}", spec.path)));
    }
    let kind = LaunchKind::from_path(script)
        .ok_or_else(|| AppError::Validation("Поддерживаются только .exe, .bat, .cmd и .ps1".into()))?;
    if spec.args.iter().any(|a| a.len() > MAX_ARG_LEN || a.contains('\0')) {
        return Err(AppError::Validation("Недопустимые аргументы запуска".into()));
    }
    let working_dir = match spec.working_dir.as_deref() {
        Some(dir) => {
            let dir = Path::new(dir);
            if !dir.is_absolute() || !dir.is_dir() {
                return Err(AppError::Validation("Рабочая папка должна быть существующим абсолютным путём".into()));
            }
            dir.to_path_buf()
        }
        None => script.parent().map(Path::to_path_buf)
            .ok_or_else(|| AppError::Validation("Не удалось определить папку файла".into()))?,
    };
    let (program, args) = match kind {
        // Rust сам запускает .bat/.cmd через cmd.exe с безопасным экранированием аргументов.
        LaunchKind::Executable | LaunchKind::Batch => (script.to_path_buf(), spec.args.clone()),
        LaunchKind::PowerShell => {
            // Bypass действует только на этот процесс и только для выбранного вами скрипта.
            let mut a: Vec<String> = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"].map(String::from).to_vec();
            a.push(spec.path.clone());
            a.extend(spec.args.iter().cloned());
            (PathBuf::from("powershell.exe"), a)
        }
    };
    Ok(LaunchPlan { kind, program, args, working_dir })
}

fn map_spawn_error(e: std::io::Error) -> AppError {
    // 740 = ERROR_ELEVATION_REQUIRED: приложение требует администратора, скрыто мы его не повышаем.
    if e.raw_os_error() == Some(740) {
        return AppError::Launch("файлу нужны права администратора. Перезапустите PC Mode Manager от имени администратора".into());
    }
    AppError::Launch(e.to_string())
}

pub fn launch(spec: LaunchSpec) -> Result<LaunchResult, AppError> {
    let plan = plan_launch(&spec)?;
    let mut command = Command::new(&plan.program);
    command.args(&plan.args).current_dir(&plan.working_dir);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        if spec.hide_window {
            command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        }
    }
    let child = command.spawn().map_err(map_spawn_error)?;
    tracing::info!("Запущен {:?}: {}", plan.kind, spec.path);
    Ok(LaunchResult { pid: child.id(), executable: spec.path })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_file(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pcmm-launcher-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        fs::write(&path, "").unwrap();
        path
    }
    fn spec(path: &Path) -> LaunchSpec {
        LaunchSpec { path: path.to_string_lossy().into_owned(), ..Default::default() }
    }

    #[test]
    fn exe_is_launched_directly_in_its_folder() {
        let file = temp_file("tool.exe");
        let plan = plan_launch(&spec(&file)).unwrap();
        assert_eq!(plan.kind, LaunchKind::Executable);
        assert_eq!(plan.program, file);
        assert_eq!(plan.working_dir, file.parent().unwrap());
    }

    #[test]
    fn bat_and_cmd_are_batch() {
        for name in ["general.bat", "service.CMD"] {
            let plan = plan_launch(&spec(&temp_file(name))).unwrap();
            assert_eq!(plan.kind, LaunchKind::Batch);
        }
    }

    #[test]
    fn powershell_script_uses_file_flag_and_keeps_args_separate() {
        let file = temp_file("run.ps1");
        let mut s = spec(&file);
        s.args = vec!["-Name".into(), "a b".into()];
        let plan = plan_launch(&s).unwrap();
        assert_eq!(plan.program, PathBuf::from("powershell.exe"));
        assert_eq!(plan.args[3], "-File");
        assert_eq!(plan.args[5..], ["-Name".to_string(), "a b".to_string()]);
    }

    #[test]
    fn custom_working_dir_is_used() {
        let file = temp_file("wd.bat");
        let mut s = spec(&file);
        s.working_dir = Some(std::env::temp_dir().to_string_lossy().into_owned());
        assert_eq!(plan_launch(&s).unwrap().working_dir, std::env::temp_dir());
    }

    #[test]
    fn rejects_unsupported_relative_missing_and_bad_inputs() {
        assert!(plan_launch(&spec(&temp_file("notes.txt"))).is_err());
        assert!(plan_launch(&LaunchSpec { path: "general.bat".into(), ..Default::default() }).is_err());
        let missing = std::env::temp_dir().join("pcmm-does-not-exist.bat");
        assert!(plan_launch(&spec(&missing)).is_err());
        let mut s = spec(&temp_file("badwd.exe"));
        s.working_dir = Some("relative/dir".into());
        assert!(plan_launch(&s).is_err());
        let mut s = spec(&temp_file("badarg.exe"));
        s.args = vec!["x\0y".into()];
        assert!(plan_launch(&s).is_err());
    }

    #[test]
    fn parses_action_parameters() {
        let v: Value = serde_json::json!({"path":" C:\\z\\general.bat ","args":["-a"],"working_dir":"C:\\z","hide_window":true});
        let s = LaunchSpec::from_parameters(&v).unwrap();
        assert_eq!(s.path, "C:\\z\\general.bat");
        assert_eq!(s.args, vec!["-a"]);
        assert!(s.hide_window);
        assert!(LaunchSpec::from_parameters(&serde_json::json!({"path":""})).is_err());
    }
}
