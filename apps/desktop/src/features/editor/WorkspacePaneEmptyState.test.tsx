import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatShortcutAction } from "../../app/shortcuts/format";
import { useEditorStore } from "../../app/store/editorStore";
import { getDesktopPlatform } from "../../app/utils/platform";
import { renderComponent } from "../../test/test-utils";
import { WorkspacePaneEmptyState } from "./WorkspacePaneEmptyState";

const chatPaneMovementMock = vi.hoisted(() => ({
    createNewChatInWorkspace: vi.fn(async () => null),
}));

vi.mock("../ai/chatPaneMovement", () => chatPaneMovementMock);

describe("WorkspacePaneEmptyState", () => {
    beforeEach(() => {
        chatPaneMovementMock.createNewChatInWorkspace.mockClear();
        useEditorStore.getState().hydrateWorkspace(
            [
                {
                    id: "primary",
                    tabs: [],
                    activeTabId: null,
                },
            ],
            "primary",
        );
    });

    it("shows a compact Chinese empty state with shortcut hints and new-chat CTA", () => {
        const { container } = renderComponent(
            <WorkspacePaneEmptyState paneId="primary" />,
        );

        const text = container.textContent ?? "";
        expect(text).toContain("打开文件");
        expect(text).toContain("浏览命令");
        expect(text).toContain("开始对话");
        expect(text).toContain("打开终端");

        const hints = Array.from(
            container.querySelectorAll("kbd"),
            (kbd) => kbd.textContent,
        );
        const platform = getDesktopPlatform();
        expect(hints).toEqual([
            formatShortcutAction("quick_switcher", platform),
            formatShortcutAction("command_palette", platform),
            formatShortcutAction("new_agent", platform),
            formatShortcutAction("new_terminal", platform),
        ]);

        expect(
            screen.getByRole("button", { name: "新建对话" }),
        ).toBeInTheDocument();
    });

    it("creates a chat from the empty-state CTA", () => {
        renderComponent(<WorkspacePaneEmptyState paneId="primary" />);

        fireEvent.click(screen.getByRole("button", { name: "新建对话" }));

        expect(
            chatPaneMovementMock.createNewChatInWorkspace,
        ).toHaveBeenCalledTimes(1);
    });

    it("keeps pane identity marker for drop and targeting logic", () => {
        renderComponent(<WorkspacePaneEmptyState paneId="secondary" />);

        expect(
            document.querySelector("[data-workspace-empty-pane='secondary']"),
        ).toBeInTheDocument();
    });
});
