# Git 面板技术设计（阶段 1）

> 对照：[V1 计划](v1-feasibility-and-plan.md) 阶段 1  
> 实现位置：`apps/desktop/native-backend/src/git.rs` + `apps/desktop/src/features/git/`

## 目标

应用内薄 Git：检测仓库、status/diff、暂存/提交、pull/push、冲突列表并打开文件。  
调用系统 `git`，不嵌 libgit2；不对目录结构做强制模板。

## 命令表

| Command | 入参 | 出参要点 |
|---------|------|----------|
| `git_get_status` | `vaultPath` | `isRepo` / `branch` / `ahead`/`behind` / `files[]` / `conflicts[]` / `hasGit` |
| `git_diff` | `vaultPath`, `path?`, `staged?` | `diff` 文本 |
| `git_stage` | `vaultPath`, `paths[]` | 更新后的 status |
| `git_unstage` | `vaultPath`, `paths[]` | 更新后的 status |
| `git_commit` | `vaultPath`, `message`, `paths?` | `{ ok, stdout, stderr, status }`；空 message 拒绝 |
| `git_pull` | `vaultPath` | `pull --rebase --autostash`；失败返回 stderr |
| `git_push` | `vaultPath` | `push`；**仅人手动**，Agent 不调用 |
| `git_list_conflicts` | `vaultPath` | `conflicts[]` |
| `git_list_branches` | `vaultPath` | `current` / `local[]` / `remote[]` |
| `git_checkout` | `vaultPath`, `branch`, `createTracking?` | `git switch`；远端-only 时可建本地跟踪分支 |

## UI

左侧 Sidebar 次级 tab **Git**（`SidebarView = "git"`）→ `GitPanel`：

- 非 Git / 无 git 二进制：提示文案
- 有仓：分支 + ahead/behind、Pull/Push、冲突/已暂存/更改列表、diff 预览、commit message

## 安全

- `git -C <vault>` + argv 数组，不拼接 shell
- 相对路径拒绝 `..`
- `GIT_TERMINAL_PROMPT=0` 避免 sidecar 挂起
