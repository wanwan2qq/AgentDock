use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::OnceLock;

use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultScopedInput {
    vault_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PathsInput {
    vault_path: String,
    paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiffInput {
    vault_path: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    staged: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommitInput {
    vault_path: String,
    message: String,
    #[serde(default)]
    paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckoutInput {
    vault_path: String,
    branch: String,
    /// When true and branch only exists on remote, create a local tracking branch.
    #[serde(default = "default_true")]
    create_tracking: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone)]
struct GitFileEntry {
    path: String,
    status: String,
    staged: bool,
    unstaged: bool,
    untracked: bool,
    conflict: bool,
}

pub fn invoke(command: &str, args: Value) -> Result<Value, String> {
    match command {
        "git_get_status" => {
            let input: VaultScopedInput = parse_input(args)?;
            get_status(&input.vault_path)
        }
        "git_init" => {
            let input: VaultScopedInput = parse_input(args)?;
            init_repo(&input.vault_path)
        }
        "git_diff" => {
            let input: DiffInput = parse_input(args)?;
            get_diff(&input.vault_path, input.path.as_deref(), input.staged)
        }
        "git_stage" => {
            let input: PathsInput = parse_input(args)?;
            stage_paths(&input.vault_path, &input.paths)
        }
        "git_unstage" => {
            let input: PathsInput = parse_input(args)?;
            unstage_paths(&input.vault_path, &input.paths)
        }
        "git_commit" => {
            let input: CommitInput = parse_input(args)?;
            commit(&input.vault_path, &input.message, &input.paths)
        }
        "git_pull" => {
            let input: VaultScopedInput = parse_input(args)?;
            run_network_op(&input.vault_path, &["pull", "--rebase", "--autostash"])
        }
        "git_push" => {
            let input: VaultScopedInput = parse_input(args)?;
            run_network_op(&input.vault_path, &["push"])
        }
        "git_list_conflicts" => {
            let input: VaultScopedInput = parse_input(args)?;
            list_conflicts(&input.vault_path)
        }
        "git_list_branches" => {
            let input: VaultScopedInput = parse_input(args)?;
            list_branches(&input.vault_path)
        }
        "git_checkout" => {
            let input: CheckoutInput = parse_input(args)?;
            checkout_branch(&input.vault_path, &input.branch, input.create_tracking)
        }
        _ => Err(format!("Unknown git command: {command}")),
    }
}

fn parse_input<T: for<'de> Deserialize<'de>>(args: Value) -> Result<T, String> {
    serde_json::from_value(args).map_err(|error| format!("Invalid git args: {error}"))
}

fn get_status(vault_path: &str) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    if git_binary().is_err() {
        return Ok(json!({
            "isRepo": false,
            "branch": null,
            "upstream": null,
            "ahead": 0,
            "behind": 0,
            "dirty": false,
            "files": [],
            "conflicts": [],
            "hasGit": false,
        }));
    }
    if !is_git_repo(&root)? {
        return Ok(json!({
            "isRepo": false,
            "branch": null,
            "upstream": null,
            "ahead": 0,
            "behind": 0,
            "dirty": false,
            "files": [],
            "conflicts": [],
            "hasGit": true,
        }));
    }

    let output = run_git(
        &root,
        &["status", "--porcelain=v2", "--branch", "--untracked-files=all"],
    )?;
    if !output.status.success() {
        return Err(format_command_failure("git status", &output));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branch: Option<String> = None;
    let mut upstream: Option<String> = None;
    let mut ahead: i64 = 0;
    let mut behind: i64 = 0;
    let mut files: Vec<GitFileEntry> = Vec::new();

    for line in stdout.lines() {
        if let Some(rest) = line.strip_prefix("# branch.head ") {
            branch = Some(rest.to_string());
            continue;
        }
        if let Some(rest) = line.strip_prefix("# branch.upstream ") {
            upstream = Some(rest.to_string());
            continue;
        }
        if let Some(rest) = line.strip_prefix("# branch.ab ") {
            // Format: +<ahead> -<behind>
            for token in rest.split_whitespace() {
                if let Some(value) = token.strip_prefix('+') {
                    ahead = value.parse().unwrap_or(0);
                } else if let Some(value) = token.strip_prefix('-') {
                    behind = value.parse().unwrap_or(0);
                }
            }
            continue;
        }
        if line.starts_with('#') {
            continue;
        }
        if let Some(entry) = parse_porcelain_v2_entry(line) {
            files.push(entry);
        }
    }

    let conflicts: Vec<String> = files
        .iter()
        .filter(|file| file.conflict)
        .map(|file| file.path.clone())
        .collect();
    let dirty = !files.is_empty();

    Ok(json!({
        "isRepo": true,
        "branch": branch,
        "upstream": upstream,
        "ahead": ahead,
        "behind": behind,
        "dirty": dirty,
        "files": files.iter().map(|file| json!({
            "path": file.path,
            "status": file.status,
            "staged": file.staged,
            "unstaged": file.unstaged,
            "untracked": file.untracked,
            "conflict": file.conflict,
        })).collect::<Vec<_>>(),
        "conflicts": conflicts,
        "hasGit": true,
    }))
}

fn get_diff(vault_path: &str, path: Option<&str>, staged: bool) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;

    let mut args = vec!["diff".to_string(), "--no-ext-diff".to_string()];
    if staged {
        args.push("--cached".to_string());
    }
    if let Some(path) = path {
        let relative = sanitize_relative_path(path)?;
        args.push("--".to_string());
        args.push(relative);
    }

    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    let output = run_git(&root, &arg_refs)?;
    // git diff returns exit 1 when differences exist; treat that as success.
    if !output.status.success()
        && output.status.code() != Some(1)
        && !String::from_utf8_lossy(&output.stderr).trim().is_empty()
    {
        return Err(format_command_failure("git diff", &output));
    }

    Ok(json!({
        "path": path,
        "staged": staged,
        "diff": String::from_utf8_lossy(&output.stdout).to_string(),
    }))
}

fn stage_paths(vault_path: &str, paths: &[String]) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;
    let relative_paths = sanitize_relative_paths(paths)?;
    if relative_paths.is_empty() {
        return Err("No paths to stage".to_string());
    }

    let mut args = vec!["add".to_string(), "--".to_string()];
    args.extend(relative_paths);
    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    let output = run_git(&root, &arg_refs)?;
    if !output.status.success() {
        return Err(format_command_failure("git add", &output));
    }
    get_status(vault_path)
}

fn unstage_paths(vault_path: &str, paths: &[String]) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;
    let relative_paths = sanitize_relative_paths(paths)?;
    if relative_paths.is_empty() {
        return Err("No paths to unstage".to_string());
    }

    let mut args = vec![
        "restore".to_string(),
        "--staged".to_string(),
        "--".to_string(),
    ];
    args.extend(relative_paths);
    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    let output = run_git(&root, &arg_refs)?;
    if !output.status.success() {
        return Err(format_command_failure("git restore --staged", &output));
    }
    get_status(vault_path)
}

fn commit(vault_path: &str, message: &str, paths: &[String]) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("Commit message is required".to_string());
    }

    if !paths.is_empty() {
        stage_paths(vault_path, paths)?;
    }

    let output = run_git(&root, &["commit", "-m", trimmed])?;
    if !output.status.success() {
        return Err(format_command_failure("git commit", &output));
    }

    let commit_hash = run_git(&root, &["rev-parse", "--short", "HEAD"])
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty());

    Ok(json!({
        "ok": true,
        "stdout": String::from_utf8_lossy(&output.stdout).to_string(),
        "stderr": String::from_utf8_lossy(&output.stderr).to_string(),
        "commitHash": commit_hash,
        "status": get_status(vault_path)?,
    }))
}

fn run_network_op(vault_path: &str, git_args: &[&str]) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;
    let output = run_git(&root, git_args)?;
    if !output.status.success() {
        return Err(format_command_failure(&format!("git {}", git_args.join(" ")), &output));
    }
    Ok(json!({
        "ok": true,
        "stdout": String::from_utf8_lossy(&output.stdout).to_string(),
        "stderr": String::from_utf8_lossy(&output.stderr).to_string(),
        "status": get_status(vault_path)?,
    }))
}

fn list_conflicts(vault_path: &str) -> Result<Value, String> {
    let status = get_status(vault_path)?;
    let conflicts = status
        .get("conflicts")
        .cloned()
        .unwrap_or_else(|| json!([]));
    Ok(json!({ "conflicts": conflicts }))
}

fn list_branches(vault_path: &str) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;

    let current = {
        let output = run_git(&root, &["branch", "--show-current"])?;
        if output.status.success() {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if name.is_empty() {
                None
            } else {
                Some(name)
            }
        } else {
            None
        }
    };

    let local = list_ref_names(&root, &["for-each-ref", "--format=%(refname:short)", "refs/heads/"])?;
    let remote_raw =
        list_ref_names(&root, &["for-each-ref", "--format=%(refname:short)", "refs/remotes/"])?;
    // Drop remote HEAD aliases like origin/HEAD
    let remote: Vec<String> = remote_raw
        .into_iter()
        .filter(|name| !name.ends_with("/HEAD"))
        .collect();

    Ok(json!({
        "current": current,
        "local": local,
        "remote": remote,
    }))
}

fn list_ref_names(root: &Path, args: &[&str]) -> Result<Vec<String>, String> {
    let output = run_git(root, args)?;
    if !output.status.success() {
        return Err(format_command_failure(&format!("git {}", args.join(" ")), &output));
    }
    let mut names: Vec<String> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect();
    names.sort();
    names.dedup();
    Ok(names)
}

fn checkout_branch(vault_path: &str, branch: &str, create_tracking: bool) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    require_git_repo(&root)?;
    let branch = sanitize_branch_name(branch)?;

    let local = list_ref_names(&root, &["for-each-ref", "--format=%(refname:short)", "refs/heads/"])?;
    let remote =
        list_ref_names(&root, &["for-each-ref", "--format=%(refname:short)", "refs/remotes/"])?;

    let output = if local.iter().any(|name| name == &branch) {
        run_git(&root, &["switch", &branch])?
    } else if let Some(remote_ref) = resolve_remote_branch(&branch, &remote) {
        if create_tracking {
            // Prefer: git switch --track origin/foo  → creates local foo
            // If caller passed origin/foo, track that; if foo, find matching remote.
            run_git(&root, &["switch", "--track", &remote_ref])?
        } else {
            return Err(format!(
                "Branch '{branch}' is remote-only. Enable tracking to create a local branch."
            ));
        }
    } else {
        return Err(format!("Branch not found: {branch}"));
    };

    if !output.status.success() {
        return Err(format_command_failure("git switch", &output));
    }

    Ok(json!({
        "ok": true,
        "branch": branch_after_switch(&branch, &remote),
        "stdout": String::from_utf8_lossy(&output.stdout).to_string(),
        "stderr": String::from_utf8_lossy(&output.stderr).to_string(),
        "status": get_status(vault_path)?,
    }))
}

fn resolve_remote_branch(branch: &str, remote: &[String]) -> Option<String> {
    if branch.contains('/') && remote.iter().any(|name| name == branch) {
        return Some(branch.to_string());
    }
    // Prefer origin/<branch>, else first matching */<branch>
    let origin = format!("origin/{branch}");
    if remote.iter().any(|name| name == &origin) {
        return Some(origin);
    }
    remote
        .iter()
        .find(|name| name.rsplit_once('/').is_some_and(|(_, short)| short == branch))
        .cloned()
}

fn branch_after_switch(requested: &str, remote: &[String]) -> String {
    if requested.contains('/') {
        requested
            .rsplit_once('/')
            .map(|(_, short)| short.to_string())
            .unwrap_or_else(|| requested.to_string())
    } else if remote.iter().any(|name| name.ends_with(&format!("/{requested}"))) {
        requested.to_string()
    } else {
        requested.to_string()
    }
}

fn sanitize_branch_name(branch: &str) -> Result<String, String> {
    let trimmed = branch.trim();
    if trimmed.is_empty() {
        return Err("Branch name is empty".to_string());
    }
    if trimmed.starts_with('-') {
        return Err(format!("Invalid branch name: {trimmed}"));
    }
    if trimmed.contains("..") || trimmed.contains('\\') || trimmed.contains('\0') {
        return Err(format!("Invalid branch name: {trimmed}"));
    }
    // Keep names like feat/foo_bar.1 and origin/feat/foo
    if !trimmed
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'/' | b'-' | b'_' | b'.'))
    {
        return Err(format!("Invalid branch name: {trimmed}"));
    }
    Ok(trimmed.to_string())
}

fn parse_porcelain_v2_entry(line: &str) -> Option<GitFileEntry> {
    if let Some(path) = line.strip_prefix("? ") {
        return Some(GitFileEntry {
            path: unescape_path(path),
            status: "??".to_string(),
            staged: false,
            unstaged: true,
            untracked: true,
            conflict: false,
        });
    }

    if let Some(rest) = line.strip_prefix("u ") {
        // Unmerged: u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
        let mut parts = rest.splitn(11, ' ');
        let xy = parts.next().unwrap_or("UU");
        let path = parts.nth(8).unwrap_or("").to_string();
        if path.is_empty() {
            return None;
        }
        return Some(GitFileEntry {
            path: unescape_path(&path),
            status: xy.to_string(),
            staged: true,
            unstaged: true,
            untracked: false,
            conflict: true,
        });
    }

    if let Some(rest) = line.strip_prefix("1 ") {
        // Ordinary changed: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
        let mut parts = rest.splitn(9, ' ');
        let xy = parts.next().unwrap_or("..");
        let path = parts.nth(6).unwrap_or("").to_string();
        if path.is_empty() {
            return None;
        }
        let (staged_char, unstaged_char) = xy_chars(xy);
        return Some(GitFileEntry {
            path: unescape_path(&path),
            status: xy.to_string(),
            staged: staged_char != '.',
            unstaged: unstaged_char != '.',
            untracked: false,
            conflict: false,
        });
    }

    if let Some(rest) = line.strip_prefix("2 ") {
        // Rename/copy: 2 <XY> ... <path>\t<origPath>
        let mut parts = rest.splitn(10, ' ');
        let xy = parts.next().unwrap_or("R.");
        let path_field = parts.nth(7).unwrap_or("");
        let path = path_field.split('\t').next().unwrap_or("").to_string();
        if path.is_empty() {
            return None;
        }
        let (staged_char, unstaged_char) = xy_chars(xy);
        return Some(GitFileEntry {
            path: unescape_path(&path),
            status: xy.to_string(),
            staged: staged_char != '.',
            unstaged: unstaged_char != '.',
            untracked: false,
            conflict: false,
        });
    }

    None
}

fn xy_chars(xy: &str) -> (char, char) {
    let mut chars = xy.chars();
    (
        chars.next().unwrap_or('.'),
        chars.next().unwrap_or('.'),
    )
}

fn unescape_path(path: &str) -> String {
    // Porcelain may C-quote unusual/non-ASCII paths: "foo\350\264\235.md"
    let trimmed = path.trim();
    let inner = if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        &trimmed[1..trimmed.len() - 1]
    } else {
        trimmed
    };
    decode_c_quoted(inner)
}

fn decode_c_quoted(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\\' && i + 1 < bytes.len() {
            match bytes[i + 1] {
                b'\\' => {
                    out.push(b'\\');
                    i += 2;
                }
                b'"' => {
                    out.push(b'"');
                    i += 2;
                }
                b't' => {
                    out.push(b'\t');
                    i += 2;
                }
                b'n' => {
                    out.push(b'\n');
                    i += 2;
                }
                b'r' => {
                    out.push(b'\r');
                    i += 2;
                }
                b'a' => {
                    out.push(0x07);
                    i += 2;
                }
                b'b' => {
                    out.push(0x08);
                    i += 2;
                }
                b'f' => {
                    out.push(0x0c);
                    i += 2;
                }
                b'v' => {
                    out.push(0x0b);
                    i += 2;
                }
                b'0'..=b'7' => {
                    // Up to 3 octal digits: \NNN
                    let mut value: u8 = 0;
                    let mut count = 0;
                    let mut j = i + 1;
                    while count < 3 && j < bytes.len() && (b'0'..=b'7').contains(&bytes[j]) {
                        value = (value << 3) | (bytes[j] - b'0');
                        j += 1;
                        count += 1;
                    }
                    out.push(value);
                    i = j;
                }
                other => {
                    out.push(other);
                    i += 2;
                }
            }
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn is_git_repo(root: &Path) -> Result<bool, String> {
    let output = run_git(root, &["rev-parse", "--is-inside-work-tree"]);
    match output {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout);
            Ok(text.trim() == "true")
        }
        Ok(_) => Ok(false),
        Err(error) if error.contains("git binary not found") => Err(error),
        Err(_) => Ok(false),
    }
}

fn require_git_repo(root: &Path) -> Result<(), String> {
    if is_git_repo(root)? {
        Ok(())
    } else {
        Err("Not a git repository".to_string())
    }
}

fn init_repo(vault_path: &str) -> Result<Value, String> {
    let root = normalize_vault_path(vault_path)?;
    let _ = git_binary()?;
    if is_git_repo(&root)? {
        return get_status(vault_path);
    }
    let output = run_git(&root, &["init"])?;
    if !output.status.success() {
        return Err(format_command_failure("git init", &output));
    }
    get_status(vault_path)
}

fn normalize_vault_path(vault_path: &str) -> Result<PathBuf, String> {
    let trimmed = vault_path.trim();
    if trimmed.is_empty() {
        return Err("Missing vaultPath".to_string());
    }
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err("vaultPath must be absolute".to_string());
    }
    Ok(path)
}

fn sanitize_relative_path(path: &str) -> Result<String, String> {
    // Decode leftover C-quoted escapes before validation (in case UI still
    // holds previously displayed escaped paths until status is refreshed).
    let decoded = unescape_path(path);
    let normalized = decoded.replace('\\', "/");
    let trimmed = normalized.trim().trim_start_matches('/');
    if trimmed.is_empty() {
        return Err("Path is empty".to_string());
    }
    if trimmed.starts_with("..") || trimmed.contains("/../") || trimmed.ends_with("/..") {
        return Err(format!("Refusing path outside vault: {path}"));
    }
    if Path::new(trimmed).is_absolute() {
        return Err(format!("Expected vault-relative path: {path}"));
    }
    Ok(trimmed.to_string())
}

fn sanitize_relative_paths(paths: &[String]) -> Result<Vec<String>, String> {
    paths.iter().map(|path| sanitize_relative_path(path)).collect()
}

fn run_git(root: &Path, args: &[&str]) -> Result<Output, String> {
    let git = git_binary()?;
    let mut command = Command::new(&git);
    command.arg("-C").arg(root);
    // Show UTF-8 paths instead of \NNN octal escapes for non-ASCII names.
    command.args(["-c", "core.quotepath=false"]);
    command.args(args);
    // Avoid interactive prompts hanging the sidecar.
    command.env("GIT_TERMINAL_PROMPT", "0");
    command.env("GIT_OPTIONAL_LOCKS", "0");
    command
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))
}

fn git_binary() -> Result<PathBuf, String> {
    static GIT_PATH: OnceLock<Result<PathBuf, String>> = OnceLock::new();
    GIT_PATH
        .get_or_init(resolve_git_binary)
        .clone()
}

fn resolve_git_binary() -> Result<PathBuf, String> {
    // Prefer login-shell PATH resolution so Electron's stripped PATH still finds git.
    #[cfg(unix)]
    {
        if let Ok(output) = Command::new("sh").args(["-lc", "command -v git"]).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(PathBuf::from(path));
                }
            }
        }
    }

    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("where.exe").arg("git").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    return Ok(PathBuf::from(path));
                }
            }
        }
    }

    // Fallback: hope `git` is on the inherited PATH.
    if Command::new("git")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
    {
        return Ok(PathBuf::from("git"));
    }

    Err("git binary not found on PATH".to_string())
}

fn format_command_failure(label: &str, output: &Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stderr.is_empty() {
        format!("{label} failed:\n{stderr}")
    } else if !stdout.is_empty() {
        format!("{label} failed:\n{stdout}")
    } else {
        format!(
            "{label} failed with exit code {}",
            output.status.code().unwrap_or(-1)
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command;

    #[test]
    fn parses_untracked_and_modified() {
        let untracked = parse_porcelain_v2_entry("? notes/a.md").unwrap();
        assert!(untracked.untracked);
        assert_eq!(untracked.path, "notes/a.md");

        let modified = parse_porcelain_v2_entry(
            "1 .M N... 100644 100644 100644 aaa bbb notes/b.md",
        )
        .unwrap();
        assert!(modified.unstaged);
        assert!(!modified.staged);
        assert_eq!(modified.path, "notes/b.md");
    }

    #[test]
    fn parses_unmerged_conflict_path() {
        let conflict = parse_porcelain_v2_entry(
            "u UU N... 100644 100644 100644 100644 aaa bbb ccc notes/c.md",
        )
        .unwrap();
        assert!(conflict.conflict);
        assert_eq!(conflict.path, "notes/c.md");
        assert_eq!(conflict.status, "UU");
    }

    #[test]
    fn rejects_parent_paths() {
        assert!(sanitize_relative_path("../secret").is_err());
        assert!(sanitize_relative_path("ok/file.md").is_ok());
    }

    #[test]
    fn sanitize_branch_allows_common_names() {
        assert_eq!(
            sanitize_branch_name("feat/50543329/knowledge_0601").unwrap(),
            "feat/50543329/knowledge_0601"
        );
        assert!(sanitize_branch_name("-bad").is_err());
        assert!(sanitize_branch_name("has space").is_err());
    }

    #[test]
    fn resolve_remote_prefers_origin() {
        let remote = vec![
            "origin/main".to_string(),
            "upstream/main".to_string(),
            "origin/feat/x".to_string(),
        ];
        assert_eq!(
            resolve_remote_branch("main", &remote).as_deref(),
            Some("origin/main")
        );
        assert_eq!(
            resolve_remote_branch("origin/feat/x", &remote).as_deref(),
            Some("origin/feat/x")
        );
    }

    #[test]
    fn decodes_octal_quoted_chinese_path() {
        // Matches git quotepath output: \350\264\235 = 贝 (E8 B4 9D)
        let decoded = unescape_path(r#""01-\350\264\235\346\230\223/a.md""#);
        assert_eq!(decoded, "01-贝易/a.md");
    }

    #[test]
    fn init_repo_creates_worktree() {
        let dir = tempfile::tempdir().expect("tempdir");
        let root = dir.path().to_str().unwrap();
        let before = get_status(root).expect("status before");
        assert_eq!(before["isRepo"], false);
        let after = init_repo(root).expect("init");
        assert_eq!(after["isRepo"], true);
        let again = init_repo(root).expect("idempotent init");
        assert_eq!(again["isRepo"], true);
    }

    #[test]
    fn status_roundtrip_on_temp_repo() {
        let dir = tempfile::tempdir().expect("tempdir");
        let root = dir.path();
        assert!(
            Command::new("git")
                .args(["init"])
                .current_dir(root)
                .status()
                .expect("git init")
                .success()
        );
        assert!(
            Command::new("git")
                .args(["config", "user.email", "test@example.com"])
                .current_dir(root)
                .status()
                .unwrap()
                .success()
        );
        assert!(
            Command::new("git")
                .args(["config", "user.name", "Test"])
                .current_dir(root)
                .status()
                .unwrap()
                .success()
        );

        fs::write(root.join("hello.md"), "hello\n").unwrap();
        let status = get_status(root.to_str().unwrap()).expect("status");
        assert_eq!(status["isRepo"], true);
        assert_eq!(status["dirty"], true);
        assert!(status["files"].as_array().unwrap().iter().any(|file| {
            file["path"] == "hello.md" && file["untracked"] == true
        }));

        stage_paths(root.to_str().unwrap(), &["hello.md".to_string()]).unwrap();
        commit(root.to_str().unwrap(), "add hello", &[]).unwrap();
        let clean = get_status(root.to_str().unwrap()).unwrap();
        assert_eq!(clean["dirty"], false);
    }
}
