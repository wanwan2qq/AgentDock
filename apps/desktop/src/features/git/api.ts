import { vaultInvoke } from "../../app/utils/vaultInvoke";
import type {
    GitBranchList,
    GitCommandResult,
    GitDiffResult,
    GitStatusSnapshot,
} from "./types";

export function fetchGitStatus() {
    return vaultInvoke<GitStatusSnapshot>("git_get_status");
}

export function initGitRepo() {
    return vaultInvoke<GitStatusSnapshot>("git_init");
}

export function fetchGitDiff(path?: string, staged = false) {
    return vaultInvoke<GitDiffResult>("git_diff", {
        path: path ?? null,
        staged,
    });
}

export function stageGitPaths(paths: string[]) {
    return vaultInvoke<GitStatusSnapshot>("git_stage", { paths });
}

export function unstageGitPaths(paths: string[]) {
    return vaultInvoke<GitStatusSnapshot>("git_unstage", { paths });
}

export function commitGitChanges(message: string, paths: string[] = []) {
    return vaultInvoke<GitCommandResult>("git_commit", { message, paths });
}

export function pullGit() {
    return vaultInvoke<GitCommandResult>("git_pull");
}

export function pushGit() {
    return vaultInvoke<GitCommandResult>("git_push");
}

export function fetchGitBranches() {
    return vaultInvoke<GitBranchList>("git_list_branches");
}

export function checkoutGitBranch(branch: string) {
    return vaultInvoke<GitCommandResult>("git_checkout", {
        branch,
        createTracking: true,
    });
}

export function ignoreNeverwriteDirectory() {
    return vaultInvoke<GitStatusSnapshot>("git_ignore_neverwrite");
}
