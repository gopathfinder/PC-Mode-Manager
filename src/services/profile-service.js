import { call } from "./tauri-api.js";

export const getProfiles = () => call("get_profiles");
export const createProfile = (profile) => call("create_profile", { profile });
export const updateProfile = (profile) => call("update_profile", { profile });
export const deleteProfile = (profileId) => call("delete_profile", { profileId });
export const exportProfile = (profileId, path) => call("export_profile", { profileId, path });
export const importProfile = (path) => call("import_profile", { path });
export const restoreDefaultProfiles = () => call("restore_default_profiles");
