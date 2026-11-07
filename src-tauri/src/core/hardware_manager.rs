//! GPU и дополнительные датчики. Только чтение, команды фиксированы в коде (frontend их не задаёт).
//! Источники: nvidia-smi (если установлен драйвер NVIDIA), счётчики Windows GPU Engine через WMI,
//! ACPI Thermal Zone (доступна не на всех ПК и иногда только администратору).
use serde::Serialize;
use std::{process::Command, sync::atomic::{AtomicBool, Ordering}};

#[derive(Debug, Clone, Default, Serialize)]
pub struct LiveSensors {
    pub gpu_usage_percent: Option<f32>,
    pub gpu_temperature_c: Option<f32>,
    pub gpu_memory_used_mb: Option<u64>,
    pub gpu_memory_total_mb: Option<u64>,
    pub acpi_temperatures_c: Vec<f32>,
    pub source: String,
}

/// Запускает программу без мигающего консольного окна и возвращает stdout при успехе.
fn run(program: &str, args: &[&str]) -> Option<String> {
    let mut command = Command::new(program);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let output = command.output().ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn powershell(script: &str) -> Option<String> {
    run("powershell.exe", &["-NoProfile", "-NonInteractive", "-Command", script])
}

pub fn gpu_names() -> Vec<String> {
    let script = "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }";
    let mut names: Vec<String> = powershell(script).unwrap_or_default()
        .lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect();
    names.dedup();
    names
}

fn opt_f32(s: &str) -> Option<f32> { s.trim().parse::<f32>().ok() }

/// Строка nvidia-smi: "NVIDIA GeForce RTX 3060, 12, 45, 1024, 12288" (usage %, °C, MiB used, MiB total).
fn parse_nvidia_line(line: &str) -> Option<LiveSensors> {
    let parts: Vec<&str> = line.split(',').map(str::trim).collect();
    if parts.len() < 5 { return None; }
    Some(LiveSensors {
        gpu_usage_percent: opt_f32(parts[1]).map(|v| v.clamp(0.0, 100.0)),
        gpu_temperature_c: opt_f32(parts[2]),
        gpu_memory_used_mb: parts[3].parse().ok(),
        gpu_memory_total_mb: parts[4].parse().ok(),
        source: "nvidia-smi".into(),
        ..Default::default()
    })
}

fn parse_acpi(text: &str) -> Vec<f32> {
    text.lines().filter_map(opt_f32).filter(|v| *v > 0.0 && *v < 120.0).collect()
}

// Если ACPI-датчиков нет (частый случай), больше не тратим время на повторные запросы.
static ACPI_UNAVAILABLE: AtomicBool = AtomicBool::new(false);

pub fn live_sensors() -> LiveSensors {
    let nvidia = run("nvidia-smi", &[
        "--query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total",
        "--format=csv,noheader,nounits",
    ]).and_then(|out| out.lines().next().and_then(parse_nvidia_line));

    let mut sensors = match nvidia {
        Some(s) => s,
        None => {
            // Любая видеокарта: суммарная загрузка 3D-движков (так считает и диспетчер задач).
            let script = "$v=(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*engtype_3D*' } | Measure-Object -Property UtilizationPercentage -Sum).Sum; if ($v -ne $null) { [math]::Round([math]::Min($v,100),1) }";
            let usage = powershell(script).and_then(|o| opt_f32(&o));
            LiveSensors { gpu_usage_percent: usage, source: if usage.is_some() { "windows-wmi".into() } else { String::new() }, ..Default::default() }
        }
    };

    if !ACPI_UNAVAILABLE.load(Ordering::Relaxed) {
        let script = "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | ForEach-Object { [math]::Round($_.CurrentTemperature / 10 - 273.15, 1) }";
        sensors.acpi_temperatures_c = powershell(script).map(|o| parse_acpi(&o)).unwrap_or_default();
        if sensors.acpi_temperatures_c.is_empty() { ACPI_UNAVAILABLE.store(true, Ordering::Relaxed); }
    }
    sensors
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_nvidia_smi_line() {
        let s = parse_nvidia_line("NVIDIA GeForce RTX 3060, 12, 45, 1024, 12288").unwrap();
        assert_eq!(s.gpu_usage_percent, Some(12.0));
        assert_eq!(s.gpu_temperature_c, Some(45.0));
        assert_eq!(s.gpu_memory_total_mb, Some(12288));
    }

    #[test]
    fn nvidia_not_available_values_become_none() {
        let s = parse_nvidia_line("GPU, [N/A], [N/A], 100, 200").unwrap();
        assert!(s.gpu_usage_percent.is_none() && s.gpu_temperature_c.is_none());
        assert!(parse_nvidia_line("broken").is_none());
    }

    #[test]
    fn acpi_filters_nonsense() {
        assert_eq!(parse_acpi("45.5\n-273.1\n300\nabc\n61"), vec![45.5, 61.0]);
    }
}
