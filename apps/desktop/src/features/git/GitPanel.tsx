import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { confirm } from "@neverwrite/runtime";
import { useVaultStore } from "../../app/store/vaultStore";
import { resolveVaultAbsolutePath } from "../../app/utils/vaultPaths";
import { getPathBaseName } from "../../app/utils/path";
import { logError } from "../../app/utils/runtimeLog";
import { openAiEditedFileByAbsolutePath } from "../ai/chatFileNavigation";
import {
    checkoutGitBranch,
    commitGitChanges,
    fetchGitBranches,
    fetchGitDiff,
    ignoreNeverwriteDirectory,
    pullGit,
    pushGit,
    stageGitPaths,
    unstageGitPaths,
} from "./api";
import { useGitStatusStore } from "./gitStatusStore";
import type { GitBranchList, GitFileStatus } from "./types";

function statusLabel(file: GitFileStatus) {
    if (file.conflict) return "C";
    if (file.untracked) return "U";
    const staged = file.status[0] !== "." ? file.status[0] : "";
    const unstaged = file.status[1] !== "." ? file.status[1] : "";
    return `${staged}${unstaged}` || file.status;
}

function statusColor(file: GitFileStatus) {
    if (file.conflict) return "#dc2626";
    if (file.untracked) return "var(--text-secondary)";
    if (file.status.includes("A") || file.status.includes("?")) {
        return "var(--diff-add, #16a34a)";
    }
    if (file.status.includes("D")) return "var(--diff-remove, #dc2626)";
    return "var(--accent)";
}

export function GitPanel() {
    const vaultPath = useVaultStore((s) => s.vaultPath);
    const status = useGitStatusStore((s) => s.status);
    const statusLoading = useGitStatusStore((s) => s.loading);
    const busyInit = useGitStatusStore((s) => s.busyInit);
    const statusError = useGitStatusStore((s) => s.error);
    const refreshStatus = useGitStatusStore((s) => s.refresh);
    const applyStatus = useGitStatusStore((s) => s.applyStatus);
    const initRepo = useGitStatusStore((s) => s.initRepo);
    const setVaultPath = useGitStatusStore((s) => s.setVaultPath);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState("");
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [diffPath, setDiffPath] = useState<string | null>(null);
    const [diffText, setDiffText] = useState<string>("");
    const [diffLoading, setDiffLoading] = useState(false);
    const [branches, setBranches] = useState<GitBranchList>({
        current: null,
        local: [],
        remote: [],
    });

    const loading = statusLoading || loadingBranches;

    const refresh = useCallback(async () => {
        if (!vaultPath) {
            setBranches({ current: null, local: [], remote: [] });
            return;
        }
        setLoadingBranches(true);
        setError(null);
        try {
            const [next, nextBranches] = await Promise.all([
                refreshStatus(),
                fetchGitBranches().catch((err) => {
                    logError("git-panel", "Failed to load branches", err);
                    return {
                        current: null,
                        local: [],
                        remote: [],
                    } satisfies GitBranchList;
                }),
            ]);
            if (next) {
                setSelected((prev) => {
                    const valid = new Set(
                        next.files
                            .map((file) => file.path)
                            .filter((path) => prev.has(path)),
                    );
                    return valid;
                });
            }
            setBranches(nextBranches);
        } catch (err) {
            logError("git-panel", "Failed to load git status", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoadingBranches(false);
        }
    }, [refreshStatus, vaultPath]);

    useEffect(() => {
        setVaultPath(vaultPath);
    }, [setVaultPath, vaultPath]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        setSelected((prev) => {
            const valid = new Set(
                status.files
                    .map((file) => file.path)
                    .filter((path) => prev.has(path)),
            );
            if (
                valid.size === prev.size &&
                [...valid].every((path) => prev.has(path))
            ) {
                return prev;
            }
            return valid;
        });
    }, [status.files]);

    const stagedFiles = useMemo(
        () => status.files.filter((file) => file.staged && !file.conflict),
        [status.files],
    );
    const changedFiles = useMemo(
        () =>
            status.files.filter(
                (file) => !file.conflict && (file.unstaged || file.untracked),
            ),
        [status.files],
    );
    const conflictFiles = useMemo(
        () => status.files.filter((file) => file.conflict),
        [status.files],
    );

    const runAction = useCallback(
        async (label: string, action: () => Promise<unknown>) => {
            setBusyAction(label);
            setError(null);
            setNotice(null);
            try {
                const result = await action();
                if (result && typeof result === "object") {
                    if (
                        "isRepo" in result &&
                        "files" in result &&
                        "hasGit" in result
                    ) {
                        applyStatus(result as typeof status);
                    } else if (
                        "status" in result &&
                        result.status &&
                        typeof result.status === "object"
                    ) {
                        applyStatus(result.status as typeof status);
                    }
                }
                await refresh();
            } catch (err) {
                logError("git-panel", `Git ${label} failed`, err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setBusyAction(null);
            }
        },
        [applyStatus, refresh],
    );

    const openRelativePath = useCallback(
        async (relativePath: string) => {
            const abs = resolveVaultAbsolutePath(relativePath, vaultPath);
            const opened = await openAiEditedFileByAbsolutePath(abs);
            if (!opened) {
                setError(`无法在应用内打开：${relativePath}`);
            }
        },
        [vaultPath],
    );

    const toggleSelected = useCallback((path: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const selectAllChanged = useCallback(() => {
        setSelected(new Set(changedFiles.map((file) => file.path)));
    }, [changedFiles]);

    const clearSelection = useCallback(() => setSelected(new Set()), []);

    const showDiff = useCallback(async (file: GitFileStatus) => {
        setDiffPath(file.path);
        setDiffLoading(true);
        setDiffText("");
        try {
            const preferStaged = file.staged && !file.unstaged;
            const result = await fetchGitDiff(file.path, preferStaged);
            setDiffText(result.diff || "(无差异内容)");
        } catch (err) {
            setDiffText(err instanceof Error ? err.message : String(err));
        } finally {
            setDiffLoading(false);
        }
    }, []);

    const branchOptions = useMemo(() => {
        const localSet = new Set(branches.local);
        const options: { value: string; label: string; group: "local" | "remote" }[] =
            branches.local.map((name) => ({
                value: name,
                label: name,
                group: "local",
            }));
        if (status.branch && !localSet.has(status.branch)) {
            options.unshift({
                value: status.branch,
                label: status.branch,
                group: "local",
            });
            localSet.add(status.branch);
        }
        for (const remote of branches.remote) {
            const short = remote.includes("/")
                ? remote.slice(remote.indexOf("/") + 1)
                : remote;
            // Skip remotes that already have a same-named local branch.
            if (localSet.has(short) || localSet.has(remote)) continue;
            options.push({
                value: remote,
                label: remote,
                group: "remote",
            });
        }
        return options;
    }, [branches.local, branches.remote, status.branch]);

    const handleBranchChange = useCallback(
        (nextBranch: string) => {
            if (!nextBranch || nextBranch === status.branch) return;
            void runAction("checkout", async () => {
                const result = await checkoutGitBranch(nextBranch);
                const switched = result.branch?.trim() || nextBranch;
                setNotice(`已切换到 ${switched}`);
            });
        },
        [runAction, status.branch],
    );

    if (!vaultPath) {
        return (
            <EmptyState title="Git" body="打开一个知识库文件夹后可查看 Git 状态。" />
        );
    }

    if (!status.hasGit) {
        return (
            <EmptyState
                title="Git"
                body="未找到系统 git。请安装 Git 并确保可在终端运行 `git --version`。"
            />
        );
    }

    if (!status.isRepo) {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <PanelHeader
                    title="Git"
                    loading={loading || busyInit}
                    onRefresh={() => void refresh()}
                />
                <EmptyState
                    title="未初始化仓库"
                    body="当前文件夹不是 Git 仓库。可一键初始化，或打开已有仓库文件夹。V1 不强制目录模板。"
                />
                <div className="px-3 pb-3">
                    <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-[12px]"
                        style={{
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            opacity: busyInit ? 0.6 : 1,
                        }}
                        disabled={busyInit}
                        onClick={() => {
                            void initRepo().then((next) => {
                                if (next?.isRepo) {
                                    setNotice("已初始化 Git 仓库");
                                    void refresh();
                                }
                            });
                        }}
                    >
                        {busyInit ? "初始化中…" : "初始化仓库"}
                    </button>
                    {(error || statusError) && (
                        <p
                            className="mt-2 text-[11px]"
                            style={{ color: "#dc2626" }}
                        >
                            {error || statusError}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const branchLabel = status.branch || "(detached)";
    const syncLabel =
        status.ahead > 0 || status.behind > 0
            ? `本地 ↑${status.ahead} ↓${status.behind}`
            : status.upstream
              ? "已与远端同步"
              : "无上游";

    return (
        <div className="flex h-full flex-col overflow-hidden" data-testid="git-panel">
            <PanelHeader
                title="Git"
                loading={loading || busyAction != null}
                onRefresh={() => void refresh()}
            />

            <div
                className="flex shrink-0 flex-col gap-1.5 px-3 pb-2"
                style={{ color: "var(--text-secondary)" }}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <label
                        className="shrink-0 text-[10px] uppercase tracking-wide"
                        htmlFor="git-branch-select"
                    >
                        分支
                    </label>
                    <select
                        id="git-branch-select"
                        className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-[12px] outline-none"
                        style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                        }}
                        value={status.branch ?? ""}
                        disabled={busyAction != null || branchOptions.length === 0}
                        title={status.upstream ?? branchLabel}
                        onChange={(event) => handleBranchChange(event.target.value)}
                    >
                        {!status.branch ? (
                            <option value="">{branchLabel}</option>
                        ) : null}
                        {branchOptions.some((opt) => opt.group === "local") ? (
                            <optgroup label="本地">
                                {branchOptions
                                    .filter((opt) => opt.group === "local")
                                    .map((opt) => (
                                        <option key={`local:${opt.value}`} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                            </optgroup>
                        ) : null}
                        {branchOptions.some((opt) => opt.group === "remote") ? (
                            <optgroup label="远端（切换将创建本地跟踪分支）">
                                {branchOptions
                                    .filter((opt) => opt.group === "remote")
                                    .map((opt) => (
                                        <option key={`remote:${opt.value}`} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                            </optgroup>
                        ) : null}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[11px]">{syncLabel}</span>
                    <ActionButton
                        label="Pull"
                        disabled={busyAction != null}
                        onClick={() =>
                            void runAction("pull", async () => {
                                await pullGit();
                            })
                        }
                    />
                    <ActionButton
                        label="Push"
                        disabled={busyAction != null}
                        onClick={() =>
                            void runAction("push", async () => {
                                await pushGit();
                            })
                        }
                    />
                </div>
            </div>

            {!status.neverwriteIgnored ? (
                <div
                    className="mx-3 mb-2 rounded-md px-2 py-1.5 text-[11px] leading-5"
                    style={{
                        background:
                            "color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))",
                        color: "var(--text-primary)",
                        border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                    }}
                >
                    <div>
                        本地会话目录{" "}
                        <code className="text-[10px]">.neverwrite/</code>{" "}
                        尚未被 Git 忽略，容易把聊天记录弄进版本库。
                    </div>
                    <div className="mt-1.5">
                        <ActionButton
                            label={
                                busyAction === "ignore-neverwrite"
                                    ? "写入中…"
                                    : "忽略本地会话目录"
                            }
                            primary
                            disabled={busyAction != null}
                            onClick={() => {
                                void (async () => {
                                    const approved = await confirm(
                                        "将把 .neverwrite/ 追加到 .gitignore，避免本地会话目录进入版本控制。是否继续？",
                                        {
                                            title: "忽略本地会话目录",
                                            kind: "info",
                                            okLabel: "写入 .gitignore",
                                            cancelLabel: "取消",
                                        },
                                    );
                                    if (!approved) return;
                                    await runAction(
                                        "ignore-neverwrite",
                                        async () => {
                                            await ignoreNeverwriteDirectory();
                                            setNotice(
                                                "已写入 .gitignore：.neverwrite/",
                                            );
                                        },
                                    );
                                })();
                            }}
                        />
                    </div>
                </div>
            ) : null}

            {error ? (
                <div
                    className="mx-3 mb-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md px-2 py-1.5 text-[11px]"
                    style={{
                        background:
                            "color-mix(in srgb, #dc2626 12%, var(--bg-secondary))",
                        color: "#b91c1c",
                        border: "1px solid color-mix(in srgb, #dc2626 25%, transparent)",
                    }}
                >
                    {error}
                </div>
            ) : null}

            {notice ? (
                <div
                    className="mx-3 mb-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md px-2 py-1.5 text-[11px]"
                    style={{
                        background:
                            "color-mix(in srgb, var(--accent) 12%, var(--bg-secondary))",
                        color: "var(--text-primary)",
                        border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                    }}
                >
                    {notice}
                </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto px-1 pb-2">
                {conflictFiles.length > 0 ? (
                    <Section title={`冲突 (${conflictFiles.length})`}>
                        {conflictFiles.map((file) => (
                            <FileRow
                                key={`conflict:${file.path}`}
                                file={file}
                                selected={false}
                                showCheckbox={false}
                                onOpen={() => void openRelativePath(file.path)}
                                onToggleDiff={() => void showDiff(file)}
                            />
                        ))}
                    </Section>
                ) : null}

                <Section
                    title={`已暂存 (${stagedFiles.length})`}
                    actions={
                        stagedFiles.length > 0 ? (
                            <ActionButton
                                label="取消暂存"
                                disabled={busyAction != null}
                                onClick={() =>
                                    void runAction("unstage", async () => {
                                        await unstageGitPaths(
                                            stagedFiles.map((file) => file.path),
                                        );
                                    })
                                }
                            />
                        ) : null
                    }
                >
                    {stagedFiles.length === 0 ? (
                        <Muted>暂无已暂存文件</Muted>
                    ) : (
                        stagedFiles.map((file) => (
                            <FileRow
                                key={`staged:${file.path}`}
                                file={file}
                                selected={false}
                                showCheckbox={false}
                                onOpen={() => void openRelativePath(file.path)}
                                onToggleDiff={() => void showDiff(file)}
                            />
                        ))
                    )}
                </Section>

                <Section
                    title={`更改 (${changedFiles.length})`}
                    actions={
                        <>
                            <ActionButton
                                label="全选"
                                disabled={changedFiles.length === 0}
                                onClick={selectAllChanged}
                            />
                            <ActionButton
                                label="清除"
                                disabled={selected.size === 0}
                                onClick={clearSelection}
                            />
                            <ActionButton
                                label="暂存所选"
                                disabled={busyAction != null || selected.size === 0}
                                onClick={() =>
                                    void runAction("stage", async () => {
                                        await stageGitPaths([...selected]);
                                        clearSelection();
                                    })
                                }
                            />
                        </>
                    }
                >
                    {changedFiles.length === 0 ? (
                        <Muted>工作区干净</Muted>
                    ) : (
                        changedFiles.map((file) => (
                            <FileRow
                                key={`changed:${file.path}`}
                                file={file}
                                selected={selected.has(file.path)}
                                showCheckbox
                                onToggleSelect={() => toggleSelected(file.path)}
                                onOpen={() => void openRelativePath(file.path)}
                                onToggleDiff={() => void showDiff(file)}
                            />
                        ))
                    )}
                </Section>

                {diffPath ? (
                    <Section
                        title={`Diff · ${getPathBaseName(diffPath)}`}
                        actions={
                            <ActionButton
                                label="关闭"
                                onClick={() => {
                                    setDiffPath(null);
                                    setDiffText("");
                                }}
                            />
                        }
                    >
                        <pre
                            className="mx-2 mb-2 max-h-48 overflow-auto rounded-md px-2 py-1.5 text-[10px] leading-4"
                            style={{
                                background: "var(--bg-secondary)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border)",
                                fontFamily:
                                    "var(--font-mono), ui-monospace, monospace",
                            }}
                        >
                            {diffLoading ? "加载中…" : diffText}
                        </pre>
                    </Section>
                ) : null}
            </div>

            <div
                className="shrink-0 border-t px-3 py-2"
                style={{ borderColor: "var(--border)" }}
            >
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="提交说明（commit message）"
                    rows={2}
                    className="mb-2 w-full resize-none rounded-md px-2 py-1.5 text-[12px] outline-none"
                    style={{
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                    }}
                />
                <div className="flex items-center gap-2">
                    <ActionButton
                        label={busyAction === "commit" ? "提交中…" : "Commit"}
                        primary
                        disabled={
                            busyAction != null ||
                            message.trim().length === 0 ||
                            stagedFiles.length === 0
                        }
                        onClick={() =>
                            void runAction("commit", async () => {
                                const result = await commitGitChanges(
                                    message.trim(),
                                );
                                setMessage("");
                                const hash = result.commitHash?.trim();
                                setNotice(
                                    hash
                                        ? `本地已提交 ${hash}。远端暂不可见，请再点 Push。`
                                        : "本地已提交。远端暂不可见，请再点 Push。",
                                );
                            })
                        }
                    />
                    <span
                        className="text-[10px]"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Commit 只写本地；Push 后远端才可见
                    </span>
                </div>
            </div>
        </div>
    );
}

function PanelHeader({
    title,
    loading,
    onRefresh,
}: {
    title: string;
    loading?: boolean;
    onRefresh?: () => void;
}) {
    return (
        <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
            >
                {title}
            </span>
            {onRefresh ? (
                <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh"
                    className="rounded px-1.5 text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                    disabled={loading}
                >
                    {loading ? "…" : "↻"}
                </button>
            ) : null}
        </div>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex h-full flex-col overflow-hidden">
            <PanelHeader title={title} />
            <div
                className="px-4 py-6 text-[12px] leading-5"
                style={{ color: "var(--text-secondary)" }}
            >
                {body}
            </div>
        </div>
    );
}

function Section({
    title,
    actions,
    children,
}: {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="mb-3">
            <div className="mb-1 flex items-center gap-1 px-2">
                <span
                    className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}
                >
                    {title}
                </span>
                <div className="flex shrink-0 items-center gap-1">{actions}</div>
            </div>
            {children}
        </div>
    );
}

function Muted({ children }: { children: ReactNode }) {
    return (
        <div
            className="px-3 py-1 text-[11px]"
            style={{ color: "var(--text-secondary)" }}
        >
            {children}
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    disabled,
    primary,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    primary?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium disabled:opacity-40"
            style={{
                color: primary ? "var(--accent)" : "var(--text-secondary)",
                border: primary
                    ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)"
                    : "1px solid transparent",
                background: primary
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : "transparent",
            }}
        >
            {label}
        </button>
    );
}

function FileRow({
    file,
    selected,
    showCheckbox,
    onToggleSelect,
    onOpen,
    onToggleDiff,
}: {
    file: GitFileStatus;
    selected: boolean;
    showCheckbox: boolean;
    onToggleSelect?: () => void;
    onOpen: () => void;
    onToggleDiff: () => void;
}) {
    return (
        <div
            className="group flex items-center gap-1 rounded-md px-2 py-1"
            style={{
                background: selected
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : "transparent",
            }}
        >
            {showCheckbox ? (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelect}
                    className="shrink-0"
                    aria-label={`Select ${file.path}`}
                />
            ) : null}
            <span
                className="w-4 shrink-0 text-center text-[10px] font-semibold"
                style={{ color: statusColor(file) }}
                title={file.status}
            >
                {statusLabel(file)}
            </span>
            <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-[12px]"
                style={{ color: "var(--text-primary)" }}
                title={file.path}
                onClick={onOpen}
            >
                {file.path}
            </button>
            <button
                type="button"
                className="shrink-0 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100"
                style={{ color: "var(--text-secondary)" }}
                onClick={onToggleDiff}
                title="View diff"
            >
                diff
            </button>
        </div>
    );
}
