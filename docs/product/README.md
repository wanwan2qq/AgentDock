# AgentDock 产品文档

本目录记录基于 NeverWrite fork（AgentDock）演进的产品需求与分析，与上游维护者文档（`docs/` 根下各技术专题）分开存放。

## 文档索引

| 文档 | 内容 |
|------|------|
| [需求定稿](requirements.md) | 产品定位、必须做到 / 非目标、V1 成功标准 |
| [可行性与市场](feasibility-and-market.md) | Idea 价值、市面替代品、推荐切入方式 |
| [与 NeverWrite 差距](neverwrite-gap.md) | 能力对照、还要自建什么、三条落地路径 |
| [内置 Agent 能力对比](agent-capability.md) | NeverWrite/AgentDock 内置 Agent vs 主流编程助手 |
| [试用对比清单](trial-checklist.md) | NeverWrite / Foam / StashBase 对照试用与评分 |
| [V1 可行性与执行路径](v1-feasibility-and-plan.md) | 基于本仓库的可行性评估、分阶段路径与验收 |
| [Git 面板设计](git-panel-design.md) | 阶段 1 命令表与 UI 挂点 |
| [上游可合入清单](upstream-sync-checklist.md) | NeverWrite 0.6/0.7 相对本仓库：优先合 ACP 恢复与自定义 runtime |
| [体验优化计划](ux-optimization-plan.md) | 串行验证：空态引导 → 开库遮罩 → Git ignore → tool 原因 → ACP 重试 → 滚到底 |

## 当前结论（摘要）

1. **定位**：Agent 友好的知识库工作台——人读多格式产物，外挂先进编程助手生成与维护；V1 用小团队 Git 共享。
2. **不必自建**：模型 / Claude Code / OpenCode 本身；完整 Markdown 编辑器与 Agent review 层可复用本仓库能力。
3. **主缺口**：小团队 Git 协作产品化。
4. **目录结构**：不强制知识库模板；由使用者自行控制（可自备 `AGENTS.md` 等）。
5. **形态**：不要求 VS Code 壳；独立桌面（本仓库路径）即可。
6. **多格式**：MD / HTML / CSV / 图片展示已验证可用。

## 与上游文档的关系

- 上游 NeverWrite 技术细节：见 [`../README.md`](../README.md) 及各专题（AI Change Control、Runtime Setup 等）。
- 本目录回答「AgentDock 要做成什么样、差在哪」；实现设计应再落到 `docs/` 技术文档或后续 ADR。
