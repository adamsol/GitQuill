
export async function restoreWip(branch) {
    try {
        await this.repo.callGit('cherry-pick', branch.hash, '--no-commit');

        const msg = `Deleted local branch: ${branch.name} (was ${branch.hash})`;
        await this.repo.callGit('branch', '--delete', branch.name, '--force', { msg });

    } finally {
        // For rebasing.
        await this.repo.deleteFile('.git/MERGE_MSG');

        await Promise.all([
            this.refreshHistory(),
            this.refreshStatus(),
        ]);
    }
}
