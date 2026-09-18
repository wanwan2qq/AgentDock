import test from "node:test";
import assert from "node:assert/strict";

import {
    CANONICAL_RELEASE_PAGES_BASE_URL,
    CANONICAL_RELEASE_REPO_SLUG,
    buildDebianPackageAssetName,
    buildRpmPackageAssetName,
    buildUpdaterReleaseAssetName,
    buildChannelAppcastUrl,
    buildGitHubPagesBaseUrl,
    buildPublicReleaseAssetName,
    createStaticAppcastManifest,
    describeRpmPackage,
    describeUpdaterArtifactKind,
    getCanonicalAppBundleName,
    getBundledUpdaterArtifactName,
    getAppcastPublishPath,
    getSignatureAssetName,
    normalizePlatformEntries,
    rpmArchForBuildTarget,
} from "./appcast-lib.mjs";

test("buildGitHubPagesBaseUrl returns the project pages base URL", () => {
    assert.equal(
        buildGitHubPagesBaseUrl(CANONICAL_RELEASE_REPO_SLUG),
        CANONICAL_RELEASE_PAGES_BASE_URL,
    );
});

test("getAppcastPublishPath returns channel/latest.json", () => {
    assert.equal(getAppcastPublishPath("stable"), "stable/latest.json");
    assert.equal(getAppcastPublishPath("beta"), "beta/latest.json");
});

test("buildChannelAppcastUrl joins the public base url and channel path", () => {
    assert.equal(
        buildChannelAppcastUrl(
            `${CANONICAL_RELEASE_PAGES_BASE_URL}/`,
            "stable",
        ),
        `${CANONICAL_RELEASE_PAGES_BASE_URL}/stable/latest.json`,
    );
});

test("buildPublicReleaseAssetName uses the human-facing naming convention", () => {
    assert.equal(
        buildPublicReleaseAssetName("0.2.0", "universal-apple-darwin"),
        "AgentDock_0.2.0_macOS_Universal.dmg",
    );
    assert.equal(
        buildPublicReleaseAssetName("0.2.0", "x86_64-pc-windows-msvc"),
        "AgentDock_0.2.0_Windows_x64_Setup.exe",
    );
    assert.equal(
        buildPublicReleaseAssetName("0.2.0", "x86_64-unknown-linux-gnu"),
        "AgentDock-0.2.0-x64.AppImage",
    );
});

test("buildDebianPackageAssetName uses Debian architecture names", () => {
    assert.equal(
        buildDebianPackageAssetName("0.2.0", "x86_64-unknown-linux-gnu"),
        "AgentDock-0.2.0-amd64.deb",
    );
    assert.equal(
        buildDebianPackageAssetName("0.2.0", "aarch64-unknown-linux-gnu"),
        "AgentDock-0.2.0-arm64.deb",
    );
    assert.throws(
        () => buildDebianPackageAssetName("0.2.0", "universal-apple-darwin"),
        /Debian packages are only supported/i,
    );
});

test("buildRpmPackageAssetName uses RPM architecture names", () => {
    assert.equal(
        buildRpmPackageAssetName("0.3.0", "x86_64-unknown-linux-gnu"),
        "AgentDock-0.3.0-x86_64.rpm",
    );
    assert.equal(
        buildRpmPackageAssetName("0.3.0", "aarch64-unknown-linux-gnu"),
        "AgentDock-0.3.0-aarch64.rpm",
    );
});

test("rpmArchForBuildTarget uses RPM conventions", () => {
    assert.equal(rpmArchForBuildTarget("x86_64-unknown-linux-gnu"), "x86_64");
    assert.equal(rpmArchForBuildTarget("aarch64-unknown-linux-gnu"), "aarch64");
});

test("describeRpmPackage returns human-readable RPM description", () => {
    assert.equal(
        describeRpmPackage("x86_64-unknown-linux-gnu"),
        "RPM package (.rpm) for x86_64",
    );
    assert.equal(
        describeRpmPackage("aarch64-unknown-linux-gnu"),
        "RPM package (.rpm) for aarch64",
    );
});

test("rpmArchForBuildTarget rejects non-Linux build targets", () => {
    assert.throws(
        () => rpmArchForBuildTarget("universal-apple-darwin"),
        /RPM packages are only supported/i,
    );
    assert.throws(
        () => rpmArchForBuildTarget("x86_64-pc-windows-msvc"),
        /RPM packages are only supported/i,
    );
});

test("describeUpdaterArtifactKind documents updater archive families", () => {
    assert.equal(
        describeUpdaterArtifactKind("universal-apple-darwin"),
        "macOS updater archive (.app.tar.gz)",
    );
    assert.equal(
        describeUpdaterArtifactKind("aarch64-pc-windows-msvc"),
        "Windows updater archive (.nsis.zip)",
    );
    assert.equal(
        getSignatureAssetName("AgentDock.app.tar.gz"),
        "AgentDock.app.tar.gz.sig",
    );
});

test("canonical bundle and updater artifact names are fixed for v1 release automation", () => {
    assert.equal(getCanonicalAppBundleName(), "AgentDock.app");
    assert.equal(
        getBundledUpdaterArtifactName("universal-apple-darwin"),
        "AgentDock.app.tar.gz",
    );
    assert.equal(
        getBundledUpdaterArtifactName("x86_64-pc-windows-msvc"),
        "AgentDock-setup.nsis.zip",
    );
    assert.equal(
        buildUpdaterReleaseAssetName("0.2.0", "universal-apple-darwin"),
        "AgentDock_0.2.0_macOS_Universal.app.tar.gz",
    );
    assert.equal(
        buildUpdaterReleaseAssetName("0.2.0", "x86_64-pc-windows-msvc"),
        "AgentDock_0.2.0_Windows_x64.nsis.zip",
    );
    assert.equal(
        getBundledUpdaterArtifactName("x86_64-unknown-linux-gnu"),
        "AgentDock-x64.AppImage",
    );
    assert.equal(
        buildUpdaterReleaseAssetName("0.2.0", "x86_64-unknown-linux-gnu"),
        "AgentDock-0.2.0-x64.AppImage",
    );
});

test("normalizePlatformEntries accepts build targets and emits appcast keys", () => {
    assert.deepEqual(
        normalizePlatformEntries({
            "aarch64-apple-darwin": {
                url: "https://example.com/macos-arm64.zip",
                signature: "sig-a",
            },
        }),
        {
            "darwin-universal": {
                url: "https://example.com/macos-arm64.zip",
                signature: "sig-a",
            },
        },
    );
});

test("createStaticAppcastManifest requires all v1 platform keys and preserves order", () => {
    const manifest = createStaticAppcastManifest({
        version: "v0.2.0",
        notes: "## Added\n\n- Apple Silicon appcast.",
        pubDate: "2026-04-04T18:00:00Z",
        platforms: {
            "aarch64-apple-darwin": {
                url: "https://example.com/macos-arm64.zip",
                signature: "sig-marm",
            },
        },
    });

    assert.deepEqual(Object.keys(manifest.platforms), ["darwin-universal"]);
    assert.equal(manifest.version, "0.2.0");
    assert.equal(manifest.pub_date, "2026-04-04T18:00:00Z");
    assert.equal(
        manifest.platforms["darwin-universal"].url,
        "https://example.com/macos-arm64.zip",
    );
});

test("createStaticAppcastManifest rejects missing v1 platforms", () => {
    assert.throws(
        () =>
            createStaticAppcastManifest({
                version: "0.2.0",
                notes: "- notes",
                pubDate: "2026-04-04T18:00:00Z",
                platforms: {},
            }),
        /missing required v1 platforms/i,
    );
});
