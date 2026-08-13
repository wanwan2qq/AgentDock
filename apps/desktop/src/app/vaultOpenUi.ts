import type { VaultOpenStage, VaultOpenState } from "./store/vaultStore";

const VAULT_OPEN_MESSAGE_ZH: Record<string, string> = {
    "Preparing vault...": "正在打开知识库…",
    "正在打开知识库…": "正在打开知识库…",
    "Scanning vault...": "正在扫描文件…",
    "Vault ready": "知识库已就绪",
    "Opening cancelled": "已取消打开",
    "Failed to open vault": "打开知识库失败",
};

const VAULT_OPEN_STAGE_ZH: Record<VaultOpenStage, string> = {
    idle: "准备中",
    scanning: "扫描中",
    parsing: "解析中",
    indexing: "索引中",
    saving_snapshot: "保存快照",
    ready: "就绪",
    error: "出错",
    cancelled: "已取消",
};

export function formatVaultOpenHeading(): string {
    return "正在打开知识库";
}

export function formatVaultOpenMessage(
    state: Pick<VaultOpenState, "message" | "stage" | "total">,
): string {
    const raw = state.message.trim();
    if (
        state.total <= 0 &&
        (!raw ||
            raw === "Preparing vault..." ||
            raw === "正在打开知识库…" ||
            raw === "Scanning vault...")
    ) {
        return "正在扫描文件…";
    }
    if (raw && VAULT_OPEN_MESSAGE_ZH[raw]) {
        return VAULT_OPEN_MESSAGE_ZH[raw]!;
    }
    if (!raw) {
        return "正在打开知识库…";
    }
    return raw;
}

export function formatVaultOpenStage(stage: VaultOpenStage): string {
    return VAULT_OPEN_STAGE_ZH[stage] ?? stage;
}

export function formatVaultOpenProgressDetail(
    state: Pick<VaultOpenState, "message" | "processed" | "total">,
): string {
    if (state.total <= 0) {
        return "正在扫描文件…";
    }

    const unit = state.message.toLowerCase().includes("link")
        ? "链接"
        : "文件";
    return `${state.processed.toLocaleString()} / ${state.total.toLocaleString()} ${unit}`;
}

export function formatVaultOpenSnapshotHint(): string {
    return "正在复用已保存的快照，并同步变更。";
}
