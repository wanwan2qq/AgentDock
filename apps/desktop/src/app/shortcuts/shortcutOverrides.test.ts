import { afterEach, describe, expect, it } from "vitest";
import {
    findShortcutConflict,
    formatShortcutAction,
    matchesShortcutAction,
} from "./registry";
import { useShortcutOverrideStore } from "./shortcutOverrides";

const noMods = {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
};

afterEach(() => {
    useShortcutOverrideStore.getState().clearAll();
});

describe("shortcut overrides", () => {
    it("replaces the primary binding and its aliases", () => {
        useShortcutOverrideStore.getState().setOverride("previous_tab", {
            key: "p",
            modifiers: ["meta", "shift"],
        });

        expect(
            matchesShortcutAction(
                { key: "p", ...noMods, metaKey: true, shiftKey: true },
                "previous_tab",
                "macos",
            ),
        ).toBe(true);
        expect(
            matchesShortcutAction(
                { key: "t", ...noMods, metaKey: true, altKey: true },
                "previous_tab",
                "macos",
            ),
        ).toBe(false);
        expect(
            matchesShortcutAction(
                { key: "tab", ...noMods, ctrlKey: true, shiftKey: true },
                "previous_tab",
                "macos",
            ),
        ).toBe(false);
        expect(formatShortcutAction("previous_tab", "macos")).toBe("⌘⇧P");
    });

    it("treats another action's current binding as a conflict, including overrides", () => {
        expect(
            findShortcutConflict(
                { key: "k", modifiers: ["meta"] },
                "quick_switcher",
                "macos",
            ),
        ).toBe("command_palette");

        useShortcutOverrideStore.getState().setOverride("command_palette", {
            key: "p",
            modifiers: ["meta", "shift"],
        });

        expect(
            findShortcutConflict(
                { key: "k", modifiers: ["meta"] },
                "quick_switcher",
                "macos",
            ),
        ).toBeNull();
        expect(
            findShortcutConflict(
                { key: "p", modifiers: ["meta", "shift"] },
                "quick_switcher",
                "macos",
            ),
        ).toBe("command_palette");
    });

    it("restores the platform default after the override is cleared", () => {
        useShortcutOverrideStore.getState().setOverride("command_palette", {
            key: "p",
            modifiers: ["meta", "shift"],
        });
        useShortcutOverrideStore.getState().clearOverride("command_palette");
        expect(formatShortcutAction("command_palette", "macos")).toBe("⌘K");
        expect(useShortcutOverrideStore.getState().overrides).toEqual({});
    });
});
