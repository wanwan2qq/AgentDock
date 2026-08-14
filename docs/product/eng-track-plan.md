# AgentDock 工程线计划（串行验证）

> 文案第 1–3 轮已完成；**第 4 轮长尾中文已跳过**。本线做稳定性与能力，不整仓 rebase 上游。  
> 原则：按主题移植 / 最小切片；**一项完成你验证通过再做下一项**。  
> 对照：[upstream-sync-checklist.md](upstream-sync-checklist.md)、[ux-optimization-backlog.md](ux-optimization-backlog.md)

## 顺序总览

| 序号 | 项 | 价值 | 风险 | 状态 |
|------|----|------|------|------|
| 1 | ACP 断线后**自动重试一次**（活跃会话） | 高 | 中 | **已通过** |
| 2 | 重连失败时的**启动/stderr 诊断**（脱敏中文） | 高 | 中 | **已跳过** |
| 3 | 自定义 ACP runtime（设置里加可执行文件；Cursor 收成预设） | 高 | 高 | **待验** |
| 4 | 设备本地聊天历史（新库默认；可选迁出 vault） | 中高 | 中 | 待做 |
| 5 | Claude ACP vendor 升级（择要） | 中 | 中 | 待做 |

**明确暂缓**：Codex 0.147、整页合上游 UI、sidecar Mutex 大拆、第 4 轮全文案。

**已有基础（不必重做）**：中文断线文案、手动「重试连接」、Cursor 迁会话 + 删旧空壳、initialize GC 空 New chat。

---

## 1. 断线后自动重试一次

**为什么**：空闲 ACP 挂掉后现在必须点「重试」或再发消息；旁路还会出现「正在重连…」status 却不真重连。

**改什么**

- `applyRuntimeConnection` error：对活跃 / 当前可见会话 **自动调用一次** `retrySessionConnection`
- 同一 session 防抖：失败后不再自动循环；保留手动「重试连接」
- **不**把 composer 未发送草稿打进 recovery transcript
- 去掉或改掉「假重连」status；真正 `isResumingSession` 时再用「正在恢复…」

**不改**：native-backend stderr 全套（→ 第 2 项）、connection `session_id` 协议、sidecar 锁。

**你验证**

1. Cursor 开会话 → 杀 ACP / 空闲挂死 → **不点按钮**应回到可输入；侧栏不新堆空「New chat」
2. 故意失败 → 只自动试一次 → 中文错误 + 手动重试仍在
3. 输入框留半条草稿 → 自动恢复后草稿仍在，不进模型上下文
4. 正常发送不受影响

---

## 2. 启动 / stderr 诊断

**为什么**：超时/exit 1 时常只剩泛化中文，不知道 Cursor 未登录还是二进制挂了。

**改什么**

- ACP 子进程：真正 **drain stderr**（避免 pipe 堵死），保留有界 tail
- 启动超时 / 进程提前退出 / session 创建失败：错误信息附带 **脱敏** stderr
- 前端：超时与 exit 不再一律压成「助手连接已断开」；中文说明 + 诊断片段 + 登录/PATH 等提示

**不改**：完整上游 #372 大移植、sidecar Mutex 大拆、自定义 runtime（→ 第 3 项）。

**你验证**

1. 正常 Cursor/OpenCode 会话仍可聊
2. 制造失败（未登录 / 杀二进制 / 错 PATH）→ 错误里能看到**具体原因或诊断片段**，不是只有「已断开」
3. 超时场景若有 stderr → 超时中文 + 诊断；无 stderr 仍有可操作提示
4. 诊断里不应出现 api key / token 明文

---

## 3. 自定义 ACP runtime

**为什么**：除 Cursor / OpenCode 外，还想接任意 ACP CLI，又不想每接一个就 fork 一份 runtime。

**改什么**

- 新增内置 runtime `custom-acp`（设置 → AI 提供商 → **Custom ACP**）
- 必填可执行文件路径（或环境变量 `NEVERWRITE_CUSTOM_ACP_BIN`）；启动参数与 Cursor/OpenCode 相同：附加 `acp`
- Cursor 保持为内置预设（PATH / `~/.local/bin/agent` / 自定义路径）
- 登录由该 CLI 自己处理，不走应用内 sign-in 终端

**不改**：多自定义 runtime 列表、自定义启动参数编辑、Codex 0.147、sidecar 锁。

**你验证**

1. 设置里仍能用 Cursor（默认或自定义 `agent` 路径）
2. Custom ACP：填一个真实 ACP 二进制 →「保存并连接」后可新建对话（侧栏能选到 Custom ACP）
3. 路径留空或填不存在的文件 → 不能当成已连接
4. OpenCode / Claude 等原有提供商不受影响

---

## 4. 设备本地聊天历史

新库默认历史不进 vault（团队 Git 更干净）；与 ignore `.neverwrite` 互补。含迁移入口。

---

## 5. Claude ACP 升级

择要合 vendor；与模型切换路径一起验。

---

## 执行约定

1. 每次只做上表一项；「通过」→ 下一项。  
2. 需要时开 `eng/…` 分支；你要求再 commit/push。  
3. 保护 AgentDock 自有能力：Git 面板、Cursor ACP、分栏 Agent。

当前停在：**第 3 项已实现，待你验证**（见上方「你验证」）。回复「通过」或「跳过」后做第 4 项。
