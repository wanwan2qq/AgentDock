import { fireEvent, screen, waitFor } from "@testing-library/react";
import { invoke } from "@neverwrite/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeStorageRemoveItem } from "../../app/utils/safeStorage";
import { useVaultStore } from "../../app/store/vaultStore";
import { renderComponent } from "../../test/test-utils";
import { GitPanel } from "./GitPanel";
import { useGitStatusStore } from "./gitStatusStore";

const COLLAPSED_KEY = "neverwrite:gitSectionCollapsed";

describe("GitPanel sections", () => {
    beforeEach(() => {
        safeStorageRemoveItem(COLLAPSED_KEY);
        useVaultStore.setState({ vaultPath: "/vault" });
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === "git_get_status") {
                return {
                    isRepo: true,
                    branch: "main",
                    upstream: "origin/main",
                    ahead: 0,
                    behind: 0,
                    dirty: true,
                    hasGit: true,
                    neverwriteIgnored: true,
                    conflicts: [],
                    files: [
                        {
                            path: "staged.md",
                            status: "M",
                            staged: true,
                            unstaged: false,
                            untracked: false,
                            conflict: false,
                        },
                        {
                            path: "changed.md",
                            status: "M",
                            staged: false,
                            unstaged: true,
                            untracked: false,
                            conflict: false,
                        },
                    ],
                };
            }
            if (cmd === "git_list_branches") {
                return { current: "main", local: ["main"], remote: [] };
            }
            if (cmd === "git_log") {
                return {
                    branch: "main",
                    commits: [
                        {
                            hash: "abc123",
                            shortHash: "abc123",
                            subject: "记录一次提交",
                            author: "Ada",
                            date: new Date().toISOString(),
                        },
                    ],
                };
            }
            return {};
        });
    });

    afterEach(() => {
        useGitStatusStore.getState().setVaultPath(null);
        useVaultStore.setState({ vaultPath: null });
        safeStorageRemoveItem(COLLAPSED_KEY);
    });

    it("collapses and expands history, staged files, and changes", async () => {
        renderComponent(<GitPanel />);

        expect(await screen.findByText("记录一次提交")).toBeInTheDocument();
        expect(screen.getByText("staged.md")).toBeInTheDocument();
        expect(screen.getByText("changed.md")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "折叠提交历史" }));
        expect(screen.queryByText("记录一次提交")).not.toBeInTheDocument();
        expect(screen.getByText("staged.md")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "展开提交历史" }));
        expect(screen.getByText("记录一次提交")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "折叠已暂存" }));
        expect(screen.queryByText("staged.md")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "取消暂存" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "折叠更改" }));
        expect(screen.queryByText("changed.md")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "暂存所选" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "展开更改" }));
        expect(screen.getByText("changed.md")).toBeInTheDocument();
    });

    it("keeps collapsed sections collapsed after the panel remounts", async () => {
        const view = renderComponent(<GitPanel />);
        fireEvent.click(await screen.findByRole("button", { name: "折叠提交历史" }));
        view.unmount();

        renderComponent(<GitPanel />);
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "展开提交历史" }),
            ).toHaveAttribute("aria-expanded", "false");
        });
        expect(screen.queryByText("记录一次提交")).not.toBeInTheDocument();
    });
});
