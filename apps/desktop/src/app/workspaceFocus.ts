import {
    selectFocusedPaneId,
    selectLeafPaneIds,
    useEditorStore,
} from "./store/editorStore";
import { useLayoutStore } from "./store/layoutStore";

export function resolveWorkspaceFocusPaneId(
    tabId?: string | null,
): string | null {
    const editor = useEditorStore.getState();
    const leafPaneIds = selectLeafPaneIds(editor);

    if (tabId) {
        const pane = editor.panes.find((candidate) =>
            candidate.tabIds.includes(tabId),
        );
        if (pane && leafPaneIds.includes(pane.id)) {
            return pane.id;
        }
    }

    const focusedPaneId = selectFocusedPaneId(editor);
    return focusedPaneId && leafPaneIds.includes(focusedPaneId)
        ? focusedPaneId
        : (leafPaneIds[0] ?? null);
}

export function toggleWorkspaceFocusMode(tabId?: string | null) {
    const paneId = resolveWorkspaceFocusPaneId(tabId);
    if (!paneId) {
        return;
    }

    const layout = useLayoutStore.getState();
    if (layout.workspaceFocusPaneId === paneId) {
        layout.exitWorkspaceFocus();
        return;
    }

    useEditorStore.getState().focusPane(paneId);
    layout.enterWorkspaceFocus(paneId);
}

export function exitWorkspaceFocusMode() {
    useLayoutStore.getState().exitWorkspaceFocus();
}
