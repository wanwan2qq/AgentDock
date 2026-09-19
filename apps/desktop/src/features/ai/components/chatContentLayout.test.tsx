import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "../../../app/store/settingsStore";
import { useChatContentColumnStyle } from "./chatContentLayout";

function Probe() {
    const style = useChatContentColumnStyle();
    return <div data-testid="chat-column" style={style} />;
}

afterEach(() => {
    useSettingsStore.setState({ chatContentWidth: 600 });
});

describe("chat content width", () => {
    it("uses the global chat content width for the column", () => {
        useSettingsStore.setState({ chatContentWidth: 800 });
        const { getByTestId } = render(<Probe />);
        expect(getByTestId("chat-column").style.maxWidth).toBe("800px");
        expect(getByTestId("chat-column").style.width).toBe("100%");
    });
});
