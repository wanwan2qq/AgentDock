# 内置 Agent 与主流编程助手能力对比

> 对照：[需求定稿](requirements.md)（不自建助手，复用最先进能力）  
> 技术背景：见 [`../ai-runtime-setup.md`](../ai-runtime-setup.md)、[`../ai-change-control.md`](../ai-change-control.md)  
> 上游说明：[Discussion #83 Claude subscription / Agent SDK](https://github.com/jsgrrchg/NeverWrite/discussions/83)

## 核心结论

**NeverWrite / AgentDock 基本不自研「更强或更弱的 Agent 大脑」**，而是通过 **ACP（Agent Client Protocol）** 把主流助手嵌进桌面壳。

能力差异主要在 **接入形态与产品层**，不在模型智商本身。

| 层级 | 本应用（内置 ACP 路径） | Claude Code / OpenCode 原生命令行 |
|------|-------------------------|-----------------------------------|
| 推理与工具循环 | 仍是 Claude Agent SDK / OpenCode / Codex 等 | 同一类 runtime |
| 通信 | ACP 适配器（如 `claude-acp`） | 原生 TUI / CLI |
| 本应用多出的 | 多窗格、会话、附件、**按文件/hunk accept/reject** | 无这套知识库向 UI |
| 备用路径 | 侧栏/终端直接跑交互式 Claude Code | — |

一句话：**大脑 ≈ 主流助手；本应用 = 宿主 UI + 变更管控层。**

## 相对主流助手：哪里更强 / 更弱

### 本应用更强（产品层）

- **人审 Agent 改动**：inline review、Review 页、整文件/hunk 保留或拒绝——适合知识库  
- **多助手同工作区**：Claude / OpenCode / Codex / Cursor 等可切换，围着同一 vault  
- **知识库场景**：MD/CSV/HTML/图同窗；比纯代码仓库 CLI 更贴用法  
- **会话资产**：transcript、历史、fork/resume 等做进 App  

### 相对原生命令行可能更弱或受限

| 维度 | 内置 ACP 路径 | 原生 Claude Code / OpenCode CLI |
|------|---------------|----------------------------------|
| 完整交互体验 | 受 ACP 适配层约束 | 最完整（hooks、权限弹窗、部分 slash 等） |
| 生态能力 | 取决于适配器透传（MCP、skills、子 agent…） | 官方承诺的全量能力 |
| 计费（Claude） | 可能走 **Agent SDK / 第三方应用** 额度（政策有变，需关注） | 交互式 Claude Code 走常规订阅额度 |
| 自定义 Agent | runtime 列表偏硬编码（上游 #17） | 各自生态更开放 |
| Review 层 | **仅原生 ACP 集成有**；终端跑 Claude Code **接不上** 同一套 accept/reject | 无本应用 review，但能力不打折 |

维护者说明要点：

- 侧栏跑交互式 Claude Code 可当逃生舱，但会**绕过**本应用管控与 review  
- **change control 技术上做不到接到交互式终端**（仅 ACP 原生集成可用）

## 能力感对照

```text
模型智商 / 改文件 / 跑命令 / 读仓库
    内置 ACP  ≈  对应的 Claude Code / OpenCode / Codex
         （同一 runtime，经协议转发）

知识库人机审阅、多格式同窗、多 Agent 切换
    本应用  >  纯 CLI

Hooks、最新官方特性、完整 TUI、计费最「正统」
    原生 CLI  ≥  本应用 ACP 封装
```

**不是「内置 Agent 比 Claude Code 笨一截」**，而是 **「用同一类能力，换一套更适合 vault 的壳；封装层会吃掉一点完整度与计费确定性」**。

## 对产品策略的含义

| 诉求 | 建议 |
|------|------|
| 不自建助手 | ✅ 继续走 ACP / 终端复用主流 runtime |
| 助手能力尽量不打折 | 本机已登录 Claude Code / OpenCode；本应用是宿主不是替代大脑 |
| 知识库审阅体验 | 优先 **内置 ACP**，不要只开终端 |
| 绝对完整 Claude Code 或计费敏感 | 终端跑原生 CLI，接受失去 review |
| 团队 Git | 与 Agent 强弱无关，仍是产品缺口（见 [差距清单](neverwrite-gap.md)） |

**实用策略：** 日常知识库维护用内置 ACP + review；偶发重活 / 新特性 / 计费问题，同一 App 里切终端原生助手。
