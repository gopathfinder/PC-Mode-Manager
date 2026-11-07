use crate::{core::{launcher::{self, LaunchSpec}, profile_manager::ProfileManager, state_manager::StateManager}, models::{mode::{ActivationResult, Mode}, profile::{ErrorPolicy, Profile}}, utils::errors::AppError};
use tauri::{AppHandle, Manager, State};

fn profiles(app: &AppHandle) -> Result<ProfileManager, AppError> {
    let dir = app.path().app_config_dir().map_err(|e| AppError::Storage(e.to_string()))?.join("profiles");
    ProfileManager::new(dir)
}

#[tauri::command]
pub fn get_modes(app: AppHandle) -> Result<Vec<Mode>, AppError> {
    Ok(profiles(&app)?.list()?.iter().filter(|p| p.enabled).map(Mode::from).collect())
}
#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<Profile>, AppError> { profiles(&app)?.list() }
#[tauri::command]
pub fn create_profile(app: AppHandle, profile: Profile) -> Result<Profile, AppError> {
    let manager = profiles(&app)?;
    if manager.list()?.iter().any(|p| p.id == profile.id) { return Err(AppError::Validation("Профиль с таким ID уже существует".into())); }
    manager.save(profile.clone())?; Ok(profile)
}
#[tauri::command]
pub fn update_profile(app: AppHandle, profile: Profile) -> Result<Profile, AppError> {
    let manager = profiles(&app)?;
    manager.get(&profile.id)?;
    manager.save(profile.clone())?; Ok(profile)
}
#[tauri::command]
pub fn delete_profile(app: AppHandle, profile_id: String, state: State<'_, StateManager>) -> Result<(), AppError> {
    if state.active()?.as_deref() == Some(profile_id.as_str()) { return Err(AppError::Validation("Нельзя удалить активный профиль. Сначала деактивируйте его".into())); }
    profiles(&app)?.delete(&profile_id)
}
#[tauri::command]
pub fn get_active_mode(state: State<'_, StateManager>) -> Result<Option<String>, AppError> { state.active() }

/// Включает режим и выполняет включённые действия профиля по порядку:
/// запуск файлов (.exe/.bat/.cmd/.ps1) и паузы. Работает в отдельном потоке, чтобы паузы не морозили окно.
#[tauri::command(async)]
pub fn set_mode(mode_id: String, app: AppHandle, state: State<'_, StateManager>) -> Result<ActivationResult, AppError> {
    let profile = profiles(&app)?.get(&mode_id)?;
    if !profile.enabled { return Err(AppError::Validation("Этот профиль отключён".into())); }
    if state.active()?.as_deref() == Some(mode_id.as_str()) {
        return Ok(ActivationResult { active: Some(mode_id), warnings: vec![] });
    }

    let mut warnings = Vec::new();
    for action in profile.actions.iter().filter(|a| a.enabled) {
        let label = action.parameters.get("path").and_then(|v| v.as_str())
            .and_then(|p| std::path::Path::new(p).file_name())
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| action.id.clone());
        let outcome = match action.action_type.as_str() {
            "launch_application" => LaunchSpec::from_parameters(&action.parameters).and_then(launcher::launch).map(|_| ()),
            "delay" => {
                let ms = action.parameters.get("ms").and_then(|v| v.as_u64()).unwrap_or(0).min(60_000);
                std::thread::sleep(std::time::Duration::from_millis(ms));
                Ok(())
            }
            _ => Ok(()), // остальные типы действий пока не исполняются
        };
        if let Err(error) = outcome {
            tracing::warn!("Не удалось выполнить действие {}: {}", action.id, error);
            if action.on_error == ErrorPolicy::Abort { return Err(error); }
            warnings.push(format!("{label}: {error}"));
        }
    }

    if state.activate(&mode_id)? { tracing::info!("Режим активирован: {mode_id}"); }
    Ok(ActivationResult { active: state.active()?, warnings })
}
#[tauri::command]
pub fn deactivate_mode(state: State<'_, StateManager>) -> Result<(), AppError> {
    state.deactivate()?; tracing::info!("Режим деактивирован"); Ok(())
}

fn require_json(path: &str) -> Result<std::path::PathBuf, AppError> {
    let p = std::path::PathBuf::from(path);
    if p.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("json")) != Some(true) {
        return Err(AppError::Validation("Файл профиля должен иметь расширение .json".into()));
    }
    Ok(p)
}
#[tauri::command]
pub fn export_profile(app: AppHandle, profile_id: String, path: String) -> Result<(), AppError> {
    profiles(&app)?.export_file(&profile_id, &require_json(&path)?)
}
#[tauri::command]
pub fn import_profile(app: AppHandle, path: String) -> Result<Profile, AppError> {
    profiles(&app)?.import_file(&require_json(&path)?)
}
#[tauri::command]
pub fn restore_default_profiles(app: AppHandle) -> Result<usize, AppError> {
    profiles(&app)?.restore_defaults()
}
