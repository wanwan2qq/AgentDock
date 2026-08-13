import type { AIRuntimeDescriptor } from "../types";

export const CLAUDE_TERMINAL_RUNTIME_ID = "claude-code-terminal";

interface RuntimeMetadata {
    id: string;
    name: string;
    company: string;
    description: string;
    capabilities: string[];
}

const RUNTIME_METADATA: RuntimeMetadata[] = [
    {
        id: "codex-acp",
        name: "Codex",
        company: "OpenAI",
        description: "Codex runtime embedded as an ACP sidecar.",
        capabilities: [
            "attachments",
            "permissions",
            "reasoning",
            "terminal_output",
            "create_session",
            "resume_session",
            "list_sessions",
            "user_input",
        ],
    },
    {
        id: "claude-acp",
        name: "Claude",
        company: "Anthropic",
        description: "Claude runtime exposed through the upstream ACP adapter.",
        capabilities: [
            "attachments",
            "permissions",
            "reasoning",
            "plans",
            "terminal_output",
            "create_session",
            "fork_session",
            "list_sessions",
            "prompt_queueing",
        ],
    },
    {
        id: "grok-acp",
        name: "Grok",
        company: "xAI",
        description: "Grok CLI running as a native ACP agent.",
        capabilities: [
            "attachments",
            "permissions",
            "plans",
            "terminal_output",
            "create_session",
        ],
    },
    {
        id: "kilo-acp",
        name: "Kilo",
        company: "Kilo Code",
        description: "Kilo CLI running as a native ACP agent.",
        capabilities: [
            "attachments",
            "permissions",
            "plans",
            "terminal_output",
            "create_session",
            "fork_session",
            "list_sessions",
        ],
    },
    {
        id: "opencode-acp",
        name: "OpenCode",
        company: "OpenCode",
        description: "OpenCode CLI running as a native ACP agent.",
        capabilities: [
            "attachments",
            "permissions",
            "plans",
            "terminal_output",
            "create_session",
            "prompt_queueing",
            "user_input",
        ],
    },
    {
        id: "cursor-acp",
        name: "Cursor",
        company: "Cursor",
        description: "Cursor CLI running as a native ACP agent (`agent acp`).",
        capabilities: [
            "attachments",
            "permissions",
            "plans",
            "terminal_output",
            "create_session",
        ],
    },
];

export const PROVIDER_CATALOG = [
    ...RUNTIME_METADATA.map(({ id, name, company }) => ({ id, name, company })),
    {
        id: CLAUDE_TERMINAL_RUNTIME_ID,
        name: "Claude Code",
        company: "Anthropic",
    },
];

export function getRuntimeDisplayName(
    runtimeId?: string | null,
    runtimeName?: string | null,
) {
    const explicitName = runtimeName?.trim();
    if (explicitName) {
        return explicitName.replace(/ ACP$/, "");
    }

    if (!runtimeId) {
        return "Assistant";
    }

    if (runtimeId === CLAUDE_TERMINAL_RUNTIME_ID) return "Claude Code";

    return (
        RUNTIME_METADATA.find((runtime) => runtime.id === runtimeId)?.name ??
        runtimeId
    );
}

/** Short Chinese guidance for the four primary assistants in Settings. */
export function getRuntimeGuidance(runtimeId?: string | null): string | null {
    switch (runtimeId) {
        case CLAUDE_TERMINAL_RUNTIME_ID:
            return "推荐路径：通过本机 Claude Code CLI 在内置终端协作。模型与权限等选项在「设置 → Terminal」。需本机已安装 `claude`。";
        case "claude-acp":
            return "Claude 的 ACP 适配路径，适合应用内会话与 review。订阅登录请用 Claude Code；此处通常配置 Anthropic API Key。";
        case "opencode-acp":
            return "OpenCode CLI 以 ACP 接入（`opencode acp`）。适合已有 OpenCode 配置的用户；稳定性因版本而异，可选。";
        case "cursor-acp":
            return "Cursor CLI 以 ACP 接入（`agent acp`）。先在本机执行 `agent login`，或设置 CURSOR_API_KEY / CURSOR_AUTH_TOKEN。";
        default:
            return null;
    }
}

export function buildFallbackRuntimeDescriptors(): AIRuntimeDescriptor[] {
    return RUNTIME_METADATA.map((runtime) => ({
        runtime: {
            id: runtime.id,
            name: `${runtime.name} ACP`,
            description: runtime.description,
            capabilities: [...runtime.capabilities],
        },
        models: [],
        modes: [],
        configOptions: [],
    }));
}
