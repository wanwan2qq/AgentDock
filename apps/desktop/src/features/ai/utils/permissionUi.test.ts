import { describe, expect, it } from "vitest";
import {
    formatPermissionDecisionStatus,
    localizePermissionMessageTitle,
    localizePermissionOptionLabel,
} from "./permissionUi";

describe("permissionUi", () => {
    it("localizes common ACP option kinds", () => {
        expect(
            localizePermissionOptionLabel({
                kind: "allow_once",
                name: "Allow once",
                option_id: "allow_once",
            }),
        ).toBe("允许一次");
        expect(
            localizePermissionOptionLabel({
                kind: "allow_always",
                name: "Allow always",
            }),
        ).toBe("始终允许");
        expect(
            localizePermissionOptionLabel({
                kind: "reject_once",
                name: "Reject",
            }),
        ).toBe("拒绝");
        expect(
            localizePermissionOptionLabel({
                kind: "reject_always",
                name: "Reject always",
            }),
        ).toBe("始终拒绝");
    });

    it("falls back to name mapping then original label", () => {
        expect(
            localizePermissionOptionLabel({
                kind: "custom",
                name: "Allow once",
            }),
        ).toBe("允许一次");
        expect(
            localizePermissionOptionLabel({
                kind: "custom_tool_choice",
                name: "Run with network",
            }),
        ).toBe("Run with network");
    });

    it("formats decision footer status in Chinese", () => {
        expect(formatPermissionDecisionStatus(true, null)).toBe(
            "正在发送决定…",
        );
        expect(formatPermissionDecisionStatus(false, "允许一次")).toBe(
            "已发送决定：允许一次",
        );
        expect(formatPermissionDecisionStatus(false, null)).toBe(
            "已发送决定。",
        );
    });

    it("localizes generic permission titles only", () => {
        expect(localizePermissionMessageTitle("Permission request")).toBe(
            "权限请求",
        );
        expect(localizePermissionMessageTitle("Edit watcher.rs")).toBe(
            "Edit watcher.rs",
        );
    });
});
