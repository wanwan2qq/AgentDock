import assert from "node:assert/strict";
import test from "node:test";

import {
    buildPlatformValidationMatrix,
    renderPlatformValidationChecklist,
    resolveValidationTarget,
    tamperFeedChecksum,
    validateTargetMetadataEntries,
} from "./platform-validation-lib.mjs";

function buildMetadataEntries() {
    return [
        {
            version: "0.2.0",
            buildTarget: "aarch64-apple-darwin",
            feedTarget: "darwin-universal",
            metadataFileName: "latest-mac.yml",
            feedRelativePath: "darwin-universal/latest-mac.yml",
            manualAssetName: "AgentDock_0.2.0_macOS_ARM64.dmg",
            updaterAssetName: "AgentDock_0.2.0_macOS_ARM64.zip",
            updaterBlockmapAssetName:
                "AgentDock_0.2.0_macOS_ARM64.zip.blockmap",
            updaterUrl:
                "https://github.com/wanwan2qq/AgentDock/releases/download/v0.2.0/AgentDock_0.2.0_macOS_ARM64.zip",
        },
    ];
}

test("resolveValidationTarget accepts Apple Silicon build and feed targets", () => {
    assert.deepEqual(resolveValidationTarget("aarch64-apple-darwin"), {
        buildTarget: "aarch64-apple-darwin",
        feedTarget: "darwin-universal",
        metadataFileName: "latest-mac.yml",
        updaterArtifactKind: "macOS updater archive (.zip)",
        platformLabel: "macOS",
        architectureLabel: "Apple Silicon",
    });
    assert.equal(
        resolveValidationTarget("darwin-universal").buildTarget,
        "aarch64-apple-darwin",
    );
});

test("validateTargetMetadataEntries accepts complete Apple Silicon coverage", () => {
    assert.doesNotThrow(() =>
        validateTargetMetadataEntries(buildMetadataEntries()),
    );
});

test("validateTargetMetadataEntries rejects reused updater URLs", () => {
    const entries = buildMetadataEntries();
    const duplicated = [
        ...entries,
        {
            buildTarget: "x86_64-pc-windows-msvc",
            feedTarget: "windows-x64",
            feedRelativePath: "windows-x64/latest.yml",
            updaterUrl: entries[0].updaterUrl,
            manualAssetName: "AgentDock_0.2.0_Windows_x64_Setup.exe",
            updaterAssetName: "AgentDock_0.2.0_Windows_x64_Setup.exe",
            updaterBlockmapAssetName:
                "AgentDock_0.2.0_Windows_x64_Setup.exe.blockmap",
        },
    ];

    assert.throws(
        () => validateTargetMetadataEntries(duplicated),
        /reuses updaterUrl/i,
    );
});

test("validateTargetMetadataEntries rejects incomplete target coverage", () => {
    assert.throws(
        () => validateTargetMetadataEntries([]),
        /non-empty array|No target metadata/i,
    );
});

test("buildPlatformValidationMatrix aligns feed URLs with target metadata", () => {
    const rows = buildPlatformValidationMatrix({
        version: "0.2.0",
        tag: "v0.2.0",
        channel: "stable",
        pagesBaseUrl: "https://wanwan2qq.github.io/AgentDock",
        metadataEntries: buildMetadataEntries(),
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].buildTarget, "aarch64-apple-darwin");
    assert.equal(rows[0].feedTarget, "darwin-universal");
    assert.equal(
        rows[0].feedUrl,
        "https://wanwan2qq.github.io/AgentDock/stable/darwin-universal/latest-mac.yml",
    );
    assert.equal(
        rows[0].updaterAssetName,
        "AgentDock_0.2.0_macOS_ARM64.zip",
    );
});

test("tamperFeedChecksum only modifies the sha512 line", () => {
    const tampered = tamperFeedChecksum(`
version: 0.2.0
path: https://example.com/AgentDock.zip
sha512: original
releaseDate: 2026-04-04T12:00:00.000Z
`);

    assert.match(tampered, /sha512: tampered/);
    assert.match(tampered, /version: 0\.2\.0/);
});

test("renderPlatformValidationChecklist includes invalid-checksum fixtures", () => {
    const markdown = renderPlatformValidationChecklist({
        rows: buildPlatformValidationMatrix({
            version: "0.2.0",
            tag: "v0.2.0",
            channel: "stable",
            pagesBaseUrl: "https://wanwan2qq.github.io/AgentDock",
            metadataEntries: buildMetadataEntries(),
        }),
        channel: "stable",
        version: "0.2.0",
        tag: "v0.2.0",
    });

    assert.match(
        markdown,
        /fixtures\/darwin-universal\/invalid-checksum\/stable\/latest-mac\.yml/,
    );
    assert.match(
        markdown,
        /The app does not switch to another architecture feed/,
    );
});
