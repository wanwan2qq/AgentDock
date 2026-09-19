import type { CSSProperties } from "react";
import { useSettingsStore } from "../../../app/store/settingsStore";

export const AI_CHAT_CONTENT_MAX_WIDTH_PX = 600;
export const AI_CHAT_CONTENT_MIN_WIDTH_PX = 480;
export const AI_CHAT_CONTENT_WIDE_LIMIT_PX = 1100;

export function chatContentColumnStyle(maxWidthPx: number): CSSProperties {
    return {
        width: "100%",
        maxWidth: maxWidthPx,
        marginInline: "auto",
    };
}

export const AI_CHAT_CONTENT_COLUMN_STYLE = chatContentColumnStyle(
    AI_CHAT_CONTENT_MAX_WIDTH_PX,
);

export function useChatContentColumnStyle(): CSSProperties {
    const chatContentWidth = useSettingsStore((state) => state.chatContentWidth);
    return chatContentColumnStyle(chatContentWidth);
}
