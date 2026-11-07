use crate::models::monitor::{DiskInfo, MonitorSnapshot, TemperatureInfo};
use std::sync::{Mutex, OnceLock};
use sysinfo::{ComponentExt, CpuExt, DiskExt, System, SystemExt};

/// Reads a fresh, read-only snapshot of host performance counters.
/// Temperatures are best-effort: many PCs do not expose sensor values to applications.
pub fn snapshot() -> MonitorSnapshot {
    // Один System на всё время работы: загрузка CPU считается как разница между обновлениями.
    static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();
    let mut system = SYSTEM.get_or_init(|| Mutex::new(System::new_all())).lock().unwrap_or_else(|p| p.into_inner());
    system.refresh_all();

    let total = system.total_memory();
    let used = system.used_memory();
    let memory_percent = if total == 0 { 0.0 } else { (used as f32 / total as f32) * 100.0 };

    let disks = system.disks().iter().map(|disk| DiskInfo {
        name: disk.name().to_string_lossy().into_owned(),
        mount_point: disk.mount_point().to_string_lossy().into_owned(),
        total_bytes: disk.total_space(),
        available_bytes: disk.available_space(),
    }).collect();

    let temperatures = system.components().iter().filter_map(|component| {
        let value = component.temperature();
        if value.is_finite() && value > 0.0 {
            Some(TemperatureInfo {
                label: component.label().to_string(),
                celsius: value,
            })
        } else {
            None
        }
    }).collect();

    MonitorSnapshot {
        cpu_name: system.global_cpu_info().brand().trim().to_string(),
        cpu_usage_percent: system.global_cpu_info().cpu_usage().clamp(0.0, 100.0),
        memory_used_bytes: used,
        memory_total_bytes: total,
        memory_usage_percent: memory_percent.clamp(0.0, 100.0),
        logical_cpu_count: system.cpus().len(),
        uptime_seconds: system.uptime(),
        disks,
        temperatures,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_contains_valid_percentages() {
        let data = snapshot();
        assert!((0.0..=100.0).contains(&data.cpu_usage_percent));
        assert!((0.0..=100.0).contains(&data.memory_usage_percent));
        assert!(data.memory_used_bytes <= data.memory_total_bytes || data.memory_total_bytes == 0);
    }
}
