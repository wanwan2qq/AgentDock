import { create } from "zustand";
import { logError } from "../../app/utils/runtimeLog";
import { fetchGitStatus, initGitRepo } from "./api";
import type { GitStatusSnapshot } from "./types";

export const EMPTY_GIT_STATUS: GitStatusSnapshot = {
    isRepo: false,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    dirty: false,
    files: [],
    conflicts: [],
    hasGit: true,
    neverwriteIgnored: true,
};

function normalizeStatus(status: GitStatusSnapshot): GitStatusSnapshot {
    return {
        ...status,
        neverwriteIgnored: status.neverwriteIgnored ?? !status.isRepo,
    };
}

const POLL_MS = 8_000;

interface GitStatusStore {
    status: GitStatusSnapshot;
    loading: boolean;
    error: string | null;
    busyInit: boolean;
    vaultPath: string | null;
    setVaultPath: (vaultPath: string | null) => void;
    applyStatus: (status: GitStatusSnapshot) => void;
    refresh: () => Promise<GitStatusSnapshot | null>;
    initRepo: () => Promise<GitStatusSnapshot | null>;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let refreshSeq = 0;

function stopPolling() {
    if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function startPolling(refresh: () => void) {
    stopPolling();
    pollTimer = setInterval(() => {
        void refresh();
    }, POLL_MS);
}

export const useGitStatusStore = create<GitStatusStore>((set, get) => ({
    status: EMPTY_GIT_STATUS,
    loading: false,
    error: null,
    busyInit: false,
    vaultPath: null,

    setVaultPath: (vaultPath) => {
        const prev = get().vaultPath;
        if (prev === vaultPath) return;
        refreshSeq += 1;
        stopPolling();
        if (!vaultPath) {
            set({
                vaultPath: null,
                status: EMPTY_GIT_STATUS,
                loading: false,
                error: null,
                busyInit: false,
            });
            return;
        }
        set({ vaultPath, error: null });
        void get().refresh();
        startPolling(() => {
            void get().refresh();
        });
    },

    applyStatus: (status) => {
        set({ status: normalizeStatus(status), error: null });
    },

    refresh: async () => {
        const vaultPath = get().vaultPath;
        if (!vaultPath) {
            set({ status: EMPTY_GIT_STATUS, loading: false, error: null });
            return null;
        }
        const seq = ++refreshSeq;
        set({ loading: true, error: null });
        try {
            const status = normalizeStatus(await fetchGitStatus());
            if (seq !== refreshSeq || get().vaultPath !== vaultPath) {
                return null;
            }
            set({ status, loading: false, error: null });
            return status;
        } catch (err) {
            if (seq !== refreshSeq || get().vaultPath !== vaultPath) {
                return null;
            }
            const message = err instanceof Error ? err.message : String(err);
            logError("git-status", "Failed to load git status", err);
            set({ loading: false, error: message });
            return null;
        }
    },

    initRepo: async () => {
        const vaultPath = get().vaultPath;
        if (!vaultPath) return null;
        set({ busyInit: true, error: null });
        try {
            const status = normalizeStatus(await initGitRepo());
            set({ status, busyInit: false, error: null });
            return status;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logError("git-status", "Failed to init git repo", err);
            set({ busyInit: false, error: message });
            return null;
        }
    },
}));
