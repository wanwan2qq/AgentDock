import { useEffect } from "react";
import { useAppUpdateStore } from "./store";

function dialogButtonStyle(variant: "primary" | "secondary" | "ghost") {
    if (variant === "primary") {
        return {
            backgroundColor: "var(--accent)",
            border: "1px solid color-mix(in srgb, var(--accent) 70%, transparent)",
            color: "#fff",
        } as const;
    }

    if (variant === "secondary") {
        return {
            background: "none",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
        } as const;
    }

    return {
        background: "none",
        border: "1px solid transparent",
        color: "var(--text-secondary)",
    } as const;
}

function formatProgress(progress: number | null) {
    if (progress == null || !Number.isFinite(progress)) {
        return null;
    }
    return `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
}

export function AppUpdateAvailableDialog() {
    const promptOpen = useAppUpdateStore((state) => state.promptOpen);
    const status = useAppUpdateStore((state) => state.status);
    const installing = useAppUpdateStore((state) => state.installing);
    const dismissPrompt = useAppUpdateStore((state) => state.dismissPrompt);
    const installAvailableUpdate = useAppUpdateStore(
        (state) => state.installAvailableUpdate,
    );
    const refreshConfiguration = useAppUpdateStore(
        (state) => state.refreshConfiguration,
    );

    const update = status?.update ?? null;
    const download = status?.download;
    const installMode = status?.installMode ?? "in-app";

    useEffect(() => {
        if (!promptOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            dismissPrompt();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [promptOpen, dismissPrompt]);

    useEffect(() => {
        if (!promptOpen || download?.state !== "downloading") {
            return;
        }
        const timer = window.setInterval(() => {
            void refreshConfiguration();
        }, 1000);
        return () => window.clearInterval(timer);
    }, [promptOpen, download?.state, refreshConfiguration]);

    if (!promptOpen || !update) {
        return null;
    }

    const progressLabel = formatProgress(download?.progress ?? null);
    const downloading = download?.state === "downloading";
    const ready = download?.state === "ready";
    const downloadFailed = download?.state === "error";

    let statusText =
        installMode === "manual-installer"
            ? "检测到新版本。安装包会自动下载，下载完成后可打开安装。"
            : "检测到新版本。更新包会自动下载，准备好后可安装并重启。";
    if (downloading) {
        statusText = progressLabel
            ? `正在下载更新… ${progressLabel}`
            : "正在下载更新…";
    } else if (ready) {
        statusText =
            installMode === "manual-installer"
                ? "安装包已下载完成，可以打开安装。"
                : "更新已下载完成，可以安装并重启。";
    } else if (downloadFailed) {
        statusText =
            download?.error ??
            "自动下载失败。仍可继续，将打开安装包下载页。";
    }

    const primaryLabel = installing
        ? "处理中…"
        : installMode === "manual-installer"
          ? ready
              ? "打开安装包"
              : "下载并打开"
          : ready
            ? "安装并重启"
            : "下载并安装";

    return (
        <div
            className="absolute inset-0 z-[60] flex items-center justify-center p-6"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={() => dismissPrompt()}
            data-testid="app-update-available-dialog"
        >
            <div
                className="mx-4 flex w-full max-w-md flex-col gap-4 rounded-lg p-4 shadow-lg"
                style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-update-available-title"
            >
                <div className="flex flex-col gap-1">
                    <div
                        id="app-update-available-title"
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                    >
                        发现新版本 {update.version}
                    </div>
                    <div
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        当前版本 {update.currentVersion}。{statusText}
                    </div>
                </div>
                {update.body ? (
                    <div
                        className="max-h-40 overflow-auto rounded-md p-3 text-xs leading-relaxed whitespace-pre-wrap"
                        style={{
                            backgroundColor: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        {update.body}
                    </div>
                ) : null}
                {downloading ? (
                    <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--border)" }}
                    >
                        <div
                            className="h-full rounded-full transition-[width] duration-300"
                            style={{
                                width: progressLabel
                                    ? progressLabel
                                    : "35%",
                                backgroundColor: "var(--accent)",
                                ...(progressLabel
                                    ? {}
                                    : { animation: "pulse 1.2s ease-in-out infinite" }),
                            }}
                        />
                    </div>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => dismissPrompt()}
                        className="rounded px-3 py-1.5 text-xs font-medium"
                        style={dialogButtonStyle("ghost")}
                        disabled={installing}
                    >
                        稍后
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void installAvailableUpdate().catch(() => {});
                        }}
                        className="rounded px-3 py-1.5 text-xs font-medium"
                        style={dialogButtonStyle("primary")}
                        disabled={installing}
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
