import { isChatTab } from "./editorTabs";
import type { EditorPaneState, EditorWorkspaceState } from "./editorWorkspace";

type WorkspaceSlice = Pick<
    EditorWorkspaceState,
    "panes" | "focusedPaneId" | "layoutTree"
>;

export function isChatOnlyPane(pane: EditorPaneState): boolean {
    return pane.tabs.length > 0 && pane.tabs.every((tab) => isChatTab(tab));
}

export function findPreferredAgentPaneId(
    workspace: WorkspaceSlice,
): string | null {
    const chatOnly = workspace.panes.filter(isChatOnlyPane);
    if (chatOnly.length === 0) {
        return null;
    }
    if (
        workspace.focusedPaneId &&
        chatOnly.some((pane) => pane.id === workspace.focusedPaneId)
    ) {
        return workspace.focusedPaneId;
    }
    return chatOnly[chatOnly.length - 1]?.id ?? null;
}

export function findPreferredFilePaneId(
    workspace: WorkspaceSlice,
): string | null {
    const focused = workspace.panes.find(
        (pane) => pane.id === workspace.focusedPaneId,
    );
    if (focused && !isChatOnlyPane(focused)) {
        return focused.id;
    }

    const withNonChat = workspace.panes.filter((pane) =>
        pane.tabs.some((tab) => !isChatTab(tab)),
    );
    if (withNonChat.length > 0) {
        return withNonChat[0]?.id ?? null;
    }

    const nonChatOnly = workspace.panes.filter((pane) => !isChatOnlyPane(pane));
    return nonChatOnly[0]?.id ?? null;
}

/**
 * Resolve where a new chat tab should open (scheme A: files | agent).
 * `splitRight(anchorPaneId)` should create an empty pane to the right and
 * return its id.
 */
export function resolveAgentPaneForChat(
    workspace: WorkspaceSlice,
    splitRight: (anchorPaneId: string) => string | null,
): string | null {
    const existing = findPreferredAgentPaneId(workspace);
    if (existing) {
        return existing;
    }

    const filePaneId = findPreferredFilePaneId(workspace);
    const filePane = filePaneId
        ? (workspace.panes.find((pane) => pane.id === filePaneId) ?? null)
        : null;

    // Sole empty pane becomes the agent surface without splitting.
    if (
        workspace.panes.length === 1 &&
        filePane &&
        filePane.tabs.length === 0
    ) {
        return filePane.id;
    }

    // File content present → keep it on the left, open agent on the right.
    if (
        filePaneId &&
        filePane &&
        filePane.tabs.some((tab) => !isChatTab(tab))
    ) {
        return splitRight(filePaneId) ?? filePaneId;
    }

    if (filePaneId) {
        return filePaneId;
    }

    return workspace.focusedPaneId ?? workspace.panes[0]?.id ?? null;
}

export type NonChatOpenTarget =
    | { kind: "pane"; paneId: string }
    | { kind: "split-left-of-agent"; agentPaneId: string }
    | { kind: "focused" };

/** Resolve where a file/note/pdf tab should open so it avoids chat-only panes. */
export function resolveNonChatOpenTarget(
    workspace: WorkspaceSlice,
): NonChatOpenTarget {
    const filePaneId = findPreferredFilePaneId(workspace);
    if (filePaneId) {
        return { kind: "pane", paneId: filePaneId };
    }

    const agentPaneId = findPreferredAgentPaneId(workspace);
    if (agentPaneId) {
        return { kind: "split-left-of-agent", agentPaneId };
    }

    return { kind: "focused" };
}
