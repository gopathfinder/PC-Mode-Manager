use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorPolicy { Continue, Abort }
impl Default for ErrorPolicy { fn default() -> Self { Self::Continue } }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProfileAction {
    pub id: String,
    #[serde(rename = "type")]
    pub action_type: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub parameters: Value,
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,
    #[serde(default)]
    pub on_error: ErrorPolicy,
}
fn default_true() -> bool { true }
fn default_timeout() -> u64 { 15000 }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Profile {
    #[serde(default = "default_schema")]
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(default)]
    pub actions: Vec<ProfileAction>,
}
fn default_schema() -> u32 { CURRENT_SCHEMA_VERSION }
fn default_color() -> String { "#a855f7".into() }
fn default_icon() -> String { "gamepad".into() }

impl Profile {
    pub fn validate(&self) -> Result<(), String> {
        if self.schema_version != CURRENT_SCHEMA_VERSION { return Err(format!("Неподдерживаемая версия профиля: {}", self.schema_version)); }
        if self.id.trim().is_empty() || self.id.len() > 64 || !self.id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') { return Err("ID профиля должен содержать 1–64 символа: латиницу, цифры, '-' или '_'".into()); }
        if self.name.trim().is_empty() || self.name.len() > 80 { return Err("Название профиля обязательно (до 80 символов)".into()); }
        if self.icon.chars().count() > 16 { return Err("Иконка: слишком длинное значение".into()); }
        if !self.color.starts_with('#') || self.color.len() != 7 || !self.color[1..].chars().all(|c| c.is_ascii_hexdigit()) { return Err("Цвет должен быть в формате #RRGGBB".into()); }
        for a in &self.actions {
            if a.id.trim().is_empty() { return Err("У каждого действия должен быть ID".into()); }
            if !matches!(a.action_type.as_str(), "launch_application"|"close_application"|"set_power_plan"|"open_folder"|"open_website"|"set_notification_preference"|"delay"|"restore_previous_state") { return Err(format!("Неизвестный тип действия: {}", a.action_type)); }
            if a.timeout_ms == 0 || a.timeout_ms > 300_000 { return Err(format!("Некорректный таймаут действия {}", a.id)); }
            match a.action_type.as_str() {
                "launch_application" => {
                    if let Some(path) = a.parameters.get("path").and_then(Value::as_str).map(str::trim).filter(|p| !p.is_empty()) {
                        if crate::core::launcher::LaunchKind::from_path(std::path::Path::new(path)).is_none() {
                            return Err(format!("Действие {}: поддерживаются файлы .exe, .bat, .cmd и .ps1", a.id));
                        }
                    }
                }
                "delay" => {
                    let ms = a.parameters.get("ms").and_then(Value::as_u64).unwrap_or(0);
                    if ms == 0 || ms > 60_000 { return Err(format!("Действие {}: пауза должна быть от 1 мс до 60 с", a.id)); }
                }
                _ => {}
            }
        }
        Ok(())
    }
}

pub fn default_profiles() -> Vec<Profile> {
    vec![
        Profile { schema_version: 1, id:"gaming".into(), name:"Gaming Mode".into(), description:"Подготовка компьютера к играм: лаунчеры, Discord и игровые утилиты.".into(), enabled:true, color:"#ff386e".into(), icon:"gamepad".into(), actions:vec![] },
        Profile { schema_version: 1, id:"development".into(), name:"Development Mode".into(), description:"Среда программирования: редактор, проект, терминал и документация.".into(), enabled:true, color:"#00c8ff".into(), icon:"code".into(), actions:vec![] },
        Profile { schema_version: 1, id:"work".into(), name:"Work Mode".into(), description:"Рабочее пространство: браузер, почта, офис и мессенджеры.".into(), enabled:true, color:"#a855f7".into(), icon:"briefcase".into(), actions:vec![] },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_are_valid_and_unique() {
        let profiles = default_profiles();
        assert_eq!(profiles.len(), 3);
        for p in &profiles { p.validate().unwrap(); }
        assert_ne!(profiles[0].id, profiles[1].id);
    }
    #[test]
    fn profile_json_roundtrip() {
        let p = default_profiles().remove(0);
        let json = serde_json::to_string(&p).unwrap();
        let decoded: Profile = serde_json::from_str(&json).unwrap();
        assert_eq!(p, decoded);
    }
    #[test]
    fn validates_script_and_delay_actions() {
        let mk = |t: &str, params: Value| ProfileAction { id: "a".into(), action_type: t.into(), enabled: true, parameters: params, timeout_ms: 1000, on_error: ErrorPolicy::Continue };
        let mut p = default_profiles().remove(0);
        p.actions = vec![mk("launch_application", serde_json::json!({"path":"C:\\z\\general.bat"})), mk("delay", serde_json::json!({"ms": 3000}))];
        assert!(p.validate().is_ok());
        p.actions = vec![mk("launch_application", serde_json::json!({"path":"C:\\z\\notes.txt"}))];
        assert!(p.validate().is_err());
        p.actions = vec![mk("delay", serde_json::json!({"ms": 999999}))];
        assert!(p.validate().is_err());
    }
    #[test]
    fn rejects_unknown_action() {
        let mut p = default_profiles().remove(0);
        p.actions.push(ProfileAction { id:"bad".into(), action_type:"shell".into(), enabled:true, parameters:Value::Null, timeout_ms:1000, on_error:ErrorPolicy::Abort });
        assert!(p.validate().is_err());
    }
}
