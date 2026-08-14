/** User-facing ACP / runtime disconnect copy (Chinese). */

export const ACP_DISCONNECT_ZH = "助手连接已断开。";

export const ACP_RECONNECT_FAILED_ZH =
    "无法恢复此对话。可重试连接，或新建对话继续。";

export const ACP_SESSION_TIMEOUT_ZH =
    "助手连接超时（Cursor ACP 未在时限内响应）。可新建对话，或到设置里确认 Cursor 已登录后再重试。";

export const ACP_RECONNECTING_SAVED_ZH = "正在恢复已保存的对话…";

export const ACP_RECONNECTING_CONTEXT_ZH =
    "助手连接已断开，正在用已保存上下文重连…";

const RUNTIME_STDERR_MARKER = "\n\nRuntime stderr:\n";

function extractRuntimeStderr(message: string): string | null {
    const index = message.indexOf(RUNTIME_STDERR_MARKER);
    if (index < 0) return null;
    const stderr = message.slice(index + RUNTIME_STDERR_MARKER.length).trim();
    return stderr || null;
}

function baseMessageWithoutStderr(message: string): string {
    const index = message.indexOf(RUNTIME_STDERR_MARKER);
    if (index < 0) return message.trim();
    return message.slice(0, index).trim();
}

function diagnosticHint(message: string, stderr: string | null): string {
    const haystack = `${message}\n${stderr ?? ""}`.toLowerCase();
    if (
        haystack.includes("not logged") ||
        haystack.includes("unauthorized") ||
        haystack.includes("authentication") ||
        haystack.includes("unauthenticated") ||
        haystack.includes("please log in") ||
        haystack.includes("login required") ||
        haystack.includes("auth required")
    ) {
        return "可能未登录或凭证失效，请到设置确认助手已登录后再重试。";
    }
    if (
        haystack.includes("enoent") ||
        haystack.includes("no such file") ||
        haystack.includes("not found") ||
        haystack.includes("command not found")
    ) {
        return "可能找不到助手可执行文件，请确认已安装并在 PATH 中。";
    }
    if (haystack.includes("permission denied")) {
        return "可能没有执行权限，请检查助手二进制的权限设置。";
    }
    if (stderr) {
        return "可查看下方诊断信息，或到设置检查助手配置。";
    }
    return "可新建对话，或到设置里确认助手已登录后再重试。";
}

function withOptionalDiagnostics(
    summary: string,
    stderr: string | null,
): string {
    if (!stderr) return summary;
    return `${summary}\n\n诊断信息：\n${stderr}`;
}

/**
 * Map known English runtime/ACP disconnect errors to Chinese.
 * Returns null when the message should pass through unchanged.
 */
export function localizeDisconnectOrRuntimeError(
    message: string,
): string | null {
    const stderr = extractRuntimeStderr(message);
    const base = baseMessageWithoutStderr(message);
    const normalized = base.toLowerCase();
    if (!normalized) return null;

    if (normalized.includes("could not reconnect this chat")) {
        return ACP_RECONNECT_FAILED_ZH;
    }

    if (normalized.includes("timed out waiting for the ai runtime")) {
        return withOptionalDiagnostics(
            `助手连接超时（未在时限内响应）。${diagnosticHint(message, stderr)}`,
            stderr,
        );
    }

    if (
        normalized.includes("startup disconnected before responding") ||
        normalized.includes("session startup disconnected")
    ) {
        return withOptionalDiagnostics(
            `助手启动中断。${diagnosticHint(message, stderr)}`,
            stderr,
        );
    }

    const exitStatusMatch = base.match(
        /(?:exited with status|exit(?:ed)?(?:\s+with)?(?:\s+status)?)\s+([^\n.]+)/i,
    );
    if (
        exitStatusMatch ||
        normalized.includes("acp process exited") ||
        normalized.includes("ai runtime process exited") ||
        normalized.includes("runtime process exited")
    ) {
        const statusPart = exitStatusMatch
            ? `（状态 ${exitStatusMatch[1].trim()}）`
            : "";
        return withOptionalDiagnostics(
            `助手进程已退出${statusPart}。${diagnosticHint(message, stderr)}`,
            stderr,
        );
    }

    if (
        normalized.includes("runtime disconnected") ||
        normalized.includes("ai runtime disconnected") ||
        normalized.includes("the ai runtime disconnected unexpectedly") ||
        normalized.includes("runtime session is not connected") ||
        normalized.includes("ai session not found") ||
        normalized.includes("resource_not_found")
    ) {
        if (!stderr) {
            const hint = diagnosticHint(message, null);
            if (
                hint.includes("未登录") ||
                hint.includes("找不到") ||
                hint.includes("权限")
            ) {
                return `${ACP_DISCONNECT_ZH}${hint}`;
            }
            return ACP_DISCONNECT_ZH;
        }
        return withOptionalDiagnostics(
            `${ACP_DISCONNECT_ZH}${diagnosticHint(message, stderr)}`,
            stderr,
        );
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
        trimmed.startsWith("助手连接") ||
        trimmed.startsWith("助手进程") ||
        trimmed.startsWith("助手启动")
    );
}
