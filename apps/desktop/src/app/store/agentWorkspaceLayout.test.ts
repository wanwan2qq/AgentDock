import { describe, expect, it } from "vitest";
import {
    findPreferredAgentPaneId,
    findPreferredFilePaneId,
    isChatOnlyPane,
    resolveAgentPaneForChat,
    resolveNonChatOpenTarget,
} from "./agentWorkspaceLayout";
import { createEditorPaneState } from "./editorWorkspace";
import { createChatTab, createFileTab } from "./editorTabs";
import { createInitialLayout } from "./workspaceLayoutTree";

function workspace(
    panes: ReturnType<typeof createEditorPaneState>[],
    focusedPaneId: string | null,
) {
    return {
        panes,
        focusedPaneId,
        layoutTree: createInitialLayout(panes[0]?.id ?? "primary"),
    };
}

describe("agentWorkspaceLayout", () => {
    it("detects chat-only panes", () => {
        const chatPane = createEditorPaneState("agent", {
            tabs: [createChatTab("s1", "Chat")],
            activeTabId: null,
        });
        const filePane = createEditorPaneState("files", {
            tabs: [
                createFileTab(
                    "a.md",
                    "a.md",
                    "/vault/a.md",
                    "hi",
                    "text/markdown",
                    "text",
                ),
            ],
            activeTabId: null,
        });
        expect(isChatOnlyPane(chatPane)).toBe(true);
        expect(isChatOnlyPane(filePane)).toBe(false);
    });

    it("prefers an existing chat-only pane for agent", () => {
        const files = createEditorPaneState("files", {
            tabs: [
                createFileTab(
                    "a.md",
                    "a.md",
                    "/vault/a.md",
                    "hi",
                    "text/markdown",
                    "text",
                ),
            ],
            activeTabId: null,
        });
        const agent = createEditorPaneState("agent", {
            tabs: [createChatTab("s1", "Chat")],
            activeTabId: null,
        });
        const state = workspace([files, agent], "files");
        expect(findPreferredAgentPaneId(state)).toBe("agent");
        expect(findPreferredFilePaneId(state)).toBe("files");
    });

    it("splits right of the file pane when no agent pane exists", () => {
        const files = createEditorPaneState("files", {
            tabs: [
                createFileTab(
                    "a.md",
                    "a.md",
                    "/vault/a.md",
                    "hi",
                    "text/markdown",
                    "text",
                ),
            ],
            activeTabId: null,
        });
        const state = workspace([files], "files");
        const splitCalls: string[] = [];
        const paneId = resolveAgentPaneForChat(state, (anchor) => {
            splitCalls.push(anchor);
            return "agent-new";
        });
        expect(paneId).toBe("agent-new");
        expect(splitCalls).toEqual(["files"]);
    });

    it("uses the sole empty pane without splitting", () => {
        const empty = createEditorPaneState("primary", {
            tabs: [],
            activeTabId: null,
        });
        const state = workspace([empty], "primary");
        const paneId = resolveAgentPaneForChat(state, () => {
            throw new Error("should not split");
        });
        expect(paneId).toBe("primary");
    });

    it("splits left of agent when opening non-chat content with only chat panes", () => {
        const agent = createEditorPaneState("agent", {
            tabs: [createChatTab("s1", "Chat")],
            activeTabId: null,
        });
        const state = workspace([agent], "agent");
        expect(resolveNonChatOpenTarget(state)).toEqual({
            kind: "split-left-of-agent",
            agentPaneId: "agent",
        });
    });
});
