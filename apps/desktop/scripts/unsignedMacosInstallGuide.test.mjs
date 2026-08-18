import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

import {
    UNSIGNED_MACOS_INSTALL_GUIDE_NAME,
    UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE,
    UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME,
    addUnsignedMacosInstallGuideToZip,
    copyUnsignedMacosInstallGuide,
} from "./unsignedMacosInstallGuide.mjs";

test("unsigned macOS install guide explains Gatekeeper bypass", () => {
    const contents = fs.readFileSync(
        UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE,
        "utf8",
    );

    assert.equal(UNSIGNED_MACOS_INSTALL_GUIDE_NAME, "如何安装.txt");
    assert.equal(UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME, "INSTALL.txt");
    assert.match(contents, /AgentDock/);
    assert.match(contents, /未签名/);
    assert.match(contents, /右键/);
    assert.match(contents, /xattr -cr \/Applications\/AgentDock\.app/);
    assert.match(contents, /隐私与安全性/);
});

test("copies the unsigned install guide into a folder", () => {
    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "unsigned-macos-install-guide-"),
    );
    try {
        copyUnsignedMacosInstallGuide(tempDir);
        const copied = fs.readFileSync(
            path.join(tempDir, UNSIGNED_MACOS_INSTALL_GUIDE_NAME),
            "utf8",
        );
        assert.equal(
            copied,
            fs.readFileSync(UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE, "utf8"),
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("adds the unsigned install guide to a zip installer", () => {
    const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "unsigned-macos-install-zip-"),
    );
    try {
        const zipPath = path.join(tempDir, "AgentDock-unsigned.zip");
        execFileSync(
            "python3",
            [
                "-c",
                "import zipfile, sys; zipfile.ZipFile(sys.argv[1], 'w').writestr('payload.txt', 'app')",
                zipPath,
            ],
            { stdio: "pipe" },
        );

        addUnsignedMacosInstallGuideToZip(zipPath);

        const listing = execFileSync(
            "python3",
            [
                "-c",
                "import zipfile, sys; print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))",
                zipPath,
            ],
            { encoding: "utf8" },
        );
        assert.match(
            listing,
            new RegExp(`^${UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME}$`, "m"),
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
