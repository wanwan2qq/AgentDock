const TOOL_FAILURE_REASON_PREVIEW_CHARS = 140;
const TOOL_USE_ERROR_RE =
    /<tool_use_error>\s*([\s\S]*?)\s*<\/tool_use_error>/i;
const READ_BEFORE_WRITE_RE = /file has not been read yet/i;

export const READ_BEFORE_WRITE_STATE_LABEL = "Needs read first";

export function unwrapToolUseError(content: string): string {
    const match = content.match(TOOL_USE_ERROR_RE);
    return (match?.[1] ?? content).trim();
}

export function isReadBeforeWriteHarnessError(
    content: string | null | undefined,
): boolean {
    if (!content) return false;
    return READ_BEFORE_WRITE_RE.test(unwrapToolUseError(content));
}

/**
 * Prefer ACP/tool `summary` already mapped onto message.content.
 * Skip titles that only repeat the row label so successful output stays compact.
 */
export function resolveToolFailureReason(
    content: string | null | undefined,
    options?: {
        title?: string | null;
        label?: string | null;
    },
): string | null {
    const trimmed = content?.trim() ?? "";
    if (!trimmed) return null;
    const title = options?.title?.trim() ?? "";
    const label = options?.label?.trim() ?? "";
    if (title && trimmed === title) return null;
    if (label && trimmed === label) return null;
    return unwrapToolUseError(trimmed) || trimmed;
}

export function previewToolFailureReason(reason: string): string {
    if (reason.length <= TOOL_FAILURE_REASON_PREVIEW_CHARS) return reason;
    return `${reason.slice(0, TOOL_FAILURE_REASON_PREVIEW_CHARS - 1)}…`;
}
