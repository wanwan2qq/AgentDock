import { useEffect } from "react";
import { useLayoutStore } from "../../app/store/layoutStore";
import { useVaultStore } from "../../app/store/vaultStore";
import { useGitStatusStore } from "./gitStatusStore";

function openGitSidebar() {
    const layout = useLayoutStore.getState();
    layout.expandSidebar();
    layout.setSidebarView("git");
}

export function GitStatusBar() {
    const vaultPath = useVaultStore((state) => state.vaultPath);
    const setVaultPath = useGitStatusStore((state) => state.setVaultPath);
    const status = useGitStatusStore((state) => state.status);
    const loading = useGitStatusStore((state) => state.loading);
    const busyInit = useGitStatusStore((state) => state.busyInit);
    const error = useGitStatusStore((state) => state.error);
    const initRepo = useGitStatusStore((state) => state.initRepo);
    const refresh = useGitStatusStore((state) => state.refresh);

    useEffect(() => {
        setVaultPath(vaultPath);
    }, [setVaultPath, vaultPath]);

    if (!vaultPath) {
        return null;
    }

    if (!status.hasGit && !loading) {
        return (
            <footer
                className="flex h-7 shrink-0 items-center gap-2 px-3 text-[11px]"
                style={{
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                }}
                data-testid="git-status-bar"
            >
                <span>未找到系统 git</span>
            </footer>
        );
    }

    if (!status.isRepo) {
        return (
            <footer
                className="flex h-7 shrink-0 items-center gap-2 px-3 text-[11px]"
                style={{
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                }}
                data-testid="git-status-bar"
            >
                <button
                    type="button"
                    className="truncate hover:underline"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={openGitSidebar}
                    title="打开 Git 面板"
                >
                    Git · 未初始化
                </button>
                <button
                    type="button"
                    className="shrink-0 rounded px-1.5 py-0.5"
                    style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        backgroundColor: "transparent",
                        opacity: busyInit ? 0.6 : 1,
                    }}
                    disabled={busyInit}
                    onClick={() => {
                        void initRepo();
                    }}
                >
                    {busyInit ? "初始化中…" : "初始化仓库"}
                </button>
                {error ? (
                    <span className="min-w-0 truncate" style={{ color: "#dc2626" }}>
                        {error}
                    </span>
                ) : null}
            </footer>
        );
    }

    const branchLabel = status.branch || "(detached)";
    const dirtyCount = status.files.length;
    const syncParts: string[] = [];
    if (status.ahead > 0) syncParts.push(`↑${status.ahead}`);
    if (status.behind > 0) syncParts.push(`↓${status.behind}`);
    const syncLabel =
        syncParts.length > 0
            ? syncParts.join(" ")
            : status.upstream
              ? "已同步"
              : "无上游";

    return (
        <footer
            className="flex h-7 shrink-0 items-center gap-2 px-3 text-[11px]"
            style={{
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-secondary)",
            }}
            data-testid="git-status-bar"
        >
            <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 truncate text-left hover:underline"
                style={{ color: "var(--text-secondary)" }}
                onClick={openGitSidebar}
                title="打开 Git 面板"
            >
                <span className="shrink-0" style={{ color: "var(--text-primary)" }}>
                    {branchLabel}
                </span>
                <span className="shrink-0">·</span>
                <span className="shrink-0">
                    {dirtyCount > 0 ? `${dirtyCount} 处更改` : "工作区干净"}
                </span>
                <span className="shrink-0">·</span>
                <span className="min-w-0 truncate">{syncLabel}</span>
                {loading ? <span className="shrink-0 opacity-60">刷新中</span> : null}
            </button>
            <button
                type="button"
                className="shrink-0 rounded px-1.5 py-0.5"
                style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    backgroundColor: "transparent",
                }}
                title="刷新 Git 状态"
                onClick={() => {
                    void refresh();
                }}
            >
                刷新
            </button>
            {error ? (
                <span className="min-w-0 max-w-[40%] truncate" style={{ color: "#dc2626" }}>
                    {error}
                </span>
            ) : null}
        </footer>
    );
}
