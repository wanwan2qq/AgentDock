import { create } from "zustand";
import { getPathBaseName } from "../utils/path";

export type VaultOpenDisposition = "new-window" | "replace" | "cancelled";

interface VaultOpenDialogPending {
    path: string;
    vaultName: string;
}

interface VaultOpenDialogStore {
    pending: VaultOpenDialogPending | null;
    resolver: ((disposition: VaultOpenDisposition) => void) | null;
    prompt: (path: string) => Promise<VaultOpenDisposition>;
    resolve: (disposition: VaultOpenDisposition) => void;
    reset: () => void;
}

export const useVaultOpenDialogStore = create<VaultOpenDialogStore>(
    (set, get) => ({
        pending: null,
        resolver: null,
        prompt: (path) =>
            new Promise((resolve) => {
                set({
                    pending: {
                        path,
                        vaultName: getPathBaseName(path),
                    },
                    resolver: resolve,
                });
            }),
        resolve: (disposition) => {
            const { resolver } = get();
            set({ pending: null, resolver: null });
            resolver?.(disposition);
        },
        reset: () => {
            const { resolver } = get();
            set({ pending: null, resolver: null });
            resolver?.("cancelled");
        },
    }),
);
