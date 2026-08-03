# 可行性与市场分析

> 对照：[需求定稿](requirements.md)

## 结论摘要

| 维度 | 判断 |
|------|------|
| 方向 | 正确：Agent 时代知识库应「文件优先 + 多格式可读 + Agent 可写」 |
| 技术 | 可行；可站在本仓库（NeverWrite fork）+ MCP / LLM Wiki 约定肩上 |
| 价值 | 有，尤其在「人读多格式产物、Agent 写纯文件、小团队 Git」 |
| 现成替代 | 无完美一体机；NeverWrite/本仓库已覆盖大半「个人工作台」 |
| 策略 | 先复用本仓库能力，补 Git 协作；目录结构由使用者自控；勿从零做编辑器 |

## Idea 拆解

需求实际叠了三层：

| 层 | 需求 | 本质 |
|---|---|---|
| 展示层 | 好看地读 MD / HTML / CSV / 图片 | 多格式「人工产物浏览器」 |
| 存储层 | 本地文件夹、可被 Agent 读写 | 纯文本/文件优先的知识库 |
| 生产层 | Claude Code、OpenCode 等生成与维护 | 外挂 Agent + schema（`AGENTS.md`） |
| 协作层（V1） | 小团队共享 | Git |

Obsidian 强在笔记与图谱，弱在：HTML/CSV 一等公民、Agent 原生协作、把「生成」当一等流程。本产品差异化正在此处。

## 可行性

**技术：高**

- 多格式预览、ACP 接助手、本地 vault：本仓库已具备主体能力  
- 小团队 Git：系统 git + 薄 UI 即可，无新技术风险  

**产品：中等偏可控（范围已收敛）**

- 展示与生成两头都要做好，但 V1 已排除企业权限与自建模型  
- 需答清相对「文件夹 + Obsidian + Claude Code」多出来的体验价值  

**主要风险**

1. HTML/CSV 人读是否做到位（否则退回「文件夹 + 任意编辑器」）  
2. Git 冲突在 CSV / 生成 HTML 上是否可教团队处理  
3. 产品边界膨胀——做成又一个全能笔记 App  

## 应用价值

高价值场景：

- 研发 / 产品 wiki（Agent 持续维护，人读结论与表格、HTML 报告）  
- Agent 产物工作台（会话产出的 HTML / CSV / 图统一归档、可再交给 Agent）  
- 人机共编：人读富预览 + Agent 写纯文件，避免锁进 Notion 专有格式  
- 小团队同一 Git 真相源，变更可 PR / blame / 回滚  

相对偏低的价值：

- 再做一个「更好看的 Markdown 笔记」  
- 再做一个「内置聊天的第二大脑」（能力已可复用，不必重做叙事）  

建议的价值主张：

> 不是更好的笔记 App，而是 Agent 友好知识库的人机共读工作台：文件即真相，多格式一等公民，主流编程助手原生可驱动，小团队用 Git 共享。

## 市面相关产品（摘录）

### 接近「多格式 + Agent 工作台」

| 产品 | 匹配度 | 说明 |
|------|--------|------|
| **NeverWrite（本仓库上游）** | 很高 | MD/CSV/HTML/图 + 多 Agent + review；缺团队 Git 产品化 |
| **StashBase** | 高 | 多格式索引 + MCP + Agent 面板；偏「给 Agent 的记忆」 |
| **SoloMD** | 中高 | 本地 MD + MCP；多格式弱 |
| **OpenKnowledge** | 中 | AI-first 笔记；偏 MD/WYSIWYG |

### VS Code / 编辑器路线

| 产品 | 匹配度 | 说明 |
|------|--------|------|
| **Foam** | 中高 | 知识图谱 + MCP；纯 MD，HTML/CSV 弱 |
| **microsoft/llmwiki** | 中高 | LLM 维护 wiki + MCP；多格式展示弱 |
| **Yamlink** | 中 | 结构化 MD、可查询表 |

### 「生成知识库」方法论（可直接复用）

- Karpathy **LLM Wiki**：`raw/` + `wiki/` + schema  
- 模板 / skill：`llm-wiki-agent`、`llm-wiki-opencode`、`doc-wiki` 等  
- 常见实践：Agent 生成 + Obsidian/编辑器查看——痛点正是查看层不够 Agent 产物友好  

### 偏 HTML 交付

- **html-anything**：本地 Agent 把 MD/CSV 生成可交付 HTML；偏发布，不偏长期团队知识库  

## 推荐切入（结合本仓库）

1. **以 AgentDock（NeverWrite fork）为客户端底座**，不重复实现编辑器与 Agent review  
2. **V1 补齐**：小团队 Git 工作流；**不强制**知识库目录模板（使用者可自备 `AGENTS.md` 等）  
3. 用试用清单验证 HTML/CSV 是否够用，再决定是否打磨预览  
4. 仅当底座在稳定/许可/预览上失败时，再考虑自研薄壳  

详见：[与 NeverWrite 差距](neverwrite-gap.md)、[试用对比清单](trial-checklist.md)
