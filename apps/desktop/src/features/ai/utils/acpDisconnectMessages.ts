/** User-facing ACP / runtime disconnect copy (Chinese). */

export const ACP_DISCONNECT_ZH = "助手连接已断开。";

export const ACP_RECONNECT_FAILED_ZH =
    "无法恢复此对话。可重试连接，或新建对话继续。";

export const ACP_SESSION_TIMEOUT_ZH =
    "助手连接超时（Cursor ACP 未在时限内响应）。可新建对话，或到设置里确认 Cursor 已登录后再重试。";

export const ACP_RECONNECTING_SAVED_ZH = "正在恢复已保存的对话…";

export const ACP_RECONNECTING_CONTEXT_ZH =
    "助手连接已断开，正在用已保存上下文重连…";

/**
 * Map known English runtime/ACP disconnect errors to Chinese.
 * Returns null when the message should pass through unchanged.
 */
export function localizeDisconnectOrRuntimeError(
    message: string,
): string | null {
    const normalized = message.trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes("could not reconnect this chat")) {
        return ACP_RECONNECT_FAILED_ZH;
    }
    if (normalized.includes("timed out waiting for the ai runtime")) {
        return ACP_SESSION_TIMEOUT_ZH;
    }
    if (
        normalized.includes("acp process exited") ||
        normalized.includes("runtime disconnected") ||
        normalized.includes("ai runtime disconnected") ||
        normalized.includes("the ai runtime disconnected unexpectedly") ||
        normalized.includes("runtime session is not connected") ||
        normalized.includes("ai session not found") ||
        normalized.includes("resource_not_found")
    ) {
        return ACP_DISCONNECT_ZH;
    }

    return null;
}

/** Errors that should show a 「重试连接」 action (same session resume). */
export function isReconnectableDisconnectMessage(message: string): boolean {
    const trimmed = message.trim();
    if (!trimmed) return false;
    if (localizeDisconnectOrRuntimeError(trimmed)) return true;
    return (
        trimmed === ACP_DISCONNECT_ZH ||
        trimmed === ACP_RECONNECT_FAILED_ZH ||
        trimmed === ACP_SESSION_TIMEOUT_ZH ||
        trimmed.startsWith("助手连接")
    );
}
