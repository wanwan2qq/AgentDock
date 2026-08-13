import { describe, expect, it } from "vitest";
import {
    formatVaultOpenHeading,
    formatVaultOpenMessage,
    formatVaultOpenProgressDetail,
    formatVaultOpenSnapshotHint,
    formatVaultOpenStage,
} from "./vaultOpenUi";

describe("vaultOpenUi", () => {
    it("localizes known open messages and falls back for empty progress", () => {
        expect(formatVaultOpenHeading()).toBe("正在打开知识库");
        expect(
            formatVaultOpenMessage({
                message: "Preparing vault...",
                stage: "scanning",
                total: 0,
            }),
        ).toBe("正在扫描文件…");
        expect(
            formatVaultOpenMessage({
                message: "Scanning vault...",
                stage: "scanning",
                total: 0,
            }),
        ).toBe("正在扫描文件…");
        expect(
            formatVaultOpenMessage({
                message: "Vault ready",
                stage: "ready",
                total: 12,
            }),
        ).toBe("知识库已就绪");
    });

    it("shows honest progress text without inventing a percentage", () => {
        expect(
            formatVaultOpenProgressDetail({
                message: "Scanning vault...",
                processed: 0,
                total: 0,
            }),
        ).toBe("正在扫描文件…");
        expect(
            formatVaultOpenProgressDetail({
                message: "Indexing notes",
                processed: 3,
                total: 10,
            }),
        ).toBe("3 / 10 文件");
        expect(
            formatVaultOpenProgressDetail({
                message: "Resolving links",
                processed: 2,
                total: 5,
            }),
        ).toBe("2 / 5 链接");
    });

    it("localizes stages and snapshot hint", () => {
        expect(formatVaultOpenStage("scanning")).toBe("扫描中");
        expect(formatVaultOpenStage("indexing")).toBe("索引中");
        expect(formatVaultOpenSnapshotHint()).toContain("快照");
    });
});
