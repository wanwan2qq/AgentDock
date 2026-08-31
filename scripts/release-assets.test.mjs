import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    buildManualDownloadRows,
    buildReleaseBody,
    buildWebClipperReleaseAssetName,
    collectBundleArtifacts,
    requiredStagedResourcePaths,
    runtimeBinaryFileName,
    stageReleaseAssets,
    validateMacosBundleResources,
    validateStagedRuntimeResources,
} from "./release-assets-lib.mjs";

function withTempDir(callback) {
    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "neverwrite-release-assets-"),
    );
    try {
        callback(tempDir);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

test("runtimeBinaryFileName follows target platform conventions", () => {
    assert.equal(
        runtimeBinaryFileName("universal-apple-darwin", "codex-acp"),
        "codex-acp",
    );
    assert.equal(
        runtimeBinaryFileName("x86_64-pc-windows-msvc", "codex-acp"),
        "codex-acp.exe",
    );
    assert.equal(
        runtimeBinaryFileName("x86_64-unknown-linux-gnu", "codex-acp"),
        "codex-acp",
    );
});

test("validateStagedRuntimeResources checks bundled runtime staging inputs", () => {
    withTempDir((tempDir) => {
        for (const relativePath of requiredStagedResourcePaths(
            "x86_64-pc-windows-msvc",
        )) {
            const absolutePath = path.join(tempDir, relativePath);
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, "ok");
        }

        assert.doesNotThrow(() =>
            validateStagedRuntimeResources(tempDir, "x86_64-pc-windows-msvc"),
        );

        fs.rmSync(path.join(tempDir, "binaries", "codex-acp.exe"));
        assert.throws(
            () =>
                validateStagedRuntimeResources(
                    tempDir,
                    "x86_64-pc-windows-msvc",
                ),
            /Missing staged runtime resources/i,
        );
    });
});

test("buildManualDownloadRows exposes the public installer set for humans", () => {
    assert.deepEqual(buildManualDownloadRows("0.2.0"), [
        {
            buildTarget: "universal-apple-darwin",
            platformLabel: "macOS",
            architectureLabel: "Universal",
            recommendedAssetName: "AgentDock_0.2.0_macOS_Universal.dmg",
            portableAssetName: null,
        },
        {
            buildTarget: "aarch64-pc-windows-msvc",
            platformLabel: "Windows",
            architectureLabel: "ARM64",
            recommendedAssetName: "AgentDock_0.2.0_Windows_ARM64_Setup.exe",
            portableAssetName: null,
        },
        {
            buildTarget: "x86_64-pc-windows-msvc",
            platformLabel: "Windows",
            architectureLabel: "x64",
            recommendedAssetName: "AgentDock_0.2.0_Windows_x64_Setup.exe",
            portableAssetName: null,
        },
        {
            buildTarget: "aarch64-unknown-linux-gnu",
            platformLabel: "Linux Ubuntu/Debian",
            architectureLabel: "arm64",
            recommendedAssetName: "AgentDock-0.2.0-arm64.deb",
            portableAssetName: "AgentDock-0.2.0-arm64.AppImage",
        },
        {
            buildTarget: "x86_64-unknown-linux-gnu",
            platformLabel: "Linux Ubuntu/Debian",
            architectureLabel: "amd64",
            recommendedAssetName: "AgentDock-0.2.0-amd64.deb",
            portableAssetName: "AgentDock-0.2.0-x64.AppImage",
        },
        {
            buildTarget: "aarch64-unknown-linux-gnu",
            platformLabel: "Linux Fedora/RHEL",
            architectureLabel: "aarch64",
            recommendedAssetName: "AgentDock-0.2.0-aarch64.rpm",
            portableAssetName: null,
        },
        {
            buildTarget: "x86_64-unknown-linux-gnu",
            platformLabel: "Linux Fedora/RHEL",
            architectureLabel: "x86_64",
            recommendedAssetName: "AgentDock-0.2.0-x86_64.rpm",
            portableAssetName: null,
        },
    ]);
});

test("buildReleaseBody distinguishes manual installers from internal updater assets", () => {
    const body = buildReleaseBody(
        "0.2.0",
        "## Added\n\n- Manual packaging polish.",
    );
    assert.match(body, /## Manual installers/);
    assert.match(body, /AgentDock_0.2.0_macOS_Universal\.dmg/);
    assert.match(body, /AgentDock_0.2.0_Windows_x64_Setup\.exe/);
    assert.match(body, /AgentDock-0.2.0-amd64\.deb/);
    assert.match(body, /AgentDock-0.2.0-x64\.AppImage/);
    assert.match(body, /AgentDock-0\.2\.0-x86_64\.rpm/);
    assert.match(body, /configure the AgentDock DNF repository/);
    assert.match(body, /sudo tee \/etc\/yum\.repos\.d\/neverwrite\.repo/);
    assert.match(body, /repo_gpgcheck=1/);
    assert.match(body, /configure the AgentDock APT repository/);
    assert.match(body, /neverwrite-archive-keyring\.asc/);
    assert.match(body, /internal updater assets/i);
    assert.match(body, /## Browser extensions/);
    assert.match(
        body,
        /AgentDock-Web-Clipper-v0\.2\.0-chrome-mv3\.zip/,
    );
    assert.match(
        body,
        /AgentDock-Web-Clipper-v0\.2\.0-firefox-mv3\.zip/,
    );
    assert.match(body, /Mozilla-signed package/i);
    assert.match(body, /## Release notes/);
});

test("buildWebClipperReleaseAssetName names browser extension release zips", () => {
    assert.equal(
        buildWebClipperReleaseAssetName("0.2.0", "chrome"),
        "AgentDock-Web-Clipper-v0.2.0-chrome-mv3.zip",
    );
    assert.equal(
        buildWebClipperReleaseAssetName("v0.2.0", "firefox"),
        "AgentDock-Web-Clipper-v0.2.0-firefox-mv3.zip",
    );
    assert.throws(
        () => buildWebClipperReleaseAssetName("0.2.0", "safari"),
        /Unsupported web clipper browser/i,
    );
});

test("collectBundleArtifacts locates macOS bundles and updater archives", () => {
    withTempDir((tempDir) => {
        const dmgDir = path.join(tempDir, "dmg");
        const macosDir = path.join(tempDir, "macos");
        fs.mkdirSync(dmgDir, { recursive: true });
        fs.mkdirSync(macosDir, { recursive: true });

        fs.writeFileSync(path.join(dmgDir, "AgentDock.dmg"), "dmg");
        fs.writeFileSync(path.join(macosDir, "AgentDock.app.tar.gz"), "tar");
        fs.writeFileSync(
            path.join(macosDir, "AgentDock.app.tar.gz.sig"),
            "sig",
        );
        fs.mkdirSync(path.join(macosDir, "AgentDock.app"));

        const artifacts = collectBundleArtifacts(
            tempDir,
            "universal-apple-darwin",
        );
        assert.equal(
            path.basename(artifacts.manualAssetPath),
            "AgentDock.dmg",
        );
        assert.equal(
            path.basename(artifacts.updaterAssetPath),
            "AgentDock.app.tar.gz",
        );
        assert.equal(
            path.basename(artifacts.updaterSignaturePath),
            "AgentDock.app.tar.gz.sig",
        );
        assert.equal(path.basename(artifacts.appBundlePath), "AgentDock.app");
    });
});

test("validateMacosBundleResources ensures resources exist inside the app bundle", () => {
    withTempDir((tempDir) => {
        const appBundlePath = path.join(tempDir, "AgentDock.app");
        const resourcesDir = path.join(appBundlePath, "Contents", "Resources");
        for (const relativePath of requiredStagedResourcePaths(
            "universal-apple-darwin",
        )) {
            const absolutePath = path.join(resourcesDir, relativePath);
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, "ok");
        }

        assert.doesNotThrow(() =>
            validateMacosBundleResources(appBundlePath, "universal-apple-darwin"),
        );
    });
});

test("stageReleaseAssets renames manual installers and emits appcast metadata", () => {
    withTempDir((tempDir) => {
        const bundleRoot = path.join(tempDir, "bundle");
        const nsisDir = path.join(bundleRoot, "nsis");
        const outputDir = path.join(tempDir, "staged");
        fs.mkdirSync(nsisDir, { recursive: true });

        fs.writeFileSync(
            path.join(nsisDir, "AgentDock_0.2.0_x64-setup.exe"),
            "installer",
        );
        fs.writeFileSync(
            path.join(nsisDir, "AgentDock-setup.nsis.zip"),
            "updater",
        );
        fs.writeFileSync(
            path.join(nsisDir, "AgentDock-setup.nsis.zip.sig"),
            "sig-win-x64",
        );

        const metadata = stageReleaseAssets({
            bundleRoot,
            buildTarget: "x86_64-pc-windows-msvc",
            version: "0.2.0",
            tag: "v0.2.0",
            repoSlug: "wanwan2qq/AgentDock",
            outputDir,
        });

        assert.equal(
            metadata.manualAssetName,
            "AgentDock_0.2.0_Windows_x64_Setup.exe",
        );
        assert.equal(metadata.appcastKey, "windows-x86_64");
        assert.equal(
            metadata.updaterAssetName,
            "AgentDock_0.2.0_Windows_x64.nsis.zip",
        );
        assert.equal(
            metadata.updaterUrl,
            "https://github.com/wanwan2qq/AgentDock/releases/download/v0.2.0/AgentDock_0.2.0_Windows_x64.nsis.zip",
        );
        assert.equal(metadata.updaterSignature, "sig-win-x64");
        assert.ok(
            fs.existsSync(
                path.join(outputDir, "AgentDock_0.2.0_Windows_x64_Setup.exe"),
            ),
        );
        assert.ok(
            fs.existsSync(
                path.join(outputDir, "AgentDock_0.2.0_Windows_x64.nsis.zip"),
            ),
        );
        assert.ok(
            fs.existsSync(
                path.join(
                    outputDir,
                    "AgentDock_0.2.0_Windows_x64.nsis.zip.sig",
                ),
            ),
        );
    });
});

test("stageReleaseAssets fails fast when bundled updater assets do not follow the native AgentDock naming", () => {
    withTempDir((tempDir) => {
        const bundleRoot = path.join(tempDir, "bundle");
        const nsisDir = path.join(bundleRoot, "nsis");
        const outputDir = path.join(tempDir, "staged");
        fs.mkdirSync(nsisDir, { recursive: true });

        fs.writeFileSync(
            path.join(nsisDir, "AgentDock_0.2.0_x64-setup.exe"),
            "installer",
        );
        fs.writeFileSync(
            path.join(nsisDir, "AgentDock_0.2.0_x64.nsis.zip"),
            "updater",
        );
        fs.writeFileSync(
            path.join(nsisDir, "AgentDock_0.2.0_x64.nsis.zip.sig"),
            "sig-win-x64",
        );

        assert.throws(
            () =>
                stageReleaseAssets({
                    bundleRoot,
                    buildTarget: "x86_64-pc-windows-msvc",
                    version: "0.2.0",
                    tag: "v0.2.0",
                    repoSlug: "wanwan2qq/AgentDock",
                    outputDir,
                }),
            /Unexpected updater asset name/i,
        );
    });
});
