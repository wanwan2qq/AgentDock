import { invoke } from "@neverwrite/runtime";
import type { Update } from "@neverwrite/runtime";

export type AppUpdateInstallMode = "in-app" | "manual-installer";
export type AppUpdateDownloadState =
    | "idle"
    | "downloading"
    | "ready"
    | "error";

export interface AvailableAppUpdate extends Pick<
    Update,
    "body" | "currentVersion" | "version" | "date" | "rawJson"
> {
    target: string;
    downloadUrl: string;
}

export interface AppUpdateDownload {
    state: AppUpdateDownloadState;
    progress: number | null;
    localPath: string | null;
    error: string | null;
}

export interface AppUpdateStatus {
    enabled: boolean;
    currentVersion: string;
    channel: string;
    endpoint: string | null;
    message: string | null;
    installMode: AppUpdateInstallMode;
    download: AppUpdateDownload;
    update: AvailableAppUpdate | null;
}

export async function getAppUpdateConfiguration() {
    return invoke<AppUpdateStatus>("get_app_update_configuration");
}

export async function checkForAppUpdate() {
    return invoke<AppUpdateStatus>("check_for_app_update");
}

export async function downloadAndInstallAppUpdate(args: {
    version: string;
    target: string;
}) {
    return invoke<void>("download_and_install_app_update", args);
}
