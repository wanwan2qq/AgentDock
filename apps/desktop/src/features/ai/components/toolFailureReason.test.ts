import { describe, expect, it } from "vitest";
import {
    previewToolFailureReason,
    resolveToolFailureReason,
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
});
