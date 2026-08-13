/** User-facing permission / approval card copy (Chinese). */

export type PermissionOptionLike = {
    name?: string | null;
    kind?: string | null;
    option_id?: string | null;
};

const OPTION_BY_KEY: Record<string, string> = {
    allow: "允许",
    allow_once: "允许一次",
    allow_always: "始终允许",
    reject: "拒绝",
    reject_once: "拒绝",
    reject_always: "始终拒绝",
};

const OPTION_BY_NAME: Record<string, string> = {
    allow: "允许",
    "allow once": "允许一次",
    "allow always": "始终允许",
    "always allow": "始终允许",
    approve: "允许",
    yes: "允许",
    reject: "拒绝",
    "reject once": "拒绝",
    "reject always": "始终拒绝",
    "always reject": "始终拒绝",
    deny: "拒绝",
    no: "拒绝",
};

/** Map ACP permission option kind/name to Chinese; unknown labels pass through. */
export function localizePermissionOptionLabel(
    option: PermissionOptionLike,
): string {
    const kind = String(option.kind ?? "")
        .trim()
        .toLowerCase();
    const id = String(option.option_id ?? "")
        .trim()
        .toLowerCase();
    const name = String(option.name ?? "").trim();

    for (const key of [kind, id]) {
        if (!key) continue;
        if (OPTION_BY_KEY[key]) return OPTION_BY_KEY[key];
        if (key.startsWith("allow_always")) return "始终允许";
        if (key.startsWith("allow_once")) return "允许一次";
        if (key.startsWith("allow")) return "允许";
        if (key.startsWith("reject_always")) return "始终拒绝";
        if (key.startsWith("reject")) return "拒绝";
    }

    const byName = OPTION_BY_NAME[name.toLowerCase()];
    if (byName) return byName;

    return name || String(option.option_id ?? "").trim() || "选项";
}

export function formatPermissionDecisionStatus(
    isResponding: boolean,
    resolvedOptionLabel: string | null | undefined,
): string {
    if (isResponding) return "正在发送决定…";
    const label = resolvedOptionLabel?.trim();
    if (label) return `已发送决定：${label}`;
    return "已发送决定。";
}

/** Localize generic permission card titles; agent-specific titles pass through. */
export function localizePermissionMessageTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed || /^permission request$/i.test(trimmed)) {
        return "权限请求";
    }
    return trimmed;
}
