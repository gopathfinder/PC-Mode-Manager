import { call } from "./tauri-api.js";

export const getProcesses = () => call("get_processes");
export const launchApplication = (path, args = [], workingDir = null) => call("launch_application", { path, args, workingDir });
export const closeApplication = (pid) => call("close_application", { pid });
export const forceTerminateProcess = (pid) => call("force_terminate_process", { pid });
