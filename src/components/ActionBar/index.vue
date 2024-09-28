
<template>
    <div class="flex gap-2 justify-center">
        <template v-for="action in actions">
            <hr v-if="action.separator" class="mx-1" />
            <btn
                v-else
                :click_twice="action.click_twice ? 'text-accent' : false"
                :disabled="action.disabled"
                @click="action.callback"
            >
                <icon :name="action.icon" class="size-6" />
                {{ action.label }}
            </btn>
        </template>
    </div>
</template>

<script>
    export default {
        inject: [
            'repo', 'config', 'references_by_type', 'current_branch_name', 'current_head', 'uncommitted_changes_count',
            'saveSelectedFile', 'refreshHistory', 'refreshStatus',
        ],
        computed: {
            last_wip_branch() {
                const branches = _.filter(this.references_by_type.local_branch ?? [], branch => branch.name.match(/^wip-\d+/));
                return _.last(branches);
            },
            actions() {
                return [
                    {
                        icon: 'mdi-archive-arrow-down-outline',
                        label: 'Save WIP',
                        callback: this.saveWip,
                        disabled: (this.uncommitted_changes_count ?? 0) === 0,
                    },
                    {
                        icon: 'mdi-archive-arrow-up-outline',
                        label: 'Restore WIP',
                        callback: this.restoreWip,
                        disabled: this.last_wip_branch === undefined,
                    },
                    {
                        separator: true,
                    },
                    {
                        icon: 'mdi-console',
                        label: 'Open terminal',
                        callback: this.repo.openTerminal,
                    },
                    ...this.config?.custom_actions ? [
                        {
                            separator: true,
                        },
                        ...this.config.custom_actions.map(action => ({
                            ...action,
                            callback: () => this.repo.callGit(...action.command),
                        })),
                    ] : [],
                ];
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
        },
    };
</script>
