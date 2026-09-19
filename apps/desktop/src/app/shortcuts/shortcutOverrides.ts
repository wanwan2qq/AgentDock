import { create } from "zustand";
import {
    safeStorageGetItem,
    safeStorageSetItem,
} from "../utils/safeStorage";
import type { ShortcutActionId, ShortcutBinding, ShortcutModifier } from "./registry";

const STORAGE_KEY = "neverwrite:shortcutOverrides";
const MODIFIERS: readonly ShortcutModifier[] = ["meta", "ctrl", "alt", "shift"];

export type ShortcutOverrideMap = Partial<
    Record<ShortcutActionId, ShortcutBinding>
>;

function normalizeBinding(value: unknown): ShortcutBinding | null {
    if (!value || typeof value !== "object") return null;
    const record = value as { key?: unknown; modifiers?: unknown };
    if (typeof record.key !== "string" || record.key.trim() === "") return null;
    const key =
        record.key.length === 1 ? record.key.toLowerCase() : record.key;
    const modifiers = Array.isArray(record.modifiers)
        ? record.modifiers.filter((modifier): modifier is ShortcutModifier =>
              MODIFIERS.includes(modifier as ShortcutModifier),
          )
        : [];
    return modifiers.length > 0 ? { key, modifiers } : { key };
}

function readOverrides(): ShortcutOverrideMap {
    try {
        const raw = safeStorageGetItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return {};
        const next: ShortcutOverrideMap = {};
        for (const [id, value] of Object.entries(parsed)) {
            const binding = normalizeBinding(value);
            if (!binding) continue;
            next[id as ShortcutActionId] = binding;
        }
        return next;
    } catch {
        return {};
    }
}

function writeOverrides(overrides: ShortcutOverrideMap) {
    safeStorageSetItem(STORAGE_KEY, JSON.stringify(overrides));
}

interface ShortcutOverrideStore {
    overrides: ShortcutOverrideMap;
    revision: number;
    setOverride: (id: ShortcutActionId, binding: ShortcutBinding) => void;
    clearOverride: (id: ShortcutActionId) => void;
    clearAll: () => void;
}

export const useShortcutOverrideStore = create<ShortcutOverrideStore>(
    (set, get) => ({
        overrides: readOverrides(),
        revision: 0,
        setOverride: (id, binding) => {
            const overrides = {
                ...get().overrides,
                [id]: normalizeBinding(binding) ?? binding,
            };
            writeOverrides(overrides);
            set({ overrides, revision: get().revision + 1 });
        },
        clearOverride: (id) => {
            if (!get().overrides[id]) return;
            const overrides = { ...get().overrides };
            delete overrides[id];
            writeOverrides(overrides);
            set({ overrides, revision: get().revision + 1 });
        },
        clearAll: () => {
            if (Object.keys(get().overrides).length === 0) return;
            writeOverrides({});
            set({ overrides: {}, revision: get().revision + 1 });
        },
    }),
);
