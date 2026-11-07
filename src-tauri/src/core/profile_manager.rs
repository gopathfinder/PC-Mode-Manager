use crate::models::profile::{default_profiles, Profile};
use crate::utils::errors::AppError;
use std::{fs, path::{Path, PathBuf}};

pub struct ProfileManager { dir: PathBuf }
impl ProfileManager {
    pub fn new(dir: PathBuf) -> Result<Self, AppError> {
        fs::create_dir_all(&dir).map_err(|e| AppError::Storage(e.to_string()))?;
        let manager = Self { dir };
        manager.seed_defaults()?;
        Ok(manager)
    }
    /// Стандартные профили создаются один раз (маркер .defaults-seeded), чтобы удалённые не возвращались сами.
    fn seed_defaults(&self) -> Result<(), AppError> {
        let marker = self.dir.join(".defaults-seeded");
        if marker.exists() { return Ok(()); }
        self.restore_defaults()?;
        fs::write(&marker, "1").map_err(|e| AppError::Storage(e.to_string()))
    }
    /// Возвращает отсутствующие стандартные профили; существующие (с вашими правками) не трогает.
    pub fn restore_defaults(&self) -> Result<usize, AppError> {
        let mut restored = 0;
        for profile in default_profiles() {
            if !self.path_for(&profile.id)?.exists() { self.write(&profile)?; restored += 1; }
        }
        Ok(restored)
    }
    fn path_for(&self, id: &str) -> Result<PathBuf, AppError> {
        if id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') { return Err(AppError::Validation("Некорректный ID профиля".into())); }
        Ok(self.dir.join(format!("{id}.json")))
    }
    fn write(&self, profile: &Profile) -> Result<(), AppError> {
        profile.validate().map_err(AppError::Validation)?;
        let path = self.path_for(&profile.id)?;
        let tmp = path.with_extension("json.tmp");
        let data = serde_json::to_vec_pretty(profile).map_err(|e| AppError::Storage(e.to_string()))?;
        fs::write(&tmp, data).map_err(|e| AppError::Storage(e.to_string()))?;
        // Windows std::fs::rename does not replace an existing destination.
        // Keep the previous file as a short-lived backup and roll back on failure.
        let backup = path.with_extension("json.bak");
        if backup.exists() { fs::remove_file(&backup).map_err(|e| AppError::Storage(e.to_string()))?; }
        let had_previous = path.exists();
        if had_previous { fs::rename(&path, &backup).map_err(|e| AppError::Storage(e.to_string()))?; }
        if let Err(error) = fs::rename(&tmp, &path) {
            if had_previous { let _ = fs::rename(&backup, &path); }
            return Err(AppError::Storage(error.to_string()));
        }
        if had_previous { let _ = fs::remove_file(backup); }
        Ok(())
    }
    pub fn list(&self) -> Result<Vec<Profile>, AppError> {
        let mut result = Vec::new();
        for entry in fs::read_dir(&self.dir).map_err(|e| AppError::Storage(e.to_string()))? {
            let path = entry.map_err(|e| AppError::Storage(e.to_string()))?.path();
            if path.extension().and_then(|x| x.to_str()) != Some("json") { continue; }
            let bytes = fs::read(&path).map_err(|e| AppError::Storage(e.to_string()))?;
            let profile: Profile = serde_json::from_slice(&bytes).map_err(|e| AppError::Storage(format!("{}: {e}", path.display())))?;
            profile.validate().map_err(AppError::Validation)?;
            result.push(profile);
        }
        result.sort_by(|a,b| a.id.cmp(&b.id));
        Ok(result)
    }
    pub fn get(&self, id: &str) -> Result<Profile, AppError> {
        let path = self.path_for(id)?;
        let bytes = fs::read(&path).map_err(|e| if e.kind()==std::io::ErrorKind::NotFound { AppError::ModeNotFound(id.into()) } else { AppError::Storage(e.to_string()) })?;
        let p: Profile = serde_json::from_slice(&bytes).map_err(|e| AppError::Storage(e.to_string()))?;
        p.validate().map_err(AppError::Validation)?;
        Ok(p)
    }
    pub fn save(&self, profile: Profile) -> Result<(), AppError> { self.write(&profile) }
    pub fn delete(&self, id: &str) -> Result<(), AppError> {
        fs::remove_file(self.path_for(id)?).map_err(|e| AppError::Storage(e.to_string()))?; Ok(())
    }
    pub fn import_file(&self, source: &Path) -> Result<Profile, AppError> {
        let bytes = fs::read(source).map_err(|e| AppError::Storage(e.to_string()))?;
        let mut p: Profile = serde_json::from_slice(&bytes).map_err(|e| AppError::Validation(format!("Некорректный JSON: {e}")))?;
        // Импорт не перезаписывает существующий профиль: при совпадении id добавляется суффикс.
        let base = p.id.clone();
        let mut n = 1;
        while self.path_for(&p.id)?.exists() {
            n += 1;
            p.id = format!("{}-{n}", base.chars().take(58).collect::<String>());
            if n > 99 { return Err(AppError::Validation("Не удалось подобрать свободный ID профиля".into())); }
        }
        self.save(p.clone())?; Ok(p)
    }
    pub fn export_file(&self, id: &str, destination: &Path) -> Result<(), AppError> {
        let p = self.get(id)?;
        let bytes = serde_json::to_vec_pretty(&p).map_err(|e| AppError::Storage(e.to_string()))?;
        fs::write(destination, bytes).map_err(|e| AppError::Storage(e.to_string()))?; Ok(())
    }
}
