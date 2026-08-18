import { beforeEach, describe, expect, it } from "vitest";
import { MIN_SIDEBAR_WIDTH, useLayoutStore } from "./layoutStore";

describe("layoutStore", () => {
    beforeEach(() => {
        useLayoutStore.setState({
            editorPaneSizes: [1],
            workspaceFocusPaneId: null,
            sidebarCollapsed: false,
        });
        localStorage.removeItem("neverwrite.sidebar.collapsed");
    });

    it("normalizes and persists editor pane proportions", () => {
        useLayoutStore.getState().setEditorPaneSizes(3, [2, 1, 1]);

        expect(useLayoutStore.getState().editorPaneSizes).toEqual([
            0.5, 0.25, 0.25,
        ]);
        expect(localStorage.getItem("neverwrite.editor-pane.sizes")).toBe(
            JSON.stringify([0.5, 0.25, 0.25]),
        );
    });

    it("supports more than three persisted editor pane proportions", () => {
        useLayoutStore.getState().setEditorPaneSizes(6, [3, 1, 1, 1, 1, 1]);

        expect(useLayoutStore.getState().editorPaneSizes).toEqual([
            3 / 8,
            1 / 8,
            1 / 8,
            1 / 8,
            1 / 8,
            1 / 8,
        ]);
        expect(localStorage.getItem("neverwrite.editor-pane.sizes")).toBe(
            JSON.stringify([3 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8]),
        );
    });

    it("clamps the sidebar width to its minimum", () => {
        useLayoutStore.getState().setSidebarWidth(120);

        expect(useLayoutStore.getState().sidebarWidth).toBe(MIN_SIDEBAR_WIDTH);
        expect(localStorage.getItem("neverwrite.sidebar.width")).toBe(
            String(MIN_SIDEBAR_WIDTH),
        );
    });

    it("toggles workspace focus without persisting it", () => {
        useLayoutStore.getState().enterWorkspaceFocus("primary");
        expect(useLayoutStore.getState().workspaceFocusPaneId).toBe("primary");
        expect(
            localStorage.getItem("neverwrite.sidebar.collapsed"),
        ).not.toBe("true");

        useLayoutStore.getState().toggleWorkspaceFocus("primary");
        expect(useLayoutStore.getState().workspaceFocusPaneId).toBeNull();
    });

    it("exits workspace focus when the sidebar is toggled", () => {
        useLayoutStore.setState({
            sidebarCollapsed: false,
            workspaceFocusPaneId: "primary",
        });

        useLayoutStore.getState().toggleSidebar();

        expect(useLayoutStore.getState().workspaceFocusPaneId).toBeNull();
        expect(useLayoutStore.getState().sidebarCollapsed).toBe(false);
    });
});
