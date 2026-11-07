import { call } from "./tauri-api.js";

export const getModes = () => call("get_modes");
export const getActiveMode = () => call("get_active_mode");
export const setMode = (modeId) => call("set_mode", { modeId });
export const deactivateMode = () => call("deactivate_mode");
