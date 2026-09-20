import { afterEach, describe, expect, it, vi } from "vitest";

const getAppUpdateConfiguration = vi.fn();
const checkForAppUpdate = vi.fn();
const downloadAndInstallAppUpdate = vi.fn();

vi.mock("./api", () => ({
    getAppUpdateConfiguration: (...args: unknown[]) =>
        getAppUpdateConfiguration(...args),
    checkForAppUpdate: (...args: unknown[]) => checkForAppUpdate(...args),
    downloadAndInstallAppUpdate: (...args: unknown[]) =>
        downloadAndInstallAppUpdate(...args),
}));

import { useAppUpdateStore } from "./store";

function baseStatus(overrides: Record<string, unknown> = {}) {
    return {
        enabled: true,
        currentVersion: "0.6.1",
        channel: "stable",
        endpoint: "https://example.test/latest-mac.yml",
        message: null,
        installMode: "manual-installer" as const,
        download: {
            state: "idle" as const,
            progress: null,
            localPath: null,
            error: null,
        },
        update: null,
        ...overrides,
    };
}

describe("useAppUpdateStore update prompt", () => {
    afterEach(() => {
        useAppUpdateStore.getState().reset();
        vi.clearAllMocks();
    });

    it("opens a prompt after a background check finds an update", async () => {
        getAppUpdateConfiguration.mockResolvedValue(baseStatus());
        checkForAppUpdate.mockResolvedValue(
            baseStatus({
                download: {
                    state: "downloading",
                    progress: 0.2,
                    localPath: null,
                    error: null,
                },
                update: {
                    body: "fixes",
                    currentVersion: "0.6.1",
                    version: "0.6.2",
                    date: null,
                    target: "darwin-universal",
                    downloadUrl: "https://example.test/app.dmg",
                    rawJson: {},
                },
            }),
        );

        await useAppUpdateStore.getState().initialize({ backgroundCheck: true });
        await vi.waitFor(() => {
            expect(useAppUpdateStore.getState().promptOpen).toBe(true);
        });
        expect(useAppUpdateStore.getState().status?.update?.version).toBe("0.6.2");
    });

    it("keeps the prompt dismissed for the same version until reopened", async () => {
        useAppUpdateStore.setState({
            initialized: true,
            status: baseStatus({
                update: {
                    body: null,
                    currentVersion: "0.6.1",
                    version: "0.6.2",
                    date: null,
                    target: "darwin-universal",
                    downloadUrl: "https://example.test/app.dmg",
                    rawJson: {},
                },
            }),
            promptOpen: true,
        });

        useAppUpdateStore.getState().dismissPrompt();
        expect(useAppUpdateStore.getState().promptOpen).toBe(false);
        expect(useAppUpdateStore.getState().dismissedVersion).toBe("0.6.2");

        checkForAppUpdate.mockResolvedValue(
            useAppUpdateStore.getState().status,
        );
        await useAppUpdateStore.getState().checkNow({ background: true });
        expect(useAppUpdateStore.getState().promptOpen).toBe(false);
    });
});
