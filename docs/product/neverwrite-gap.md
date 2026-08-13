# 与 NeverWrite 的差距清单

> 对照：[需求定稿](requirements.md)  
> 底座：本仓库 fork 自 [NeverWrite](https://github.com/jsgrrchg/NeverWrite)（Apache-2.0）  
> 参考：上游 [Discussion #41 GIT support?](https://github.com/jsgrrchg/NeverWrite/discussions/41)

## 一句话判断

NeverWrite / 本仓库已覆盖「个人 Agent 知识工作台」的大半能力（多格式 + Claude/OpenCode + 变更 review）。  
相对 AgentDock 产品目标，真正要补的是 **小团队以 Git 共享并维护知识库**——而不是重做 MD/CSV/Agent 壳，也**不**强制官方知识库目录模板。

| 指标 | 判断 |
|------|------|
| 需求能力已被覆盖 | 约 70% |
| V1 最大产品缺口 | Git 协作 |
| 建议路径 | 复用底座 + 补协议与 Git；慎自研编辑器 |

## 需求对照表

| 你的需求 | NeverWrite / 本仓库现状 | 差距 | 要不要自建 |
|----------|-------------------------|------|------------|
| 多格式：MD | 一等公民编辑/预览、wikilink、图谱 | 基本覆盖 | 否 |
| 多格式：HTML | 沙箱预览 `.html`/`.htm` | 部分覆盖 | 试用后决定 |
| 多格式：CSV | 表格视图 + 原文编辑 | 基本覆盖 | 否（V1） |
| 多格式：图片 | 内置查看 | 基本覆盖 | 否 |
| 外挂 Claude Code / OpenCode | ACP：Claude、OpenCode、Codex 等；终端 Tab | 基本覆盖 | 否（不自建助手） |
| Agent 写入可审阅 | Inline review + Review，按文件/hunk keep/reject | 基本覆盖 | 否（强项） |
| 不自建模型/助手 | 复用本机 CLI / runtime | 基本覆盖 | 否 |
| 不必 VS Code 壳 | 独立 Electron | 基本覆盖 | 否 |
| V1 小团队 Git 共享 | 本地 vault；无内置 pull/push；#41 仅征集 | **明显缺口** | **是** |
| 团队知识库约定 | 无开箱模板 | **不强制**；使用者自控目录与是否使用 AGENTS.md | 否（V1） |
| 企业 ACL / 实时共编 | 非定位 | 非目标 | V1 不做 |

## 定位差

| NeverWrite 更像 | AgentDock 目标更像 |
|-----------------|-------------------|
| 个人（或单人主导）的 agentic 写作/研究工作台 | 小团队共享的 Agent 友好知识库 |
| 真相源是本地 vault；协作非一等公民 | 真相源是可 clone 的团队仓库 |
| 强项：多窗格、多 Agent、review、剪藏 | 增量：Git 协作（目录结构由使用者自控） |

## 还要自建什么（优先级）

### P0 — 小团队 Git 工作流（最大缺口）

上游暂无内置 Git 同步；今天只能系统终端 / 外部 Git 客户端。

V1 最小集：

| 能力 | 说明 | 优先级 |
|------|------|--------|
| 识别 Git 仓库 | 检测 `.git`；显示 branch / dirty | 必须 |
| pull / commit / push | 调用系统 git；commit message 可模板化 | 必须 |
| 冲突列表 | 列出冲突文件并一键打开 | 必须 |
| 忽略本地态 | 可选提示忽略 `.neverwrite/` 等；不强制整套目录模板 | 建议 |
| PR 流 | 打开托管平台创建 PR 链接 | 可后置 |

也可先用系统终端 / GitHub Desktop 协作；应用内 Git 面板为 V1 主增量。

### P1 — （已取消）强制知识库协议模板

V1 **不**提供/不强制官方目录骨架。使用者自行组织文件夹；需要时自己添加 `AGENTS.md` 等即可。

可选、非阻断：检测到无相关 ignore 规则时，提示是否忽略 `.neverwrite/`。

### P2 — HTML/CSV 场景打磨（按需）

多格式展示已验证 OK。HTML 预览失败时已支持「用默认浏览器打开」。

### 明确不必自建

- 自研 Agent / 模型 / 另一套 Claude Code  
- 从零做 MD 编辑器、wikilink、图谱、多 Agent review  
- VS Code 发行版  
- V1 企业权限、CRDT、Notion 式云文档  

## 三条落地路径

### 路径 A — 本仓库作客户端（推荐）

团队用 AgentDock 打开同一 Git 仓库（**任意目录结构**）；协作靠 Git。成本最低。

### 路径 B — 贡献上游 / 旁路 Git 面板

参与上游 #41 或在本 fork 实现 Git 面板；或独立「KB Git Companion」。  
中等成本，只补协作缺口。

### 路径 C — 大幅自研壳（仅当 A/B 失败）

自建多格式预览 + Git + 唤起本机助手；不重做 Agent，也尽量不重做完整 PKM。  
成本最高；仅当底座稳定/许可/预览达不到预期时启动。

## 建议验证顺序

1. 用本应用跑通个人流（多格式 + Agent + review）  
2. 两人用同一私有 Git 库 + 终端 Git 协作一周——无内置 Git 是否可接受  
3. 摩擦大 → 路径 B 薄 Git（不引入强制目录模板） 
4. 仅当客户端本身卡住 → 考虑路径 C，且锁死自建范围  

详见：[试用对比清单](trial-checklist.md)、[内置 Agent 能力对比](agent-capability.md)
