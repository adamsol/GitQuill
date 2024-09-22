
<template>
    <div class="flex gap-2 justify-center">
        <btn :disabled="uncommitted_changes_count === 0" @click="saveWip">
            <icon name="mdi-archive-arrow-down-outline" class="size-6" />
            Save WIP
        </btn>
        <btn :disabled="last_wip_branch === undefined" @click="restoreWip">
            <icon name="mdi-archive-arrow-up-outline" class="size-6" />
            Restore WIP
        </btn>
        <btn @click="openTerminal">
            <icon name="mdi-console" class="size-6" />
            Open terminal
        </btn>
    </div>
</template>

<script>
    export default {
        inject: [
            'repo', 'references_by_type', 'current_branch_name', 'current_head', 'uncommitted_changes_count',
            'saveSelectedFile', 'refreshHistory', 'refreshStatus',
        ],
        computed: {
            last_wip_branch() {
                const branches = _.filter(this.references_by_type.local_branch ?? [], branch => branch.name.match(/^wip-\d+/));
                return _.last(branches);
            },
        },
        methods: {
            async saveWip() {
                await this.saveSelectedFile();

                // https://stackoverflow.com/questions/17415579/how-to-iso-8601-format-a-date-with-timezone-offset-in-javascript
                const formatted_time = new Date().toLocaleString('sv').replace(/\D/g, '');
                await Promise.all([
                    this.repo.callGit('checkout', '-b', `wip-${formatted_time}`),
                    this.repo.callGit('add', '--all'),
                ]);
                await this.repo.callGit('commit', '--message', 'WIP', '--no-verify');
                await this.repo.callGit('checkout', this.current_branch_name ?? this.current_head);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async restoreWip() {
                await this.saveSelectedFile();
                try {
                    await this.repo.callGit('cherry-pick', this.last_wip_branch.hash, '--no-commit');
                    await this.repo.callGit('branch', '--delete', this.last_wip_branch.name, '--force');
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async openTerminal() {
                await this.repo.openTerminal();
            },
        },
    };
</script>
