import { describe, expect, it } from "vitest";
import { getTabStripInsertIndex, getTabStripScrollTarget } from "./tabStrip";

describe("getTabStripScrollTarget", () => {
    it("does not move when the active tab is already comfortably visible", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 100,
                stripWidth: 320,
                scrollWidth: 900,
                nodeLeft: 140,
                nodeWidth: 120,
            }),
        ).toBeNull();
    });

    it("reveals the minimum needed area when the active tab is at the far right", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 220,
                stripWidth: 320,
                scrollWidth: 900,
                nodeLeft: 500,
                nodeWidth: 120,
            }),
        ).toBe(312);
    });

    it("clamps the scroll target to the maximum available range", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 460,
                stripWidth: 320,
                scrollWidth: 800,
                nodeLeft: 730,
                nodeWidth: 120,
            }),
        ).toBe(480);
    });

    it("does not rewind scroll for pinned tabs that can stay frozen in view", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 200,
                stripWidth: 320,
                scrollWidth: 900,
                nodeLeft: 0,
                nodeWidth: 34,
                leadingInset: 68,
            }),
        ).toBeNull();
    });

    it("keeps a revealed tab clear of the sticky pinned cluster", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 100,
                stripWidth: 320,
                scrollWidth: 900,
                nodeLeft: 120,
                nodeWidth: 160,
                leadingInset: 68,
            }),
        ).toBe(40);
    });

    it("still reveals a far-right tab when a pinned cluster is docked on the left", () => {
        expect(
            getTabStripScrollTarget({
                stripLeft: 0,
                stripWidth: 320,
                scrollWidth: 900,
                nodeLeft: 400,
                nodeWidth: 160,
                leadingInset: 68,
            }),
        ).toBe(252);
    });
});

describe("getTabStripInsertIndex", () => {
    it("inserts before the first tab when dropped near its leading half", () => {
        expect(
            getTabStripInsertIndex(150, [
                { left: 100, width: 160 },
                { left: 264, width: 160 },
            ]),
        ).toBe(0);
    });

    it("inserts between tabs when dropped past the first midpoint", () => {
        expect(
            getTabStripInsertIndex(280, [
                { left: 100, width: 160 },
                { left: 264, width: 160 },
            ]),
        ).toBe(1);
    });

    it("inserts at the end when dropped after the last midpoint", () => {
        expect(
            getTabStripInsertIndex(420, [
                { left: 100, width: 160 },
                { left: 264, width: 160 },
            ]),
        ).toBe(2);
    });
});
