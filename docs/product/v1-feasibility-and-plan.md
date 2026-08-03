# V1 可行性评估与执行路径

> 对照：[需求定稿](requirements.md)、[差距清单](neverwrite-gap.md)、[Git 面板设计](git-panel-design.md)  
> 底座：本仓库 AgentDock（NeverWrite fork）+ 本地试用结论（2026-07）  
> 状态：阶段 1 实现中（Git 最小闭环）

## 1. 总判

| 维度 | 结论 |
|------|------|
| 总体可行性 | **高**——V1 可在本仓库上增量实现，不必换底座 |
| 能力覆盖（现状） | 约 **75%+**（多格式展示已 OK；助手可用；缺 Git） |
| 主增量 | **小团队 Git 面板**（唯一必须产品化的缺口） |
| 不做 | 强制知识库目录模板 / 约定骨架；自研 Agent；重做编辑器；企业 ACL、CRDT |
| 推荐策略 | 本 fork 内实现薄 Git；目录与 `AGENTS.md` 等交由使用者自行控制 |

试用已验证：

- MD / HTML / CSV / 图片展示效果 OK  
- Claude Code（终端）可用并已验证通过  
- OpenCode（ACP）可用但不稳  
- Terminal 菜单命令 ID 错位已修  
- iCloud 路径 vault 有风险，知识库宜放本地磁盘  

## 2. 需求 × 现状矩阵

| 需求条目 | 现状 | V1 动作 | 工作量 |
|----------|------|---------|--------|
| MD / HTML / CSV / 图片 | 展示 OK | 保持；HTML 可选「浏览器打开」兜底 | — / S |
| Claude Code | 终端已通 | 默认推荐路径 | S |
| OpenCode | ACP 不稳 | 可选，不挡 V1 | S |
| Agent review | ACP 强 / 终端无 | 文档说明双路径即可 | S |
| 小团队 Git | **无** | **新建 Git 面板（P0）** | **M–L** |
| 知识库模板/目录约定 | — | **不做强制模板**；使用者自控 | — |
| 品牌/AgentDock 壳 | 仍显示 NeverWrite | 可后置 | S |

工作量：S≈1–3 天，M≈1–2 周，L≈2–4 周（单人熟悉本仓库前提下）。

## 3. 可行性要点

### 技术

- Electron + Rust sidecar + ACP/终端助手：**已具备**  
- Git：调用系统 `git`，**无需自研 VCS**  
- 不强制模板 → 阶段更短，V1 更聚焦 Git  

### 产品

- 价值主张：**打开任意文件夹（最好是 Git 仓）+ 多格式阅读 + 外挂助手 + 小团队 Git 同步**  
- 使用者可自建任意目录，也可自行放置 `AGENTS.md`；应用不规定骨架  

### 不做（防膨胀）

- 强制 `notes/reports/data` 等官方目录模板与新建向导里的「写入骨架」  
- 自建模型 / 第二套 Claude Code  
- 完整三路合并 UI、GitHub PR 全流程（V1 最多「打开 PR 链接」）  
- 实时共编、细粒度权限  

## 4. 推荐执行路径（分阶段）

```text
阶段 0  稳定底座（可选收尾）
   │
阶段 1  Git 最小闭环（P0）     ← V1 核心差异（原阶段 2）
   │
阶段 2  体验打磨
   │
阶段 3  （可选）OpenCode/品牌 AgentDock
```

### 阶段 0 — 稳定底座（可很快收掉）

1. 主力助手 = Claude Code；OpenCode 可选  
2. Vault 推荐本地路径（避开 iCloud）  
3. Terminal 菜单修复已合并  
4. 多格式展示已 OK，不再作为阻断项  

### 阶段 1 — Git 最小闭环（验收：两人可协作）

应用内能力（侧栏或状态条 **Git**）：

| 能力 | 实现要点 |
|------|----------|
| 检测仓库 | vault 根是否有 `.git`；显示 branch / ahead-behind / dirty |
| status + diff | `git status` / `git diff`；列表可点开文件 |
| commit | 暂存所选 + message；禁止 Agent 自动 push |
| pull / push | 调系统 git；失败展示 stderr |
| 冲突 | 列出 unmerged；一键在编辑器打开 |

实现建议：

- Rust sidecar 或主进程封装 `git` 子进程  
- **不**嵌入 libgit2 全功能  
- **不**要求用户使用官方目录模板；对任意 Git 工作树一视同仁  
- （可选）若检测到无 `.gitignore`，可提示「是否忽略 `.neverwrite/`」，不强制整套模板  

### 阶段 2 — 体验打磨

1. 打开已有文件夹时显示 Git 状态条（非 Git 仓则隐藏或提示「未初始化」）  
2. 可选：一键 `git init`（不写入目录骨架）  
3. HTML：预览失败时「用默认浏览器打开」  
4. 设置页：Claude Code vs OpenCode vs Claude(ACP) 说明  

### 阶段 3 — 可选增强

- OpenCode ACP 稳定性  
- 品牌 NeverWrite → AgentDock  
- 「在浏览器打开 PR」  

## 5. V1 里程碑验收

| # | 标准 | 如何验收 |
|---|------|----------|
| 1 | `git clone` 后打开同一文件夹 | 两人 clone **各自约定结构**的仓，用 AgentDock 打开 |
| 2 | 流畅读 MD/HTML/CSV/图片 | 用真实库点开四类文件（已验证可过） |
| 3 | Claude Code / OpenCode 生成更新 | Claude Code 必过；OpenCode 尽力 |
| 4 | Git 可追溯可合并 | 应用内 pull/commit/push；一次冲突解决 |

## 6. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 无官方模板导致团队结构混乱 | 接受；由团队自定；应用只保证 Git + 文件打开 |
| OpenCode 拖慢 V1 | Claude Code 默认 |
| iCloud vault | 打开时警告 |
| Git 凭据复杂 | 依赖系统 git；失败展示原文 |

## 7. 建议排期（单人）

| 周次 | 产出 |
|------|------|
| 第 1 周 | 阶段 0 收尾 + Git 面板技术设计与骨架 |
| 第 2–3 周 | Git status/commit/pull/push/冲突列表 |
| 第 4 周 | 打磨 + 双人验收 |

## 8. 决策建议（已更新）

1. 以本仓库为唯一客户端底座。  
2. **V1 差异化押在 Git**；**不强制知识库模板**。  
3. 多格式与 Claude Code 已够用，下一主工程直接做 **Git 面板**。  
4. 双人用任意结构的私有仓验收即可。

下一步建议：直接做 **Git 面板技术设计（命令表 + UI 草图）** 或开工实现。
