use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TemperatureInfo {
    pub label: String,
    pub celsius: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct MonitorSnapshot {
    pub cpu_name: String,
    pub cpu_usage_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub memory_usage_percent: f32,
    pub logical_cpu_count: usize,
    pub uptime_seconds: u64,
    pub disks: Vec<DiskInfo>,
    pub temperatures: Vec<TemperatureInfo>,
}
