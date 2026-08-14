import { describe, expect, it } from "vitest";
import {
    ACP_DISCONNECT_ZH,
    ACP_RECONNECT_FAILED_ZH,
    ACP_SESSION_TIMEOUT_ZH,
    isReconnectableDisconnectMessage,
    localizeDisconnectOrRuntimeError,
} from "./acpDisconnectMessages";

describe("acpDisconnectMessages", () => {
    it("localizes ACP exit and reconnect failures", () => {
        expect(
            localizeDisconnectOrRuntimeError("The ACP process exited."),
        ).toContain("助手进程已退出");
        expect(
            localizeDisconnectOrRuntimeError(
                "Could not reconnect this chat. Start a new session with saved transcript context?",
            ),
        ).toBe(ACP_RECONNECT_FAILED_ZH);
        expect(
            localizeDisconnectOrRuntimeError(
                "Timed out waiting for the AI runtime to create a session after 60 seconds.",
            ),
        ).toContain("超时");
        expect(ACP_SESSION_TIMEOUT_ZH).toContain("超时");
        expect(localizeDisconnectOrRuntimeError("unrelated boom")).toBeNull();
    });

    it("keeps exit status and redacted stderr in Chinese diagnostics", () => {
        const localized = localizeDisconnectOrRuntimeError(
            [
                "The AI runtime process exited with status exit status: 1.",
                "",
                "Runtime stderr:",
                "Error: not logged in to Cursor",
            ].join("\n"),
        );
        expect(localized).toContain("助手进程已退出");
        expect(localized).toContain("状态");
        expect(localized).toContain("未登录");
        expect(localized).toContain("诊断信息");
        expect(localized).toContain("not logged in to Cursor");
    });

    it("marks disconnect copy as reconnectable", () => {
        expect(isReconnectableDisconnectMessage(ACP_DISCONNECT_ZH)).toBe(true);
        expect(
            isReconnectableDisconnectMessage("The ACP process exited."),
        ).toBe(true);
        expect(
            isReconnectableDisconnectMessage(
                "助手进程已退出（状态 exit status: 1）。可查看下方诊断信息。",
            ),
        ).toBe(true);
        expect(isReconnectableDisconnectMessage("Provider quota reached")).toBe(
            false,
        );
    });
});
