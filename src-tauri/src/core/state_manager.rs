use crate::utils::errors::AppError;
use std::sync::Mutex;

/// Хранит id активного режима. Mutex исключает гонки при быстрых кликах.
pub struct StateManager {
    active: Mutex<Option<String>>,
}

impl StateManager {
    pub fn new() -> Self {
        Self { active: Mutex::new(None) }
    }

    pub fn active(&self) -> Result<Option<String>, AppError> {
        self.active.lock().map(|g| g.clone()).map_err(|_| AppError::StatePoisoned)
    }

    /// Возвращает false, если режим уже активен (повторный запуск не нужен).
    pub fn activate(&self, id: &str) -> Result<bool, AppError> {
        let mut g = self.active.lock().map_err(|_| AppError::StatePoisoned)?;
        if g.as_deref() == Some(id) {
            return Ok(false);
        }
        *g = Some(id.to_string());
        Ok(true)
    }

    pub fn deactivate(&self) -> Result<(), AppError> {
        *self.active.lock().map_err(|_| AppError::StatePoisoned)? = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn activate_is_idempotent() {
        let s = StateManager::new();
        assert!(s.activate("gaming").unwrap());
        assert!(!s.activate("gaming").unwrap());
        assert_eq!(s.active().unwrap().as_deref(), Some("gaming"));
    }

    #[test]
    fn deactivate_clears() {
        let s = StateManager::new();
        s.activate("work").unwrap();
        s.deactivate().unwrap();
        assert!(s.active().unwrap().is_none());
    }
}
