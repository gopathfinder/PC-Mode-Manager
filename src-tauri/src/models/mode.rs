use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Mode {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub icon: String,
}

impl From<&super::profile::Profile> for Mode {
    fn from(p: &super::profile::Profile) -> Self {
        Self { id: p.id.clone(), name: p.name.clone(), description: p.description.clone(), color: p.color.clone(), icon: p.icon.clone() }
    }
}

/// Результат включения режима: активный id и предупреждения по действиям, которые не удались.
#[derive(Debug, Clone, Serialize)]
pub struct ActivationResult {
    pub active: Option<String>,
    pub warnings: Vec<String>,
}
