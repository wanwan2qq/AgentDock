export interface GitFileStatus {
    path: string;
    status: string;
    staged: boolean;
    unstaged: boolean;
    untracked: boolean;
    conflict: boolean;
}

export interface GitStatusSnapshot {
    isRepo: boolean;
    branch: string | null;
    upstream: string | null;
    ahead: number;
    behind: number;
    dirty: boolean;
    files: GitFileStatus[];
    conflicts: string[];
    hasGit: boolean;
    /** True when `.neverwrite/` is already covered by gitignore (or not a repo). */
    neverwriteIgnored: boolean;
}

export interface GitDiffResult {
    path: string | null;
    staged: boolean;
    diff: string;
}

export interface GitCommandResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    commitHash?: string | null;
    branch?: string | null;
    status: GitStatusSnapshot;
}

export interface GitBranchList {
    current: string | null;
    local: string[];
    remote: string[];
}
