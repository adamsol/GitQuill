
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
            'references_by_type', 'uncommitted_changes_count', 'current_branch_name', 'current_head',
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
                    repo.callGit('checkout', '-b', `wip-${formatted_time}`),
                    repo.callGit('add', '--all'),
                ]);
                await repo.callGit('commit', '--message', 'WIP', '--no-verify');
                await repo.callGit('checkout', this.current_branch_name ?? this.current_head);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async restoreWip() {
                await this.saveSelectedFile();
                try {
                    await repo.callGit('cherry-pick', this.last_wip_branch.hash, '--no-commit');
                    await repo.callGit('branch', '--delete', this.last_wip_branch.name, '--force');
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async openTerminal() {
                await repo.openTerminal();
            },
        },
    };
</script>
