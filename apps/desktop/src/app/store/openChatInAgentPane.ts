import { resolveAgentPaneForChat } from "./agentWorkspaceLayout";
import {
    getEffectivePaneWorkspace,
    isChatTab,
    useEditorStore,
} from "./editorStore";

interface OpenChatInAgentPaneOptions {
    title?: string;
    paneId?: string;
    insertIndex?: number;
    background?: boolean;
    historySessionId?: string | null;
    forceNewTab?: boolean;
}

function findExistingChatPaneId(
    sessionId: string,
    historySessionId?: string | null,
) {
    const workspace = getEffectivePaneWorkspace(useEditorStore.getState());
    for (const pane of workspace.panes) {
        for (const tab of pane.tabs) {
            if (
                isChatTab(tab) &&
                (tab.sessionId === sessionId ||
                    (historySessionId != null &&
                        tab.historySessionId === historySessionId))
            ) {
                return pane.id;
            }
        }
    }
    return null;
}

/** Open a chat tab using scheme A: prefer a dedicated agent pane (files | agent). */
export function openChatInAgentPane(
    sessionId: string,
    options?: OpenChatInAgentPaneOptions,
) {
    const editor = useEditorStore.getState();
    const existingPaneId = options?.forceNewTab
        ? null
        : findExistingChatPaneId(sessionId, options?.historySessionId);

    const paneId =
        options?.paneId ??
        existingPaneId ??
        resolveAgentPaneForChat(
            getEffectivePaneWorkspace(editor),
            (anchorPaneId) => editor.splitEditorPane("row", anchorPaneId),
        ) ??
        undefined;

    editor.openChat(sessionId, {
        ...options,
        paneId,
    });
}
