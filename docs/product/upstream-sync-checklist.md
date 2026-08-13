# 上游 NeverWrite 可合入清单

> 对照：[与 NeverWrite 差距](neverwrite-gap.md)、[内置 Agent 能力](agent-capability.md)  
> 上游：[jsgrrchg/NeverWrite](https://github.com/jsgrrchg/NeverWrite)  
> 本仓库分叉点：约 `28b9ad2`（2026-07-21，`#334`，上游仍为 0.5.0 线）  
> 上游当前：`aca9aaa`（2026-08-11，`#389`）；已发布 **v0.7.1**（2026-08-09）

## 一句话

AgentDock 远程 `main` 仍停在 `72a2386`；上游已领先约三周、跨 0.6 / 0.7。  
**不要整仓 rebase。** 按主题移植；先落本地未提交修复，再合对 Cursor/OpenCode 最有用的 ACP 稳定性与自定义 runtime。

## 合入前先做

本地未推送（会和上游 chat/vault/AI 大面积撞车）：

- [ ] 模型选择立刻反映 + Cursor `set_config_option` 旧值兜底
- [ ] 打开仓库 FSEvents watcher 死锁
- [ ] 打开 vault 不再自动建空聊天
- [ ] 提交并推送，再开上游移植分支

## 建议优先级

| 优先级 | 主题 | 上游锚点 | 对 AgentDock 的价值 | 风险 |
|--------|------|----------|---------------------|------|
| **P0** | ACP 空闲断线自动恢复 + 启动错误诊断 | `#368` `#372`，v0.7.0 | Cursor/OpenCode 会话挂死时现在只能重开；直接改善今天的痛点 | 中：会改 `chatStore` / sidecar AI |
| **P0** | 自定义 ACP runtime（设置里加任意可执行文件） | `#349`，v0.6.0 | 可把硬编码 Cursor ACP 收成「内置预设 + 通用自定义」；以后少 fork 一份 runtime | 高：设置页、runtime 注册、鉴权、打包 |
| **P1** | Claude ACP 升级（0.59 → 0.66） | `#321`…`#378` | 权限 scope 可见、session config 更稳；与我们模型切换路径相关 | 中：vendor + 协议边界 |
| **P1** | 设备本地聊天历史（新库默认） | v0.6.0 | 团队 Git vault 不把 transcript 提交进库，更符合小团队用法 | 中：存储路径、迁移 UI |
| **P2** | 可自定义全局快捷键 | `#364`，v0.7.0 | 体验加分；不挡 V1 Git | 低–中 |
| **P2** | 聊天宽度 / 半透明 composer / 流式代码块 | `#369` `#381` `#363` `#379` | UI 打磨 | 低；可能和分栏 Agent 布局打架 |
| **P2** | 内嵌 Codex/agent runtime → 0.147.0 | `#389`（v0.7.1 之后） | Codex 用户受益；体积与打包成本高 | **高**：V8/PTY/打包，暂缓 |
| **P3** | Vertex AI 作 Claude provider | v0.5.2 | 国内团队少用 | 低优先级 |
| **P3** | 依赖安全补丁（npm/cargo） | `#376` `#380` `#361` 等 | 应择机合，不要跟功能 PR 绑死 | 低；注意 lockfile |

上游仍**没有**内置 Git 面板——这块继续以 AgentDock 为准，不要被上游盖掉。

## 按版本看上游多了什么

相对分叉点（0.5.0 / `#334`）：

### 已在 AgentDock 侧大致有、或会冲突

| 上游 | AgentDock | 合入策略 |
|------|-----------|----------|
| composer 统一 Send/Queue/Stop（0.5.1） | 已有同类 composer | 只合 bugfix，不整页替换 |
| Live Preview code fence 打磨（0.5.1/0.5.2） | 可能部分已在分叉前/后 | diff 后按需 cherry-pick |
| per-vault AI review 开关（0.5.1） | 需确认是否已带 | 未带则 P1 合；已带则跳过 |
| Cursor ACP / Git 栏 / 左右 Agent / `new_tab` | **仅本仓库** | 上游无对应；移植时保护这些文件 |

### 0.5.1–0.5.2（7/23–7/24）— 可择优

- [ ] Codex Full Access 安全策略说明（0.5.1）
- [ ] inline review 在切 vault / 设置同步时的硬化（0.5.1）
- [ ] 打包后聊天搜索高亮丢失（0.5.1）
- [ ] Claude ACP 0.59→0.62、Opus 5 SDK、Vertex provider（0.5.2）— 与 P1 Claude 升级一并做

### 0.6.0（7/29）— 建议认真合

- [ ] **自定义 ACP runtime**（设置 > AI Providers）
- [ ] 新库默认 **设备本地 chat history**；vault 内/设备间迁移
- [ ] Claude ACP 0.63 / Agent SDK 0.3.220
- [ ] Claude tool activity（heartbeat / Bash meta / 拒绝原因）

### 0.7.0–0.7.1（8/08–8/09）— P0 稳定性 + P2 UI

- [ ] **ACP 空闲断线恢复**；未发送 prompt 不进 recovery context
- [ ] 重连失败时的启动诊断（脱敏）
- [ ] 全局快捷键 Settings > Shortcuts
- [ ] 聊天内容宽度 Appearance
- [ ] 半透明 composer、plan widget、流式 fence
- [ ] 滚动到底 / 面包屑过长
- [ ] 0.7.1：正式包 chat backdrop blur 丢失

### 0.7.1 之后（8/11）

- [ ] ~~立刻升 embedded runtime 0.147.0~~ → **暂缓**（打包/V8/Windows CRT），等 P0 ACP 稳了再评估

## 推荐落地顺序

1. **本周**：提交本地修复 → 开 `sync/upstream-acp-recovery` 只移植 `#368`/`#372`。  
2. **下一迭代**：`sync/custom-acp-runtimes`，把 Cursor 收成内置预设 + 上游通用自定义。  
3. **并行可选**：Claude ACP vendor 升级；chat history 改默认存设备。  
4. **不要**：一次性 merge `jsgrrchg/NeverWrite` `main`；不要先上 0.147.0 runtime。

## 冲突热点（移植时盯这些）

- `apps/desktop/native-backend/src/ai.rs`（Cursor runtime、模型 config option、ACP 协议）
- `apps/desktop/src/features/ai/store/chatStore.ts`
- `apps/desktop/src/features/ai/components/AIChatAgentControls.tsx`
- `apps/desktop/src/App.tsx`（vault 打开、默认不建聊天、分栏）
- `apps/desktop/native-backend/src/main.rs`（watcher 队列、Git invoke）
- 设置页 AI Providers / Shortcuts / Appearance
- 品牌与 userData：`NeverWrite` vs `AgentDock`

## 验收（每块移植单独过）

- [ ] Cursor ACP 仍能 login + 开会话
- [ ] 选模型 UI 立刻变化，且不会被 ACP 旧值打回
- [ ] 打开团队镜像库不再卡在 Scanning
- [ ] Git 栏 / pull-push 仍可用
- [ ] 打开 vault 不自动多出空聊天
- [ ] 自定义 runtime（若已合）能添加 OpenCode/Cursor 路径并重连
