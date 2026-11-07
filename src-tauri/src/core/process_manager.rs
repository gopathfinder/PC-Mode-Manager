use crate::{
    models::process::{LaunchResult, ProcessInfo},
    utils::errors::AppError,
};
use sysinfo::{PidExt, ProcessExt, System, SystemExt};

const PROTECTED_NAMES: &[&str] = &[
    "system", "registry", "smss.exe", "csrss.exe", "wininit.exe",
    "services.exe", "lsass.exe", "svchost.exe", "winlogon.exe",
    "fontdrvhost.exe", "dwm.exe", "memory compression",
];

fn is_protected(name: &str, pid: u32) -> bool {
    let normalized = name.to_ascii_lowercase();
    pid == std::process::id()
        || PROTECTED_NAMES.iter().any(|item| normalized == *item)
        || normalized.contains("pc-mode-manager")
        || normalized.contains("pc mode manager")
}

pub fn list_processes() -> Vec<ProcessInfo> {
    let mut system = System::new_all();
    system.refresh_all();
    let mut result: Vec<_> = system.processes().values().map(|process| {
        let pid = process.pid().as_u32();
        let name = process.name().to_string();
        let exe_path = {
            let path = process.exe();
            if path.as_os_str().is_empty() { None } else { Some(path.to_string_lossy().into_owned()) }
        };
        let status = format!("{:?}", process.status());
        ProcessInfo {
            pid,
            protected: is_protected(&name, pid),
            name,
            exe_path,
            memory_bytes: process.memory(),
            status,
        }
    }).collect();
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()).then(a.pid.cmp(&b.pid)));
    result
}

pub fn launch_application(path: String, args: Vec<String>) -> Result<LaunchResult, AppError> {
    crate::core::launcher::launch(crate::core::launcher::LaunchSpec { path, args, ..Default::default() })
}

pub fn close_application(pid: u32) -> Result<(), AppError> {
    if is_protected_name_or_pid(pid)? {
        return Err(AppError::Validation("Этот процесс защищён от завершения".into()));
    }
    #[cfg(windows)]
    {
        windows_close::request_close(pid)
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        Err(AppError::Validation("Корректное закрытие окон поддерживается только в Windows".into()))
    }
}

fn is_protected_name_or_pid(pid: u32) -> Result<bool, AppError> {
    if pid == std::process::id() { return Ok(true); }
    let mut system = System::new_all();
    system.refresh_all();
    let process = system.processes().values().find(|p| p.pid().as_u32() == pid)
        .ok_or_else(|| AppError::Validation(format!("Процесс с PID {pid} не найден")))?;
    Ok(is_protected(process.name(), pid))
}

pub fn force_terminate_process(pid: u32) -> Result<(), AppError> {
    if is_protected_name_or_pid(pid)? {
        return Err(AppError::Validation("Этот процесс защищён от завершения".into()));
    }
    let mut system = System::new_all();
    system.refresh_all();
    let process = system.processes().values().find(|p| p.pid().as_u32() == pid)
        .ok_or_else(|| AppError::Validation(format!("Процесс с PID {pid} не найден")))?;
    if !process.kill() {
        return Err(AppError::Storage("Windows не подтвердила завершение процесса".into()));
    }
    Ok(())
}


#[cfg(windows)]
mod windows_close {
    use crate::utils::errors::AppError;
    use windows::Win32::{
        Foundation::{BOOL, HWND, LPARAM, WPARAM},
        UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, PostMessageW, WM_CLOSE},
    };

    struct SearchContext { pid: u32, found: bool }

    unsafe extern "system" fn enum_window(hwnd: HWND, data: LPARAM) -> BOOL {
        let context = &mut *(data.0 as *mut SearchContext);
        let mut owner_pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut owner_pid));
        if owner_pid == context.pid {
            context.found = true;
            let _ = PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
        }
        BOOL(1)
    }

    pub fn request_close(pid: u32) -> Result<(), AppError> {
        let mut context = SearchContext { pid, found: false };
        unsafe {
            let _ = EnumWindows(Some(enum_window), LPARAM(&mut context as *mut _ as isize));
        }
        if context.found { Ok(()) } else {
            Err(AppError::Validation("Не найдено окно процесса. Возможно, у него нет главного окна".into()))
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protects_critical_windows_processes() {
        assert!(is_protected("csrss.exe", 123));
        assert!(is_protected("services.exe", 456));
        assert!(is_protected("PC Mode Manager.exe", 789));
    }

    #[test]
    fn does_not_mark_regular_apps_as_protected() {
        assert!(!is_protected("notepad.exe", 9876));
        assert!(!is_protected("steam.exe", 9877));
    }

    #[test]
    fn rejects_relative_executable_paths() {
        let result = launch_application("notepad.exe".into(), vec![]);
        assert!(result.is_err());
    }
}
