import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, protocol, session } from "electron";
import { installNativeMenus, refreshDockMenu } from "./menu";
import { createAppWindow, getWindowByLabel } from "./window";
import { extractDeepLinksFromArgv, handleDeepLink } from "./deepLink";
import {
    registerIpcHandlers,
    registerPreviewProtocolHandler,
} from "./ipc";
import {
    initializeAppLogger,
    installConsoleLogCapture,
    installProcessDiagnostics,
    writeAppLog,
} from "./appLogger";
import { installYouTubeEmbedIdentityHeaders } from "./youtubeEmbedIdentity";

const APP_DISPLAY_NAME = "AgentDock";
const LEGACY_APP_DISPLAY_NAME = "NeverWrite";
const WINDOWS_APP_USER_MODEL_ID =
    process.env.NEVERWRITE_ELECTRON_APP_ID?.trim() || "com.neverwrite";

protocol.registerSchemesAsPrivileged([
    {
        scheme: "neverwrite-file",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
        },
    },
]);

function configureAppIdentity() {
    app.setName(APP_DISPLAY_NAME);
    // Keep existing NeverWrite userData so local settings/vaults still resolve.
    const appDataDir = app.getPath("appData");
    const legacyUserData = path.join(appDataDir, LEGACY_APP_DISPLAY_NAME);
    const brandedUserData = path.join(appDataDir, APP_DISPLAY_NAME);
    if (fs.existsSync(legacyUserData) && !fs.existsSync(brandedUserData)) {
        app.setPath("userData", legacyUserData);
    }
    if (process.platform === "win32") {
        app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
    }
    if (process.platform === "darwin") {
        app.setAboutPanelOptions({
            applicationName: APP_DISPLAY_NAME,
            applicationVersion: app.getVersion(),
        });
    }
}

configureAppIdentity();
initializeAppLogger(app.getPath("userData"));
installConsoleLogCapture();
installProcessDiagnostics();
writeAppLog("main", "info", `${APP_DISPLAY_NAME} main process starting`, {
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
});
app.setAsDefaultProtocolClient("neverwrite");

app.on("child-process-gone", (_event, details) => {
    writeAppLog("main", "error", "Electron child process gone", details);
});

app.on("open-url", (event, url) => {
    event.preventDefault();
    focusOrCreateMainWindow();
    handleDeepLink(url);
});

function focusOrCreateMainWindow() {
    const existing =
        BrowserWindow.getFocusedWindow() ??
        getWindowByLabel("main") ??
        BrowserWindow.getAllWindows()[0];

    if (existing) {
        if (existing.isMinimized()) existing.restore();
        existing.show();
        existing.focus();
        return existing;
    }

    return createAppWindow("main");
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
    app.quit();
} else {
    app.on("second-instance", (_event, argv) => {
        focusOrCreateMainWindow();
        for (const url of extractDeepLinksFromArgv(argv)) {
            handleDeepLink(url);
        }
    });

    void app.whenReady().then(() => {
        writeAppLog("main", "info", "Electron app ready");
        installYouTubeEmbedIdentityHeaders(session.defaultSession);
        protocol.handle("neverwrite-file", registerPreviewProtocolHandler());
        registerIpcHandlers();
        void installNativeMenus();
        createAppWindow("main");
        for (const url of extractDeepLinksFromArgv(process.argv)) {
            handleDeepLink(url);
        }

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createAppWindow("main");
            }
            void refreshDockMenu();
        });
    });
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
