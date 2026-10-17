
async function runCherryPickNoCommit(rev) {
    try {
        await this.repo.callGit('cherry-pick', rev, '--no-commit');
    } finally {
        await this.repo.deleteFile('.git/MERGE_MSG');  // To avoid a misleading conflict message when rebasing.
    }
}

export async function saveWip(unstaged_only = false) {
    await this.saveSelectedFile();

    // https://stackoverflow.com/questions/17415579/how-to-iso-8601-format-a-date-with-timezone-offset-in-javascript
    const formatted_time = new Date().toLocaleString('sv').replace(/\D/g, '');
    const wip_name = settings.wip_prefix + formatted_time;

    try {
        await this.repo.callGit('checkout', '-b', wip_name);
        if (unstaged_only) {
            if (this.working_tree_files.staged.length > 0) {
                await this.repo.callGit('commit', '--message', 'WIP (staged)', '--no-verify');
            } else {
                unstaged_only = false;
            }
        }
        await this.repo.callGit('add', '--all');
        await this.repo.callGit('commit', '--message', 'WIP', '--no-verify');
        await this.repo.callGit('checkout', this.current_branch_name ?? this.current_head);
        if (unstaged_only) {
            await runCherryPickNoCommit.call(this, `${wip_name}^`);
        }
    } finally {
        await Promise.all([
            this.refreshHistory(),
            this.refreshStatus(),
        ]);
    }
}

export async function restoreWip(branch) {
    try {
        await runCherryPickNoCommit.call(this, branch.hash);

        const msg = `Deleted local branch: ${branch.name} (was ${branch.hash})`;
        await this.repo.callGit('branch', '--delete', branch.name, '--force', { msg });

    } finally {
        await Promise.all([
            this.refreshHistory(),
            this.refreshStatus(),
        ]);
    }
}
