use serde::{Serialize, Serializer};
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Режим не найден: {0}")] ModeNotFound(String),
    #[error("Внутренняя ошибка состояния приложения")] StatePoisoned,
    #[error("Ошибка хранилища профилей: {0}")] Storage(String),
    #[error("Ошибка проверки профиля: {0}")] Validation(String),
    #[error("Ошибка запуска: {0}")] Launch(String),
}
impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> { s.serialize_str(&self.to_string()) }
}
