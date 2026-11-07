import { call } from "./tauri-api.js";

export async function getSystemSnapshot() {
  return call("get_system_snapshot");
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days} д ${hours} ч` : `${hours} ч ${minutes} мин`;
}

export const getGpuNames = () => call("get_gpu_names");
export const getLiveSensors = () => call("get_live_sensors");
