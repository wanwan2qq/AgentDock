# AgentDock Fork 发布 Checklist（给 Agent）

> **用途**：在 `wanwan2qq/AgentDock` 上发布桌面客户端更新，让已安装用户通过应用内更新收到新版本。  
> **适用执行者**：Cursor Agent / 人工维护者。按顺序执行，不要跳步。

## 发布前必读（常量与架构）

| 项 | 值 / 位置 |
|----|-----------|
| GitHub 仓库 | `wanwan2qq/AgentDock` |
| 发布 canonical 常量 | `scripts/appcast-lib.mjs` → `CANONICAL_RELEASE_REPO_SLUG`、`PUBLIC_PRODUCT_NAME`（`AgentDock`） |
| 客户端默认更新 feed | `https://wanwan2qq.github.io/AgentDock/stable/{platform}/latest-*.yml` |
| 客户端 updater 代码 | `apps/desktop/src-electron/main/updater.ts` → `DEFAULT_UPDATER_BASE_URL` |
| CI 工作流 | `.github/workflows/release-desktop.yml`（push `v*` tag 或 `workflow_dispatch`） |
| 更新 feed 托管 | 仓库 **`gh-pages` 分支**（GitHub Pages） |
| 安装包托管 | GitHub **Releases**（feed 里的 `url` 指向 release 资产） |

**机制简述**：

1. CI 构建各平台安装包 → 上传到 GitHub Release。
2. CI 重写 updater feed（`latest-mac.yml` 等）→ 部署到 `gh-pages`。
3. 已安装客户端请求 `wanwan2qq.github.io/AgentDock/.../latest-mac.yml` → 解析其中的 GitHub Release 下载 URL → 下载并安装。

**不要**把更新源改回上游 `jsgrrchg/NeverWrite`，除非用户明确要求。

---

## 一次性前置条件（首次 fork 发布前确认）

- [ ] GitHub 仓库 Settings → **Pages**：Source 为 **`gh-pages` 分支**（根目录或 `/`）。
- [ ] 仓库 Actions 已启用；维护者有权限 push tag、写 Release、写 `gh-pages`。
- [ ] **Linux APT 签名**（仅当要发布 Linux `.deb` 仓库时）：仓库 Secrets 已配置  
  `APT_REPO_GPG_PRIVATE_KEY`、`APT_REPO_GPG_PASSPHRASE`、`APT_REPO_GPG_KEY_ID`。  
  若只发 macOS/Windows 或仅手动 `.deb`，可先跳过，但 CI 里 Linux 矩阵可能依赖 preflight。
- [ ] 确认 `scripts/appcast-lib.mjs` 中：  
  `CANONICAL_RELEASE_REPO_SLUG = "wanwan2qq/AgentDock"`  
  `PUBLIC_PRODUCT_NAME = "AgentDock"`
- [ ] 确认 `apps/desktop/src-electron/main/updater.ts` 中：  
  `DEFAULT_UPDATER_BASE_URL = "https://wanwan2qq.github.io/AgentDock"`

---

## 标准发布流程（Agent 按此执行）

### 1. 确定版本号

- 使用 **SemVer** `X.Y.Z`（当前 beta 线多为 `0.x.y`）。
- 新版本必须 **大于** 已发布最新 tag。
- 查看已有 tag：`git tag -l 'v*' --sort=-v:refname | head`

### 2. 对齐版本源（必须全部一致）

在**同一次发布**中，以下文件版本必须相同（例如均为 `0.5.1`）：

- [ ] `apps/desktop/package.json` → `version`
- [ ] `apps/desktop/package-lock.json` → 根 `version` 与 `packages[""].version`
- [ ] `apps/desktop/native-backend/Cargo.toml` → `version`
- [ ] `apps/web-clipper/package.json` → `version`（若 clipper 随版发布）

**校验命令**（必须通过，无输出错误）：

```bash
node scripts/validate-release-metadata.mjs --tag vX.Y.Z
```

### 3. 更新 CHANGELOG

- [ ] 在 `CHANGELOG.md` 顶部增加 `## [X.Y.Z] - YYYY-MM-DD` 条目。
- [ ] 只写**用户可见**变更（Added / Changed / Fixed 等）。
- [ ] `validate-release-metadata.mjs` 会检查该版本是否在 CHANGELOG 中存在。

### 4. 提交并推送 main

- [ ] 提交版本 bump + CHANGELOG（遵循仓库 commit 风格）。
- [ ] `git push origin main`
- [ ] **在 main 已包含上述 commit 之后再打 tag**（tag 指向的 commit 必须含版本与 changelog）。

### 5. 创建并推送 tag（触发 CI）

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

- Tag 格式必须为 **`vX.Y.Z`**（例如 `v0.5.1`）。
- 推送 tag 后自动触发 **Release Desktop** 工作流。

**备选**：在 GitHub Actions 界面手动 **Run workflow** → `Release Desktop` → 输入已有 tag（`workflow_dispatch`）。通常仍应先 push tag。

### 6. 监控 CI

- [ ] 打开 Actions → **Release Desktop** → 对应 `vX.Y.Z` run。
- [ ] 等待 matrix 构建完成：`universal-apple-darwin`、Windows x64/ARM64、Linux x64/ARM64 等。
- [ ] 确认 job **Publish GitHub Release**、**Deploy GitHub Pages**（或同等 deploy job）成功。
- [ ] 若失败：读失败 job 日志，修复后**新 tag 或 re-run**（不要 force-push tag）。

### 7. 发布后验证（必做）

**GitHub Release**

- [ ] 存在 Release `vX.Y.Z`，标题形如 `AgentDock vX.Y.Z`。
- [ ] 资产含 macOS（`.dmg` + updater `.zip`）、Windows `.exe` 等；命名遵循 `AgentDock_*` / `AgentDock-*` 规则。

**GitHub Pages feed**（macOS 示例）

```bash
curl -fsSL https://wanwan2qq.github.io/AgentDock/stable/darwin-universal/latest-mac.yml | head -20
```

- [ ] `version:` 为 `X.Y.Z`。
- [ ] `path` / `files[].url` 指向 `https://github.com/wanwan2qq/AgentDock/releases/download/vX.Y.Z/...`。

**Appcast 索引**（可选）

```bash
curl -fsSL https://wanwan2qq.github.io/AgentDock/stable/latest.json
```

---

## 本地 unsigned 构建（仅自测，不替代发布）

用于本机安装测试，**不会**更新其他用户的 feed：

```bash
node scripts/build-electron-release.mjs --platform mac --arch arm64 --unsigned
```

产出在 `apps/desktop/dist-electron/`（如 `AgentDock-X.Y.Z-mac-arm64.dmg`）。  
要给团队推送更新，必须走上方 **tag → CI → Release + gh-pages** 流程。

---

## 常见资产命名（便于核对 Release 附件）

| 平台 | 典型手动安装包 | 典型 updater 资产 |
|------|----------------|-------------------|
| macOS Universal | `AgentDock_X.Y.Z_macOS_Universal.dmg` | `AgentDock_X.Y.Z_macOS_Universal.zip` |
| Windows x64 | `AgentDock_X.Y.Z_Windows_x64_Setup.exe` | 同左（in-app updater） |
| Linux x64 AppImage | `AgentDock-X.Y.Z-x64.AppImage` | 同左 |
| Linux amd64 deb | `AgentDock-X.Y.Z-amd64.deb` | apt 仓库或手动安装 |

浏览器扩展（若 CI 构建）：`AgentDock-Web-Clipper-vX.Y.Z-chrome-mv3.zip` 等。

命名逻辑见 `scripts/appcast-lib.mjs`（`PUBLIC_PRODUCT_NAME`）与 `scripts/electron-release-lib.mjs`。

---

## Agent 不要做

- **不要**在未 bump 版本 / 未写 CHANGELOG 的情况下 push tag。
- **不要**修改 `validate-release-metadata.mjs` 的校验规则来「绕过」失败。
- **不要**只上传 DMG 到 Release 而不跑完整 CI（feed 与 sha512 不会自动更新）。
- **不要**把 `gh-pages` 指到 `main`；feed 由 CI 写入 `gh-pages`。
- **不要**在未获用户要求时 force-push tag 或删除已发布 Release。

---

## 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 客户端「检查更新」无新版本 | gh-pages 未部署或 feed 版本未变 | 查 CI deploy job；curl feed URL |
| feed 404 | Pages 未启用或未用 gh-pages | 仓库 Settings → Pages |
| 下载 404 | Release 资产名与 feed 不一致 | 对照 `latest-mac.yml` 中 url 与 Release 附件名 |
| `validate-release-metadata` 失败 | 多文件版本不一致 | 对齐 package.json / lock / Cargo.toml |
| CI apt preflight 失败 | 缺少 GPG secrets | 配置 Secrets 或咨询维护者 |

开发环境覆盖 feed（仅本地调试）：

```bash
export NEVERWRITE_UPDATER_BASE_URL=https://wanwan2qq.github.io/AgentDock
# 或
export NEVERWRITE_UPDATER_ENDPOINT=https://wanwan2qq.github.io/AgentDock/stable/darwin-universal/latest-mac.yml
```

---

## 相关文档

- [上游同步清单](upstream-sync-checklist.md)（合入 NeverWrite 上游，与发布独立）
- [试用对比清单](trial-checklist.md)
- 技术细节：`release/appcast/README.md`（上游文档，URL 以本 fork 常量为准）
