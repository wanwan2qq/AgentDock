import { useEffect } from "react";
import {
    useVaultOpenDialogStore,
    type VaultOpenDisposition,
} from "../../app/store/vaultOpenDialogStore";

function dialogButtonStyle(variant: "primary" | "secondary" | "ghost") {
    if (variant === "primary") {
        return {
            backgroundColor: "var(--accent)",
            border: "1px solid color-mix(in srgb, var(--accent) 70%, transparent)",
            color: "#fff",
        } as const;
    }

    if (variant === "secondary") {
        return {
            background: "none",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
        } as const;
    }

    return {
        background: "none",
        border: "1px solid transparent",
        color: "var(--text-secondary)",
    } as const;
}

export function VaultOpenDispositionDialog() {
    const pending = useVaultOpenDialogStore((state) => state.pending);
    const resolve = useVaultOpenDialogStore((state) => state.resolve);

    useEffect(() => {
        if (!pending) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            resolve("cancelled");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pending, resolve]);

    if (!pending) {
        return null;
    }

    const choose = (disposition: VaultOpenDisposition) => {
        resolve(disposition);
    };

    return (
        <div
            className="absolute inset-0 z-[60] flex items-center justify-center p-6"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={() => choose("cancelled")}
            data-testid="vault-open-disposition-dialog"
        >
            <div
                className="mx-4 flex w-full max-w-md flex-col gap-4 rounded-lg p-4 shadow-lg"
                style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="vault-open-disposition-title"
            >
                <div className="flex flex-col gap-1">
                    <div
                        id="vault-open-disposition-title"
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                    >
                        打开仓库
                    </div>
                    <div
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        即将打开「{pending.vaultName}」。你想在新窗口打开，还是替换当前窗口？
                    </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => choose("cancelled")}
                        className="rounded px-3 py-1.5 text-xs font-medium"
                        style={dialogButtonStyle("ghost")}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={() => choose("replace")}
                        className="rounded px-3 py-1.5 text-xs font-medium"
                        style={dialogButtonStyle("secondary")}
                    >
                        替换当前窗口
                    </button>
                    <button
                        type="button"
                        onClick={() => choose("new-window")}
                        className="rounded px-3 py-1.5 text-xs font-medium"
                        style={dialogButtonStyle("primary")}
                    >
                        在新窗口打开
                    </button>
                </div>
            </div>
        </div>
    );
}
