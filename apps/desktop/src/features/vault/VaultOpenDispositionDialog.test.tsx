import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultOpenDialogStore } from "../../app/store/vaultOpenDialogStore";
import { renderComponent } from "../../test/test-utils";
import { VaultOpenDispositionDialog } from "./VaultOpenDispositionDialog";

describe("VaultOpenDispositionDialog", () => {
    beforeEach(() => {
        useVaultOpenDialogStore.getState().reset();
    });

    it("renders the disposition choices for a pending vault", () => {
        useVaultOpenDialogStore.setState({
            pending: { path: "/vaults/demo", vaultName: "demo" },
            resolver: vi.fn(),
        });

        renderComponent(<VaultOpenDispositionDialog />);

        expect(screen.getByText(/即将打开「demo」/)).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "在新窗口打开" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "替换当前窗口" }),
        ).toBeInTheDocument();
    });

    it("resolves the selected disposition", () => {
        const resolve = vi.fn();
        useVaultOpenDialogStore.setState({
            pending: { path: "/vaults/demo", vaultName: "demo" },
            resolver: resolve,
        });

        renderComponent(<VaultOpenDispositionDialog />);
        fireEvent.click(
            screen.getByRole("button", { name: "替换当前窗口" }),
        );

        expect(resolve).toHaveBeenCalledWith("replace");
        expect(useVaultOpenDialogStore.getState().pending).toBeNull();
    });
});
