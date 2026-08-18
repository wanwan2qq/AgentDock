import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openPath, revealItemInDir } from "@neverwrite/runtime";
import { useVaultStore } from "../../app/store/vaultStore";
import { toVaultRelativePath } from "../../app/utils/vaultPaths";
import { buildVaultAssetUrl } from "../../app/utils/filePreviewUrl";
import type { FileTab } from "../../app/store/editorStore";
import { useInternalDragIframeShield } from "./useInternalDragIframeShield";

const PREVIEW_LOAD_TIMEOUT_MS = 12_000;

export function HtmlTabView({ tab }: { tab: FileTab }) {
    const vaultPath = useVaultStore((state) => state.vaultPath);
    const iframeShieldActive = useInternalDragIframeShield();
    const [previewFailed, setPreviewFailed] = useState(false);
    const [previewFailedReason, setPreviewFailedReason] = useState<string | null>(
        null,
    );
    const loadTimerRef = useRef<number | null>(null);

    const previewUrl = useMemo(() => {
        const relative = toVaultRelativePath(tab.path, vaultPath);
        if (!relative) return null;
        return buildVaultAssetUrl(vaultPath, relative);
    }, [tab.path, vaultPath]);

    const clearLoadTimer = () => {
        if (loadTimerRef.current != null) {
            window.clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
    };

    useEffect(() => {
        setPreviewFailed(false);
        setPreviewFailedReason(null);
        clearLoadTimer();
        if (!previewUrl) return;
        loadTimerRef.current = window.setTimeout(() => {
            setPreviewFailed(true);
            setPreviewFailedReason("预览加载超时。可改用系统默认浏览器打开。");
            loadTimerRef.current = null;
        }, PREVIEW_LOAD_TIMEOUT_MS);
        return () => clearLoadTimer();
    }, [previewUrl]);

    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const attachIframeKeyHandler = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        let contentWindow: Window;
        try {
            contentWindow = iframe.contentWindow!;
            // Access check — will throw if cross-origin
            void contentWindow.document;
        } catch {
            return;
        }
        contentWindow.addEventListener(
            "keydown",
            (e: KeyboardEvent) => {
                if (e.ctrlKey || e.metaKey || e.altKey) {
                    const synthetic = new KeyboardEvent("keydown", {
                        key: e.key,
                        code: e.code,
                        ctrlKey: e.ctrlKey,
                        shiftKey: e.shiftKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        bubbles: true,
                        cancelable: true,
                    });
                    window.dispatchEvent(synthetic);
                    if (synthetic.defaultPrevented) {
                        e.preventDefault();
                    }
                }
            },
            true,
        );
    }, []);

    const showFallback = !previewUrl || previewFailed;

    return (
        <div className="h-full min-w-0 flex flex-col overflow-hidden">
            <div
                className="flex min-w-0 items-center justify-between gap-2 px-3 shrink-0 overflow-x-auto"
                style={{
                    height: 39,
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--bg-secondary)",
                }}
            >
                <div
                    className="min-w-0 truncate text-[11px]"
                    title={tab.relativePath}
                >
                    <span
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {tab.title}
                    </span>
                    <span
                        className="ml-1.5"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        {tab.relativePath}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => void openPath(tab.path)}
                        className="inline-flex items-center rounded px-1.5 text-[10px]"
                        style={headerButtonStyle}
                    >
                        用默认浏览器打开
                    </button>
                    <button
                        type="button"
                        onClick={() => void revealItemInDir(tab.path)}
                        className="inline-flex items-center rounded px-1.5 text-[10px]"
                        style={headerButtonStyle}
                    >
                        在访达中显示
                    </button>
                </div>
            </div>

            <div className="min-w-0 flex-1 overflow-hidden relative">
                {previewUrl ? (
                    <iframe
                        key={previewUrl}
                        title={tab.title}
                        src={previewUrl}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                        referrerPolicy="no-referrer"
                        ref={iframeRef}
                        onLoad={() => {
                            clearLoadTimer();
                            setPreviewFailed(false);
                            setPreviewFailedReason(null);
                            attachIframeKeyHandler();
                        }}
                        onError={() => {
                            clearLoadTimer();
                            setPreviewFailed(true);
                            setPreviewFailedReason(
                                "应用内预览失败。可改用系统默认浏览器打开。",
                            );
                        }}
                        style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            backgroundColor: "white",
                            pointerEvents: iframeShieldActive ? "none" : "auto",
                            visibility: showFallback ? "hidden" : "visible",
                        }}
                    />
                ) : null}

                {showFallback ? (
                    <div
                        className="absolute inset-0 flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
                        style={{
                            color: "var(--text-secondary)",
                            backgroundColor: "var(--bg-primary)",
                        }}
                    >
                        <p className="text-[13px] max-w-md">
                            {previewFailedReason ||
                                (!previewUrl
                                    ? "该文件不在当前知识库内，无法应用内预览。"
                                    : "应用内预览不可用。")}
                        </p>
                        <button
                            type="button"
                            onClick={() => void openPath(tab.path)}
                            className="inline-flex items-center rounded px-3 py-1.5 text-[12px]"
                            style={{
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--bg-secondary)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                            }}
                        >
                            用默认浏览器打开
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

const headerButtonStyle = {
    height: 22,
    border: "1px solid var(--border)",
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
} as const;
