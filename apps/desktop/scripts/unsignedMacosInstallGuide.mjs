import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const UNSIGNED_MACOS_INSTALL_GUIDE_NAME = "如何安装.txt";
export const UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME = "INSTALL.txt";
export const UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE = path.join(
    scriptDir,
    "..",
    "build",
    "unsigned-macos-install.txt",
);

function readUnsignedMacosInstallGuide() {
    if (!fs.existsSync(UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE)) {
        throw new Error(
            `Missing unsigned macOS install guide: ${UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE}`,
        );
    }

    return fs.readFileSync(UNSIGNED_MACOS_INSTALL_GUIDE_SOURCE);
}

export function copyUnsignedMacosInstallGuide(destinationDir) {
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.writeFileSync(
        path.join(destinationDir, UNSIGNED_MACOS_INSTALL_GUIDE_NAME),
        readUnsignedMacosInstallGuide(),
    );
}

export function addUnsignedMacosInstallGuideToZip(zipPath) {
    const tempDir = fs.mkdtempSync(
        path.join(path.dirname(zipPath), "unsigned-install-guide-"),
    );
    try {
        const guidePath = path.join(
            tempDir,
            UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME,
        );
        fs.writeFileSync(guidePath, readUnsignedMacosInstallGuide());
        const result = spawnSync(
            "python3",
            [
                "-c",
                [
                    "import sys, zipfile",
                    "zip_path, src, dest_name = sys.argv[1], sys.argv[2], sys.argv[3]",
                    "with zipfile.ZipFile(zip_path, 'a') as archive:",
                    "    if dest_name not in archive.namelist():",
                    "        archive.write(src, dest_name)",
                ].join("\n"),
                zipPath,
                guidePath,
                UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME,
            ],
            {
                encoding: "utf8",
                stdio: "pipe",
            },
        );
        if (result.status !== 0) {
            const output = [result.stdout, result.stderr]
                .filter(Boolean)
                .join("\n");
            throw new Error(
                `Failed to add ${UNSIGNED_MACOS_INSTALL_ZIP_GUIDE_NAME} to ${zipPath} (exit ${result.status}).\n${output}`,
            );
        }
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
