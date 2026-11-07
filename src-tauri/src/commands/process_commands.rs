use crate::{
    core::{launcher::{self, LaunchSpec}, process_manager},
    models::process::{LaunchResult, ProcessInfo},
    utils::errors::AppError,
};

#[tauri::command]
pub fn get_processes() -> Result<Vec<ProcessInfo>, AppError> {
    Ok(process_manager::list_processes())
}

#[tauri::command]
pub fn launch_application(path: String, args: Vec<String>, working_dir: Option<String>) -> Result<LaunchResult, AppError> {
    launcher::launch(LaunchSpec { path, args, working_dir, hide_window: false })
}

/// Sends WM_CLOSE to windows owned by the selected PID. Does not force-kill it.
#[tauri::command]
pub fn close_application(pid: u32) -> Result<(), AppError> {
    process_manager::close_application(pid)
}

/// Force termination is intentionally a separate command and must be confirmed in the UI.
#[tauri::command]
pub fn force_terminate_process(pid: u32) -> Result<(), AppError> {
    process_manager::force_terminate_process(pid)
}
