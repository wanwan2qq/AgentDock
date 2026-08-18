import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./store/editorStore";
import { useLayoutStore } from "./store/layoutStore";
import { toggleWorkspaceFocusMode } from "./workspaceFocus";

describe("workspaceFocus", () => {
    beforeEach(() => {
        useLayoutStore.setState({ workspaceFocusPaneId: null });
        useEditorStore.getState().hydrateWorkspace(
            [
                {
                    id: "primary",
                    tabs: [
                        {
                            id: "tab-a",
                            kind: "note",
                            noteId: "notes/a",
                            title: "Alpha",
                            content: "Alpha",
                        },
                    ],
                    activeTabId: "tab-a",
                },
                {
                    id: "secondary",
                    tabs: [
                        {
                            id: "tab-b",
                            kind: "note",
                            noteId: "notes/b",
                            title: "Beta",
                            content: "Beta",
                        },
                    ],
                    activeTabId: "tab-b",
                },
            ],
            "primary",
        );
    });

    it("enters focus for the pane that owns the tab", () => {
        toggleWorkspaceFocusMode("tab-b");

        expect(useLayoutStore.getState().workspaceFocusPaneId).toBe(
            "secondary",
        );
        expect(useEditorStore.getState().focusedPaneId).toBe("secondary");
    });

    it("exits focus when toggled again for the same pane", () => {
        toggleWorkspaceFocusMode("tab-a");
        toggleWorkspaceFocusMode("tab-a");

        expect(useLayoutStore.getState().workspaceFocusPaneId).toBeNull();
    });
});
