# 试用对比清单：NeverWrite / Foam / StashBase

> 目的：验证「多格式人读 + 外挂助手」是否已被现成工具满足；指导 AgentDock 该补什么。  
> 建议时长：3–5 天；同一套样例库、同一组任务、同一评分表。

## 三款定位速览

| | NeverWrite（≈本仓库） | Foam | StashBase |
|--|----------------------|------|-----------|
| 形态 | 独立 Electron 桌面 | VS Code / Cursor 扩展 | 独立桌面 + MCP |
| 定位 | 多格式 vault + 多 Agent + review | 开发者知识图谱 + MCP | Agent 记忆层：索引检索 |
| 安装 | GitHub Releases / 本仓库源码 | 扩展市场 + foam-cli | GitHub Releases |
| 链接 | [NeverWrite](https://github.com/jsgrrchg/NeverWrite) | [foam.md](https://foam.md/) | [stashbase](https://github.com/liliu-z/stashbase) |

## 0. 试用前准备（三款共用）

建固定样例目录（例如 `~/kb-trial/`），三款都指向同一文件夹。

| 步骤 | 做什么 | 验收标准 |
|------|--------|----------|
| 建样例库 | `notes/*.md`、`reports/*.html`、`data/*.csv`、`assets/*` | 至少各 2 个文件；MD 含 `[[wikilink]]` |
| 准备 Agent | 本机 Claude Code；有 OpenCode 更好 | 终端能跑 `claude` |
| 写评分表 | 复制下方维度，每款 1–5 分 + 一句话理由 | 三款测完能横向比 |
| 固定任务 | T1–T8，不要临时换题 | 每款都跑完 |

### 建议样例库结构

```text
kb-trial/
  AGENTS.md
  index.md
  notes/
    product-overview.md
    glossary.md
  reports/
    weekly-dashboard.html
    agent-brief.html
  data/
    metrics.csv
    backlog.csv
  assets/
    architecture.png
    screenshot.jpg
  raw/
```

## 1. 能力速览（预期，非实测）

| 能力 | NeverWrite | Foam | StashBase |
|------|------------|------|-----------|
| MD 编辑/预览 | 强 | 强 | 可读可索引 |
| HTML 预览 | 沙箱内置 | 弱（靠扩展） | 可打开；偏检索 |
| CSV | 表格+原文 | 弱 | 非核心 |
| 图片/PDF | 一等公民 | 资源引用为主 | OCR/派生文本 |
| 图谱/双链 | 有 | 核心强项 + MCP | 非图谱产品 |
| Claude Code | 终端/侧栏 + ACP | 外挂 + foam-mcp | 内置面板 + MCP |
| OpenCode | ACP 已集成 | 外挂 CLI | 视面板支持 |
| MCP 对外 | 偏应用内 | foam-cli mcp | stashbase-mcp 一等公民 |
| 最贴近缺口 | 多格式+Agent 同窗 | VS Code+图遍历 | 多格式喂给 Agent |

## 2. 统一实测任务（T1–T8）

| ID | 任务 | 验证点 | 通过标准 |
|----|------|--------|----------|
| T1 | 打开 `index.md`，跳到 `[[glossary]]` | 双链/导航 | 一键跳转，无坏链 |
| T2 | 打开 `weekly-dashboard.html` | HTML 一等公民 | 应用内可读，样式不崩 |
| T3 | 打开 `metrics.csv`，改一格并保存 | CSV 共读共写 | 表格可用，落盘正确 |
| T4 | 预览 `architecture.png` | 图片工作流 | 内置查看，路径可给 Agent |
| T5 | Claude Code：根据 `raw/` 更新 `notes/` 并链到 index | Agent 生成 | 写入正确，人可审 diff |
| T6 | Agent 从 CSV 生成 `reports/summary.html` | 多格式闭环 | 生成后立刻可预览 |
| T7 | 问：「backlog 里 P0 有哪些？」 | 检索质量 | 引用真实文件，少幻觉 |
| T8 | 改名/移动笔记，查链接与索引 | 长期维护 | 链接可修；索引不脏 |

## 3. 分工具重点

### NeverWrite / AgentDock（Day 1）

- 多格式同窗：分屏 MD + HTML + CSV  
- Agent review：误改能否拒绝/回滚  
- OpenCode runtime 跑 T5/T6  
- 稳定性：大 HTML / 大 CSV / 长 Agent 输出  
- 注意 Claude 订阅在应用内计费路径（见 [agent-capability.md](agent-capability.md)）

### Foam（Day 2）

- 图遍历 MCP：是否真走 wikilink  
- VS Code 一体感  
- 故意测 T2/T3（HTML/CSV）看扩展拼装成本  
- Smart Folders / foam-query  

### StashBase（Day 3）

- PDF/截图 OCR 与派生文本  
- 只靠 MCP 做 T7  
- 内置 Agent 面板做 T5  
- 对比人读体验：它是「给 Agent 的库」还是「给人的库」  

接入示例：

```bash
claude mcp add stashbase -- ~/.stashbase/bin/stashbase-mcp
```

## 4. 评分表（1–5 分）

1=不可用 · 3=能干活但别扭 · 5=想天天用。

| 维度 | 权重建议 | NeverWrite | Foam | StashBase | 提示 |
|------|----------|------------|------|-----------|------|
| MD 阅读/编辑 | 10% | | | | 预览、双链 |
| HTML 展示 | 15% | | | | T2 |
| CSV 展示/编辑 | 15% | | | | T3 |
| 图片及其他 | 5% | | | | T4 |
| Claude Code 摩擦 | 15% | | | | 打开到写出文件的步数 |
| OpenCode / 多 Agent | 10% | | | | 无则 N/A |
| Agent 写入可审阅 | 10% | | | | diff / review |
| 检索与问答 | 10% | | | | T7 |
| 长期维护 | 5% | | | | T8 |
| 稳定与成熟度 | 5% | | | | 崩溃、文档 |

加权解读：

- ≥ 4.0：可直接作主工作台  
- 3.0–3.9：可作组件，需拼其它工具  
- < 3.0：不作为底座  

## 5. 决策规则

| 结果 | 含义 |
|------|------|
| NeverWrite 多格式+Agent ≥4 且稳定 | 优先独立工作台（AgentDock）；少自建编辑器 |
| Foam ≥4 但 T2/T3 靠扩展硬撑 | 自建收窄为多格式预览扩展，而非整盘重做 |
| StashBase 检索强、人读弱 | 当 Agent 记忆层组合使用 |
| 三款人读都不及格 | 自建 Artifact Viewer 假设成立 |

与 AgentDock 结合：见 [neverwrite-gap.md](neverwrite-gap.md)。

## 6. 每日记录模板

```markdown
## 日期：
## 工具：[ NeverWrite | Foam | StashBase ]
## 环境：OS / 版本 / Claude Code 版本

### 安装耗时与卡点
-

### T1–T8（通过/勉强/失败 + 分钟）
T1:
T2:
T3:
T4:
T5:
T6:
T7:
T8:

### 最惊喜的一点
-
### 最不能忍的一点
-
### 是否愿意下周继续用（是/否 + 原因）
-
```
