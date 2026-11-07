mod commands;
mod core;
mod models;
mod utils;

use crate::core::state_manager::StateManager;

pub fn run() {
    tracing_subscriber::fmt().with_target(false).init();
    tracing::info!("PC Mode Manager запущен");
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .manage(StateManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::mode_commands::get_modes,
            commands::mode_commands::get_profiles,
            commands::mode_commands::create_profile,
            commands::mode_commands::update_profile,
            commands::mode_commands::delete_profile,
            commands::mode_commands::get_active_mode,
            commands::mode_commands::set_mode,
            commands::mode_commands::deactivate_mode,
            commands::process_commands::get_processes,
            commands::process_commands::launch_application,
            commands::process_commands::close_application,
            commands::process_commands::force_terminate_process,
            commands::mode_commands::export_profile,
            commands::mode_commands::import_profile,
            commands::mode_commands::restore_default_profiles,
            commands::monitor_commands::get_system_snapshot,
            commands::monitor_commands::get_gpu_names,
            commands::monitor_commands::get_live_sensors,
        ])
        .run(tauri::generate_context!())
        .expect("не удалось запустить Tauri-приложение");
}
