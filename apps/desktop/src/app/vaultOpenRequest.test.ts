import { beforeEach, describe, expect, it, vi } from "vitest";
import { openVaultWindow } from "./detachedWindows";
import { useVaultOpenDialogStore } from "./store/vaultOpenDialogStore";
import { useVaultStore } from "./store/vaultStore";
import {
    executeVaultOpenDisposition,
    normalizeVaultPath,
    requestOpenVault,
    resolveVaultOpenDisposition,
    setVaultOpenReplaceHandler,
} from "./vaultOpenRequest";

vi.mock("./detachedWindows", () => ({
    openVaultWindow: vi.fn(async () => {}),
}));

describe("vaultOpenRequest", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useVaultOpenDialogStore.getState().reset();
        useVaultStore.setState({
            vaultPath: null,
            openVault: vi.fn(async () => {}),
        });
        setVaultOpenReplaceHandler(null);
    });

    it("normalizes trailing slashes when comparing vault paths", () => {
        expect(normalizeVaultPath("/vaults/a/")).toBe("/vaults/a");
    });

    it("opens directly in the current window when no vault is active", async () => {
        const openVault = vi.fn(async () => {});
        useVaultStore.setState({ openVault });
        const replaceHandler = vi.fn(async () => {});
        setVaultOpenReplaceHandler(replaceHandler);

        await requestOpenVault("/vaults/new");

        expect(openVault).toHaveBeenCalledWith("/vaults/new");
        expect(replaceHandler).toHaveBeenCalledTimes(1);
        expect(openVaultWindow).not.toHaveBeenCalled();
    });

    it("prompts when switching to a different vault", async () => {
        useVaultStore.setState({ vaultPath: "/vaults/current" });

        const pending = resolveVaultOpenDisposition("/vaults/other");
        expect(useVaultOpenDialogStore.getState().pending?.vaultName).toBe(
            "other",
        );

        useVaultOpenDialogStore.getState().resolve("new-window");
        await expect(pending).resolves.toBe("new-window");
    });

    it("cancels when the requested vault is already open", async () => {
        useVaultStore.setState({ vaultPath: "/vaults/current" });

        await expect(
            resolveVaultOpenDisposition("/vaults/current/"),
        ).resolves.toBe("cancelled");
        expect(useVaultOpenDialogStore.getState().pending).toBeNull();
    });

    it("executes new-window and replace dispositions", async () => {
        const openVault = vi.fn(async () => {});
        useVaultStore.setState({ openVault });
        const replaceHandler = vi.fn(async () => {});
        setVaultOpenReplaceHandler(replaceHandler);

        await executeVaultOpenDisposition("/vaults/new", "new-window");
        expect(openVaultWindow).toHaveBeenCalledWith("/vaults/new");
        expect(openVault).not.toHaveBeenCalled();

        await executeVaultOpenDisposition("/vaults/current", "replace");
        expect(openVault).toHaveBeenCalledWith("/vaults/current");
        expect(replaceHandler).toHaveBeenCalledTimes(1);
    });
});
