use crate::{core::monitor_manager, models::monitor::MonitorSnapshot};

#[tauri::command]
pub fn get_system_snapshot() -> MonitorSnapshot {
    monitor_manager::snapshot()
}

use crate::core::hardware_manager::{self, LiveSensors};

/// Имена видеоадаптеров (как в диспетчере задач). Выполняется в фоне: опрашивает WMI.
#[tauri::command(async)]
pub fn get_gpu_names() -> Vec<String> {
    hardware_manager::gpu_names()
}

/// Загрузка и температура GPU, температуры ACPI. Опрашивать не чаще раза в несколько секунд.
#[tauri::command(async)]
pub fn get_live_sensors() -> LiveSensors {
    hardware_manager::live_sensors()
}
