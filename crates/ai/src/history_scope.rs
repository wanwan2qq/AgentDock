use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const SCOPE_FILE: &str = "scope.json";
const SCOPE_VERSION: u32 = 1;
const PASTED_IMAGE_PREFIX: &str = "pasted-image-";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HistoryScope {
    Device,
    Vault,
}

impl HistoryScope {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Device => "device",
            Self::Vault => "vault",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScopeState {
    version: u32,
    scope: HistoryScope,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HistoryLocation {
    pub scope: HistoryScope,
    pub vault_key: String,
    pub persistence_root: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStorageStatus {
    pub scope: HistoryScope,
    pub store_in_vault: bool,
    pub session_count: usize,
    pub device_session_count: usize,
    pub vault_session_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStorageMoveResult {
    pub scope: HistoryScope,
    pub store_in_vault: bool,
    pub moved_sessions: usize,
    pub moved_attachments: usize,
}

pub fn vault_key(canonical_vault_path: &str) -> String {
    sha256_hex(canonical_vault_path.as_bytes())
}

pub fn device_store_root(app_data: &Path, vault_key: &str) -> PathBuf {
    app_data
        .join("ai-history")
        .join("v1")
        .join("vaults")
        .join(vault_key)
}

pub fn sessions_dir(persistence_root: &Path) -> PathBuf {
    persistence_root.join(".neverwrite").join("sessions")
}

pub fn chat_assets_dir(persistence_root: &Path) -> PathBuf {
    persistence_root.join("assets").join("chat")
}

pub fn resolve_history_location(
    app_data: &Path,
    vault_root: &Path,
) -> Result<HistoryLocation, String> {
    let canonical = canonical_vault_path(vault_root)?;
    let key = vault_key(&canonical);
    let device_root = device_store_root(app_data, &key);
    let scope = read_scope(&device_root)?.unwrap_or_else(|| {
        if has_session_artifacts(&sessions_dir(vault_root)) {
            HistoryScope::Vault
        } else {
            HistoryScope::Device
        }
    });

    if read_scope(&device_root)?.is_none() {
        write_scope(&device_root, scope)?;
    }

    Ok(location_for(scope, key, vault_root, &device_root))
}

pub fn history_storage_status(
    app_data: &Path,
    vault_root: &Path,
) -> Result<HistoryStorageStatus, String> {
    let location = resolve_history_location(app_data, vault_root)?;
    let device_count = count_sessions(&sessions_dir(&device_store_root(
        app_data,
        &location.vault_key,
    )));
    let vault_count = count_sessions(&sessions_dir(vault_root));
    let session_count = match location.scope {
        HistoryScope::Device => device_count,
        HistoryScope::Vault => vault_count,
    };
    Ok(HistoryStorageStatus {
        store_in_vault: matches!(location.scope, HistoryScope::Vault),
        scope: location.scope,
        session_count,
        device_session_count: device_count,
        vault_session_count: vault_count,
    })
}

pub fn set_history_scope(
    app_data: &Path,
    vault_root: &Path,
    store_in_vault: bool,
) -> Result<HistoryStorageMoveResult, String> {
    let current = resolve_history_location(app_data, vault_root)?;
    let target = if store_in_vault {
        HistoryScope::Vault
    } else {
        HistoryScope::Device
    };
    if current.scope == target {
        return Ok(HistoryStorageMoveResult {
            scope: current.scope,
            store_in_vault,
            moved_sessions: 0,
            moved_attachments: 0,
        });
    }

    let canonical = canonical_vault_path(vault_root)?;
    let key = vault_key(&canonical);
    let device_root = device_store_root(app_data, &key);
    let source_root = current.persistence_root.clone();
    let dest_root = match target {
        HistoryScope::Device => device_root.clone(),
        HistoryScope::Vault => vault_root.to_path_buf(),
    };

    let moved = migrate_store(&source_root, &dest_root)?;
    write_scope(&device_root, target)?;
    Ok(HistoryStorageMoveResult {
        scope: target,
        store_in_vault,
        moved_sessions: moved.sessions,
        moved_attachments: moved.attachments,
    })
}

pub fn save_chat_attachment(
    persistence_root: &Path,
    file_name: &str,
    bytes: &[u8],
) -> Result<SavedChatAttachment, String> {
    let safe_name = sanitize_attachment_name(file_name)?;
    let dir = chat_assets_dir(persistence_root);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(&safe_name);
    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    Ok(SavedChatAttachment {
        path: path.to_string_lossy().to_string(),
        relative_path: format!("assets/chat/{safe_name}"),
        file_name: safe_name,
        mime_type: mime_from_name(file_name),
    })
}

pub fn delete_chat_attachment(
    persistence_root: &Path,
    relative_or_absolute: &str,
) -> Result<(), String> {
    let assets = chat_assets_dir(persistence_root);
    let path = PathBuf::from(relative_or_absolute);
    let target = if path.is_absolute() {
        path
    } else {
        persistence_root.join(path)
    };
    if !target.starts_with(&assets) {
        return Err("Refusing to delete a file outside chat attachment storage.".to_string());
    }
    match fs::remove_file(&target) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SavedChatAttachment {
    pub path: String,
    pub relative_path: String,
    pub file_name: String,
    pub mime_type: Option<String>,
}

struct MoveCounts {
    sessions: usize,
    attachments: usize,
}

fn location_for(
    scope: HistoryScope,
    vault_key: String,
    vault_root: &Path,
    device_root: &Path,
) -> HistoryLocation {
    HistoryLocation {
        scope,
        vault_key,
        persistence_root: match scope {
            HistoryScope::Device => device_root.to_path_buf(),
            HistoryScope::Vault => vault_root.to_path_buf(),
        },
    }
}

fn canonical_vault_path(vault_root: &Path) -> Result<String, String> {
    let canonical = fs::canonicalize(vault_root).unwrap_or_else(|_| vault_root.to_path_buf());
    Ok(canonical
        .to_string_lossy()
        .trim_end_matches(['/', '\\'])
        .to_string())
}

fn scope_path(device_root: &Path) -> PathBuf {
    device_root.join(SCOPE_FILE)
}

fn read_scope(device_root: &Path) -> Result<Option<HistoryScope>, String> {
    let path = scope_path(device_root);
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let state: ScopeState = serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    if state.version != SCOPE_VERSION {
        return Err("Unsupported AI history scope version.".to_string());
    }
    Ok(Some(state.scope))
}

fn write_scope(device_root: &Path, scope: HistoryScope) -> Result<(), String> {
    fs::create_dir_all(device_root).map_err(|error| error.to_string())?;
    let state = ScopeState {
        version: SCOPE_VERSION,
        scope,
    };
    let raw = serde_json::to_string_pretty(&state).map_err(|error| error.to_string())?;
    fs::write(scope_path(device_root), raw).map_err(|error| error.to_string())
}

fn has_session_artifacts(sessions_dir: &Path) -> bool {
    count_sessions(sessions_dir) > 0
}

fn count_sessions(sessions_dir: &Path) -> usize {
    session_keys(sessions_dir).len()
}

fn session_keys(sessions_dir: &Path) -> Vec<String> {
    let entries = match fs::read_dir(sessions_dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };
    let mut keys = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let file_type = entry.file_type().ok();
        if file_type.is_some_and(|kind| kind.is_dir()) && name.starts_with("session-") {
            keys.push(name.into_owned());
        } else if file_type.is_some_and(|kind| kind.is_file()) && name.ends_with(".json") {
            keys.push(name.into_owned());
        }
    }
    keys.sort();
    keys
}

fn migrate_store(source_root: &Path, dest_root: &Path) -> Result<MoveCounts, String> {
    let source_sessions = sessions_dir(source_root);
    let dest_sessions = sessions_dir(dest_root);
    let source_keys = session_keys(&source_sessions);
    let dest_keys = session_keys(&dest_sessions);

    if !dest_keys.is_empty() && dest_keys != source_keys {
        return Err(
            "Destination already has different AI chat history. Inspect both locations before moving."
                .to_string(),
        );
    }

    if dest_keys.is_empty() && !source_keys.is_empty() {
        copy_dir_contents(&source_sessions, &dest_sessions)?;
        if session_keys(&dest_sessions) != source_keys {
            return Err("Moved chat history failed verification.".to_string());
        }
    }

    let moved_attachments = copy_pasted_images(source_root, dest_root)?;
    rewrite_attachment_paths(dest_root, source_root, dest_root)?;

    if source_sessions.exists() && source_sessions != dest_sessions {
        remove_dir_contents(&source_sessions)?;
    }
    remove_copied_pasted_images(source_root)?;

    Ok(MoveCounts {
        sessions: source_keys.len(),
        attachments: moved_attachments,
    })
}

fn copy_pasted_images(source_root: &Path, dest_root: &Path) -> Result<usize, String> {
    let source_dir = chat_assets_dir(source_root);
    let dest_dir = chat_assets_dir(dest_root);
    let entries = match fs::read_dir(&source_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(0),
    };
    fs::create_dir_all(&dest_dir).map_err(|error| error.to_string())?;
    let mut moved = 0_usize;
    for entry in entries.flatten() {
        if !entry
            .file_type()
            .map(|kind| kind.is_file())
            .unwrap_or(false)
        {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !name.starts_with(PASTED_IMAGE_PREFIX) {
            continue;
        }
        fs::copy(entry.path(), dest_dir.join(entry.file_name()))
            .map_err(|error| error.to_string())?;
        moved += 1;
    }
    Ok(moved)
}

fn remove_copied_pasted_images(source_root: &Path) -> Result<(), String> {
    let source_dir = chat_assets_dir(source_root);
    let entries = match fs::read_dir(&source_dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        if name.to_string_lossy().starts_with(PASTED_IMAGE_PREFIX) {
            fs::remove_file(entry.path()).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn rewrite_attachment_paths(
    sessions_root_parent: &Path,
    source_root: &Path,
    dest_root: &Path,
) -> Result<(), String> {
    let from = chat_assets_dir(source_root)
        .to_string_lossy()
        .replace('\\', "/");
    let to = chat_assets_dir(dest_root)
        .to_string_lossy()
        .replace('\\', "/");
    if from == to {
        return Ok(());
    }
    let sessions = sessions_dir(sessions_root_parent);
    let entries = match fs::read_dir(&sessions) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };
    for entry in entries.flatten() {
        if !entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false) {
            continue;
        }
        rewrite_path_in_file(&entry.path().join("transcript.jsonl"), &from, &to)?;
        rewrite_path_in_file(&entry.path().join("session-meta.json"), &from, &to)?;
    }
    Ok(())
}

fn rewrite_path_in_file(path: &Path, from: &str, to: &str) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let normalized = raw.replace('\\', "/");
    if !normalized.contains(from) {
        return Ok(());
    }
    fs::write(path, normalized.replace(from, to)).map_err(|error| error.to_string())
}

fn copy_dir_contents(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|error| error.to_string())?;
    let entries = fs::read_dir(src).map_err(|error| error.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let dest = dst.join(entry.file_name());
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            copy_dir_contents(&entry.path(), &dest)?;
        } else {
            fs::copy(entry.path(), dest).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn remove_dir_contents(dir: &Path) -> Result<(), String> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_dir()
        {
            fs::remove_dir_all(&path).map_err(|error| error.to_string())?;
        } else {
            fs::remove_file(&path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn sanitize_attachment_name(file_name: &str) -> Result<String, String> {
    let name = Path::new(file_name)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Invalid chat attachment name.".to_string())?;
    if name.is_empty() || name.contains("..") {
        return Err("Invalid chat attachment name.".to_string());
    }
    Ok(name.to_string())
}

fn mime_from_name(file_name: &str) -> Option<String> {
    match Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Some("image/png".to_string()),
        Some("jpg" | "jpeg") => Some("image/jpeg".to_string()),
        Some("gif") => Some("image/gif".to_string()),
        Some("webp") => Some("image/webp".to_string()),
        Some("avif") => Some("image/avif".to_string()),
        Some("bmp") => Some("image/bmp".to_string()),
        _ => None,
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher
        .finalize()
        .iter()
        .fold(String::with_capacity(64), |mut acc, byte| {
            use std::fmt::Write as _;
            let _ = write!(&mut acc, "{byte:02x}");
            acc
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_DIR_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_dir(label: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let unique = TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!(
            "agentdock-history-scope-{label}-{}-{suffix}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    fn write_session(root: &Path, session_id: &str, file_path: &str) {
        let dir = sessions_dir(root).join(format!("session-{session_id}"));
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("session-meta.json"),
            format!(r#"{{"session_id":"{session_id}"}}"#),
        )
        .unwrap();
        fs::write(
            dir.join("transcript.jsonl"),
            format!(r#"{{"filePath":"{file_path}"}}"#),
        )
        .unwrap();
    }

    #[test]
    fn new_vault_defaults_to_device_storage() {
        let app_data = temp_dir("app");
        let vault = temp_dir("vault");
        let location = resolve_history_location(&app_data, &vault).unwrap();
        assert_eq!(location.scope, HistoryScope::Device);
        assert!(location
            .persistence_root
            .to_string_lossy()
            .contains("ai-history"));
        fs::remove_dir_all(app_data).ok();
        fs::remove_dir_all(vault).ok();
    }

    #[test]
    fn existing_vault_sessions_are_adopted() {
        let app_data = temp_dir("app");
        let vault = temp_dir("vault");
        write_session(&vault, "abc", "/vault/assets/chat/pasted-image-1.png");
        let location = resolve_history_location(&app_data, &vault).unwrap();
        assert_eq!(location.scope, HistoryScope::Vault);
        assert_eq!(location.persistence_root, vault);
        fs::remove_dir_all(app_data).ok();
        fs::remove_dir_all(vault).ok();
    }

    #[test]
    fn moving_vault_history_to_device_copies_then_clears_source() {
        let app_data = temp_dir("app");
        let vault = temp_dir("vault");
        let attachment = chat_assets_dir(&vault).join("pasted-image-1.png");
        fs::create_dir_all(attachment.parent().unwrap()).unwrap();
        fs::write(&attachment, b"png").unwrap();
        write_session(
            &vault,
            "abc",
            &attachment.to_string_lossy().replace('\\', "/"),
        );

        let moved = set_history_scope(&app_data, &vault, false).unwrap();
        assert_eq!(moved.moved_sessions, 1);
        assert_eq!(moved.moved_attachments, 1);
        assert_eq!(moved.scope, HistoryScope::Device);

        let status = history_storage_status(&app_data, &vault).unwrap();
        assert_eq!(status.scope, HistoryScope::Device);
        assert_eq!(status.device_session_count, 1);
        assert_eq!(status.vault_session_count, 0);
        assert!(!attachment.exists());

        let device_root = device_store_root(
            &app_data,
            &vault_key(&canonical_vault_path(&vault).unwrap()),
        );
        let transcript = fs::read_to_string(
            sessions_dir(&device_root)
                .join("session-abc")
                .join("transcript.jsonl"),
        )
        .unwrap();
        assert!(transcript.contains("ai-history"));
        assert!(!transcript.contains(&vault.to_string_lossy().replace('\\', "/")));

        fs::remove_dir_all(app_data).ok();
        fs::remove_dir_all(vault).ok();
    }

    #[test]
    fn refuses_to_clobber_a_conflicting_destination() {
        let app_data = temp_dir("app");
        let vault = temp_dir("vault");
        write_session(&vault, "abc", "/vault/a.png");
        let device_root = device_store_root(
            &app_data,
            &vault_key(&canonical_vault_path(&vault).unwrap()),
        );
        write_session(&device_root, "other", "/device/b.png");
        write_scope(&device_root, HistoryScope::Vault).unwrap();

        let error = set_history_scope(&app_data, &vault, false).unwrap_err();
        assert!(error.contains("different AI chat history"));

        fs::remove_dir_all(app_data).ok();
        fs::remove_dir_all(vault).ok();
    }
}
