const TOOL_FAILURE_REASON_PREVIEW_CHARS = 140;

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
    return trimmed;
}

export function previewToolFailureReason(reason: string): string {
    if (reason.length <= TOOL_FAILURE_REASON_PREVIEW_CHARS) return reason;
    return `${reason.slice(0, TOOL_FAILURE_REASON_PREVIEW_CHARS - 1)}…`;
}
