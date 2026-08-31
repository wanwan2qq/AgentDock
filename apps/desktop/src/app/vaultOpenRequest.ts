import { openVaultWindow } from "./detachedWindows";
import {
    useVaultOpenDialogStore,
    type VaultOpenDisposition,
} from "./store/vaultOpenDialogStore";
import { useVaultStore } from "./store/vaultStore";

export function normalizeVaultPath(path: string) {
    return path.replace(/[\\/]+$/, "");
}

let replaceVaultHandler: (() => Promise<void>) | null = null;

export function setVaultOpenReplaceHandler(
    handler: (() => Promise<void>) | null,
) {
    replaceVaultHandler = handler;
}

export async function resolveVaultOpenDisposition(
    path: string,
): Promise<VaultOpenDisposition> {
    const normalizedPath = normalizeVaultPath(path);
    const currentVaultPath = useVaultStore.getState().vaultPath;
    const normalizedCurrent = currentVaultPath
        ? normalizeVaultPath(currentVaultPath)
        : null;

    if (normalizedCurrent === normalizedPath) {
        return "cancelled";
    }

    if (!normalizedCurrent) {
        return "replace";
    }

    return useVaultOpenDialogStore.getState().prompt(normalizedPath);
}

export async function executeVaultOpenDisposition(
    path: string,
    disposition: VaultOpenDisposition,
) {
    if (disposition === "cancelled") {
        return;
    }

    if (disposition === "new-window") {
        await openVaultWindow(path);
        return;
    }

    await useVaultStore.getState().openVault(path);
    await replaceVaultHandler?.();
}

export async function requestOpenVault(path: string) {
    const disposition = await resolveVaultOpenDisposition(path);
    await executeVaultOpenDisposition(path, disposition);
}
