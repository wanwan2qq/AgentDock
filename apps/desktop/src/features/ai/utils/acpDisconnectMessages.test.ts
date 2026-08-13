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
        ).toBe(ACP_DISCONNECT_ZH);
        expect(
            localizeDisconnectOrRuntimeError(
                "Could not reconnect this chat. Start a new session with saved transcript context?",
            ),
        ).toBe(ACP_RECONNECT_FAILED_ZH);
        expect(
            localizeDisconnectOrRuntimeError(
                "Timed out waiting for the AI runtime to create a session after 60 seconds.",
            ),
        ).toBe(ACP_SESSION_TIMEOUT_ZH);
        expect(ACP_SESSION_TIMEOUT_ZH).toContain("超时");
        expect(localizeDisconnectOrRuntimeError("unrelated boom")).toBeNull();
    });

    it("marks disconnect copy as reconnectable", () => {
        expect(isReconnectableDisconnectMessage(ACP_DISCONNECT_ZH)).toBe(true);
        expect(
            isReconnectableDisconnectMessage("The ACP process exited."),
        ).toBe(true);
        expect(isReconnectableDisconnectMessage("Provider quota reached")).toBe(
            false,
        );
    });
});
