import { create } from "zustand";
import {
    checkForAppUpdate,
    downloadAndInstallAppUpdate,
    getAppUpdateConfiguration,
    type AppUpdateStatus,
} from "./api";

type InitializeOptions = {
    backgroundCheck?: boolean;
};

interface AppUpdateStore {
    status: AppUpdateStatus | null;
    loading: boolean;
    initialized: boolean;
    checking: boolean;
    installing: boolean;
    error: string | null;
    hasChecked: boolean;
    lastCheckedAt: number | null;
    promptOpen: boolean;
    dismissedVersion: string | null;
    initialize: (options?: InitializeOptions) => Promise<AppUpdateStatus | null>;
    checkNow: (options?: { background?: boolean }) => Promise<AppUpdateStatus | null>;
    refreshConfiguration: () => Promise<AppUpdateStatus | null>;
    installAvailableUpdate: () => Promise<void>;
    dismissPrompt: () => void;
    openPrompt: () => void;
    reset: () => void;
}

let initializePromise: Promise<AppUpdateStatus | null> | null = null;
let checkPromise: Promise<AppUpdateStatus | null> | null = null;
let installPromise: Promise<void> | null = null;
let downloadPollTimer: ReturnType<typeof setInterval> | null = null;
let periodicCheckTimer: ReturnType<typeof setInterval> | null = null;

const DOWNLOAD_POLL_MS = 1_000;
const PERIODIC_CHECK_MS = 6 * 60 * 60 * 1_000;

function toErrorMessage(reason: unknown, fallback: string) {
    return reason instanceof Error ? reason.message : fallback;
}

function shouldOpenPrompt(
    status: AppUpdateStatus | null,
    dismissedVersion: string | null,
) {
    const version = status?.update?.version;
    if (!version) {
        return false;
    }
    if (dismissedVersion === version) {
        return false;
    }
    return true;
}

function stopDownloadPolling() {
    if (downloadPollTimer) {
        clearInterval(downloadPollTimer);
        downloadPollTimer = null;
    }
}

function ensurePeriodicChecks(get: () => AppUpdateStore) {
    if (periodicCheckTimer || typeof window === "undefined") {
        return;
    }
    periodicCheckTimer = setInterval(() => {
        const state = get();
        if (!state.status?.enabled || state.checking || state.installing) {
            return;
        }
        void state.checkNow({ background: true });
    }, PERIODIC_CHECK_MS);
}

export const useAppUpdateStore = create<AppUpdateStore>((set, get) => {
    const syncPromptAndPolling = (status: AppUpdateStatus | null) => {
        const dismissedVersion = get().dismissedVersion;
        const promptOpen =
            get().promptOpen || shouldOpenPrompt(status, dismissedVersion);
        set({
            promptOpen: promptOpen && Boolean(status?.update),
        });

        const downloading = status?.download.state === "downloading";
        if (downloading && status?.update) {
            if (!downloadPollTimer) {
                downloadPollTimer = setInterval(() => {
                    void get().refreshConfiguration();
                }, DOWNLOAD_POLL_MS);
            }
            return;
        }
        stopDownloadPolling();
    };

    return {
        status: null,
        loading: false,
        initialized: false,
        checking: false,
        installing: false,
        error: null,
        hasChecked: false,
        lastCheckedAt: null,
        promptOpen: false,
        dismissedVersion: null,

        initialize: async (options) => {
            if (initializePromise) {
                return initializePromise;
            }

            if (get().initialized) {
                ensurePeriodicChecks(get);
                if (options?.backgroundCheck && !get().hasChecked) {
                    void get().checkNow({ background: true });
                }
                return get().status;
            }

            set({ loading: true, error: null });
            initializePromise = getAppUpdateConfiguration()
                .then((status) => {
                    set({
                        status,
                        loading: false,
                        initialized: true,
                        error: null,
                    });
                    ensurePeriodicChecks(get);
                    if (options?.backgroundCheck && status.enabled) {
                        void get().checkNow({ background: true });
                    }
                    return status;
                })
                .catch((reason) => {
                    const message = toErrorMessage(
                        reason,
                        "Failed to load updater configuration.",
                    );
                    set({
                        loading: false,
                        initialized: true,
                        error: message,
                    });
                    return get().status;
                })
                .finally(() => {
                    initializePromise = null;
                });

            return initializePromise;
        },

        checkNow: async (options) => {
            if (checkPromise) {
                return checkPromise;
            }

            if (!get().initialized) {
                await get().initialize();
            }

            set({
                checking: true,
                error: options?.background ? get().error : null,
            });

            checkPromise = checkForAppUpdate()
                .then((status) => {
                    set({
                        status,
                        checking: false,
                        error: null,
                        hasChecked: true,
                        lastCheckedAt: Date.now(),
                    });
                    syncPromptAndPolling(status);
                    return status;
                })
                .catch((reason) => {
                    const message = toErrorMessage(
                        reason,
                        "Failed to check for updates.",
                    );
                    set({
                        checking: false,
                        error: message,
                        hasChecked: true,
                        lastCheckedAt: Date.now(),
                    });
                    return get().status;
                })
                .finally(() => {
                    checkPromise = null;
                });

            return checkPromise;
        },

        refreshConfiguration: async () => {
            try {
                const status = await getAppUpdateConfiguration();
                set({ status });
                syncPromptAndPolling(status);
                return status;
            } catch {
                return get().status;
            }
        },

        installAvailableUpdate: async () => {
            if (installPromise) {
                return installPromise;
            }

            const update = get().status?.update;
            if (!update) {
                throw new Error("No app update is currently available.");
            }

            set({ installing: true, error: null });
            installPromise = downloadAndInstallAppUpdate({
                version: update.version,
                target: update.target,
            })
                .then(async () => {
                    set({ installing: false, promptOpen: false });
                    await get().refreshConfiguration();
                })
                .catch((reason) => {
                    const message = toErrorMessage(
                        reason,
                        "Failed to download and install the update.",
                    );
                    // Manual installer opens the DMG and surfaces guidance via the thrown message.
                    const openedManualInstaller =
                        /已打开/.test(message) || /xattr -cr/.test(message);
                    set({
                        installing: false,
                        error: openedManualInstaller ? null : message,
                        promptOpen: openedManualInstaller ? false : get().promptOpen,
                    });
                    if (!openedManualInstaller) {
                        throw reason;
                    }
                })
                .finally(() => {
                    installPromise = null;
                });

            return installPromise;
        },

        dismissPrompt: () => {
            const version = get().status?.update?.version ?? null;
            stopDownloadPolling();
            set({
                promptOpen: false,
                dismissedVersion: version,
            });
        },

        openPrompt: () => {
            if (!get().status?.update) {
                return;
            }
            set({ promptOpen: true, dismissedVersion: null });
            syncPromptAndPolling(get().status);
        },

        reset: () => {
            initializePromise = null;
            checkPromise = null;
            installPromise = null;
            stopDownloadPolling();
            if (periodicCheckTimer) {
                clearInterval(periodicCheckTimer);
                periodicCheckTimer = null;
            }
            set({
                status: null,
                loading: false,
                initialized: false,
                checking: false,
                installing: false,
                error: null,
                hasChecked: false,
                lastCheckedAt: null,
                promptOpen: false,
                dismissedVersion: null,
            });
        },
    };
});
