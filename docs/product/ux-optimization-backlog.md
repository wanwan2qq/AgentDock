# AgentDock 体验优化 · 全貌与 Backlog

> 串行体验优化的总索引。详细执行表见各轮文档；本页回答「一共几轮、还剩什么」。  
> 原则：**影响面小、体感明显者优先**；大工程（ACP 框架 / 存储搬迁 / 上游整页合入）单列，不当作文案润色项。

## 轮次总览

| 轮次 | 文档 | 项数 | 状态 | 主题 |
|------|------|------|------|------|
| **第 1 轮** | [ux-optimization-plan.md](ux-optimization-plan.md) | 6 | **已完成**（3/4 跳过验证） | 开库、空态、断线、滚到底 |
| **第 2 轮** | [ux-optimization-plan-r2.md](ux-optimization-plan-r2.md) | 6 | **已完成** | Agent 高频决策与操作中文 |
| **第 3 轮** | [ux-optimization-plan-r3.md](ux-optimization-plan-r3.md) | 10 | **已完成** | 导航、历史、侧栏次面板、设置入口、终端 |
| **第 4 轮** | 本页 §4 | ~8（草案） | 候选 | 整页 Settings、搜索、笔记周边长尾 |
| **工程/上游** | [upstream-sync-checklist.md](upstream-sync-checklist.md) | — | 另线 | 稳定性与能力，非文案轮 |

另：第 2 轮期间插队修复 **Cursor 重连堆空「New chat」**（resume 删旧 ACP + initialize GC），属稳定性，不计入某一「文案项」序号。

---

## 1. 第 1 轮（已完成）

| # | 项 | 状态 |
|---|----|------|
| 1 | 空聊天引导中文 + 新建 CTA | 已通过 |
| 2 | 开库遮罩中文 + 诚实进度 | 已通过 |
| 3 | Git 忽略 `.neverwrite/` | 已跳过 |
| 4 | Tool 失败原因显示 | 已跳过 |
| 5 | ACP 断线中文 + 重试 | 已通过 |
| 6 | 长对话滚到底 | 已通过 |

---

## 2. 第 2 轮（进行中）

| # | 项 | 状态 |
|---|----|------|
| 1 | 权限/审批卡片中文 | 已通过 |
| 2 | Composer 占位 + 发送/停止/排队 | 待做 |
| 3 | Agents 侧栏筛选/菜单/删除确认 | 待做 |
| 4 | Git 面板 Pull/Push/Commit 等 | 待做 |
| 5 | 文件树右键核心菜单 | 待做 |
| 6 | 变更审阅 Keep/Reject/Review | 待做 |

---

## 3. 第 3 轮（已立项）

| # | 项 | 状态 |
|---|----|------|
| 1 | 侧栏主导航 Labels | 待做 |
| 2 | 对话历史 Restore/Export/搜索/空态 | 待做 |
| 3 | Find in chat | 待做 |
| 4 | 书签面板 | 待做 |
| 5 | 标签面板 | 待做 |
| 6 | 概念图面板 | 待做 |
| 7 | 设置分类导航 + AI 提供商首屏 | 待做 |
| 8 | 终端查找/右键/空态 | 待做 |
| 9 | Vault 切换器 + Settings 入口 | 待做 |
| 10 | 命令面板占位 + 快捷键标签层 | 待做 |

详见 [ux-optimization-plan-r3.md](ux-optimization-plan-r3.md)。

---

## 4. 第 4 轮（草案 · 文案/体验长尾）

> 第 3 轮后再拆正式串行表；此处先锁定「还要优化」清单，避免遗漏。

| 建议序 | 项 | 说明 | 体感 | 风险 |
|--------|----|------|------|------|
| 1 | **整页 Settings 正文** | General / Appearance / Editor / Vault / Updates 等表单项全文中文（第 3 轮只做分类名 + AI 首屏） | 高 | 中（文案面大） |
| 2 | **Vault 全文搜索页** | `Search files and notes…` / Advanced / 无结果 | 中高 | 低 |
| 3 | **文件树排序与次要菜单** | `Name (A–Z)` / `Date modified` 等（第 2 轮只做核心 CRUD） | 中 | 低 |
| 4 | **排队消息面板** | `Send now` / `Expand queue` / `Untitled message`（Composer 中文后的长尾） | 中 | 低 |
| 5 | **聊天上下文条** | `Remove all context notes` / Open in New Tab | 中 | 低 |
| 6 | **笔记链接面板** | Backlinks / Outgoing / Create Note / Copy Wikilink | 中 | 低 |
| 7 | **笔记状态 / OKF** | Draft / In review / Published | 中低 | 低 |
| 8 | **审阅 hunk / diff 细文案** | Accept/Reject hunk、Conflict、Partial、Show source diff（第 2 轮主条之后） | 中 | 低–中 |
| 9 | **编辑器 Find in Note** | 与聊天查找对称的中文 | 中 | 低 |
| 10 | **分栏空态** | `This pane is empty…` | 低 | 低 |
| 11 | **工具时间线状态词** | Running / Failed / Writing / Completed（若第 2 轮未顺带覆盖） | 中 | 低 |
| 12 | **「New chat」等默认标题中文** | 侧栏/历史默认名 `New chat`→「新对话」 | 中 | 低 |

---

## 5. 工程 / 上游（不当作「文案轮」，但产品仍需要）

对照 [upstream-sync-checklist.md](upstream-sync-checklist.md)：

| 优先级 | 项 | 价值 | 备注 |
|--------|----|------|------|
| P0 | ACP 空闲断线自动恢复 + 启动诊断 | Cursor/OpenCode 挂死可自愈 | 大于「重试」按钮；改 chatStore/sidecar |
| P0 | 自定义 ACP runtime（设置里加可执行文件） | Cursor 收成预设 + 通用自定义 | 高风险，单独分支 |
| P1 | 设备本地聊天历史（新库默认） | 团队 Git 不脏 vault | 与 ignore `.neverwrite` 互补 |
| P1 | Claude ACP vendor 升级 | 权限/配置更稳 | 跟模型切换路径相关 |
| P2 | 可自定义全局快捷键（能力，不只是标签中文） | 体验加分 | 第 3 轮只做 label |
| P2 | 聊天宽度 / 半透明 composer / 流式 fence | UI 打磨 | 可能与分栏打架 |
| 暂缓 | Codex embedded → 0.147 | 打包/V8 成本高 | 等 ACP 稳后再评 |
| 持续 | 依赖安全补丁 | 安全 | 不与功能 PR 绑死 |

**已插队、需验收**：Cursor 重连空「New chat」堆积修复（删旧 runtime session + initialize GC）。

---

## 6. 明确不做（当前产品边界）

- 自建大模型 / 自研 Agent 大脑  
- 企业级 ACL / CRDT 实时共编  
- 完整 PKM 插件生态  
- 一次性 merge 上游 NeverWrite `main`  
- 把 Vim 模式名（NORMAL/VISUAL）强行中文化（专业术语，低优先）

---

## 7. 建议执行节奏

```
第 1 轮 ✅ → 第 2 轮（当前）→ 第 3 轮 → 第 4 轮（长尾中文）
                ↘ 插队稳定性（空 New chat 等）
另线：upstream P0 ACP recovery / 自定义 runtime / 设备历史
```

1. **串行文案轮**：一次一项，你验「通过」再下一项。  
2. **工程线**：可与文案轮并行开分支，但不要和同一批 UI 文件打架。  
3. 第 4 轮在第 3 轮收尾时再写成独立 `ux-optimization-plan-r4.md`。

---

## 当前停在哪里

- **第 1–3 轮**：已完成。  
- **第 4 轮 + 工程**：见本页 §4 / §5，尚未拆执行表。
