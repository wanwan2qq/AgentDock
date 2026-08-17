import { describe, expect, it } from "vitest";
import {
    isReadBeforeWriteHarnessError,
    previewToolFailureReason,
    READ_BEFORE_WRITE_STATE_LABEL,
    resolveToolFailureReason,
    unwrapToolUseError,
} from "./toolFailureReason";

describe("toolFailureReason", () => {
    it("keeps ACP rejection reasons and drops title-only content", () => {
        expect(
            resolveToolFailureReason(
                "Permission denied writing /vault/secret.md",
                { title: "Edit secret.md", label: "Updated" },
            ),
        ).toBe("Permission denied writing /vault/secret.md");
        expect(
            resolveToolFailureReason("Edit secret.md", {
                title: "Edit secret.md",
            }),
        ).toBeNull();
        expect(resolveToolFailureReason("   ")).toBeNull();
    });

    it("truncates long reasons for the collapsed preview", () => {
        const long = "x".repeat(200);
        const preview = previewToolFailureReason(long);
        expect(preview.endsWith("…")).toBe(true);
        expect(preview.length).toBe(140);
        expect(previewToolFailureReason("short reason")).toBe("short reason");
    });

    it("unwraps tool_use_error markup and detects read-before-write harness errors", () => {
        const wrapped =
            "<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>";
        expect(unwrapToolUseError(wrapped)).toBe(
            "File has not been read yet. Read it first before writing to it.",
        );
        expect(isReadBeforeWriteHarnessError(wrapped)).toBe(true);
        expect(
            resolveToolFailureReason(wrapped, { title: "Updated FAQ.md" }),
        ).toBe(
            "File has not been read yet. Read it first before writing to it.",
        );
        expect(
            isReadBeforeWriteHarnessError("Command exited with status 1"),
        ).toBe(false);
        expect(READ_BEFORE_WRITE_STATE_LABEL).toBe("Needs read first");
    });
});
