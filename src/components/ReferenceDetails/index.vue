
<template>
    <div v-if="reference !== undefined" class="break-words">
        <div class="flex justify-end gap-1 flex-wrap mb-3">
            <div v-if="current_operation?.conflict" class="text-gray italic">
                Functionality limited during conflict
            </div>
            <template v-else>
                <template v-if="reference.type === 'local_branch'">
                    <btn :disabled="isCurrentBranch(reference)" @click="checkoutBranch">
                        <icon name="mdi-target" class="size-5" />
                        Checkout branch
                    </btn>
                    <btn :disabled="isCurrentBranch(reference)" @click="mergeBranch">
                        <icon name="mdi-source-pull" class="size-5" />
                        Merge branch
                    </btn>
                    <btn v-if="is_wip" @click="restoreWip">
                        <icon name="mdi-archive-arrow-up-outline" class="size-5" />
                        Restore WIP
                    </btn>
                    <btn v-else :disabled="current_head === reference.hash" @click="resetBranchToHead">
                        <icon name="mdi-undo" class="size-5" />
                        Reset branch to HEAD
                    </btn>
                    <btn @click="show_rename_modal = true">
                        <icon name="mdi-pencil" class="size-5" />
                        Rename
                    </btn>
                </template>
                <btn :disabled="isCurrentBranch(reference)" @click="deleteReference">
                    <icon name="mdi-delete" class="size-5" />
                    Delete
                </btn>
                <RenameModal v-if="show_rename_modal" :reference @close="show_rename_modal = false" />
            </template>
        </div>

        <div class="text-sm text-gray">
            {{ $_.title(reference.type) }}
        </div>
        <div class="text-xl">
            {{ reference.name }}
        </div>

        <div class="mt-3">
            <div v-if="hidden_references.has(reference.id)" class="text-gray">
                hidden in the graph
            </div>
            <div v-else>
                <div class="text-xs text-gray">
                    commit:
                </div>
                <commit-link :hash="reference.hash" />
            </div>
        </div>
    </div>
</template>

<script>
    import RenameModal from './RenameModal';

    export default {
        components: { RenameModal },
        inject: [
            'repo', 'selected_reference', 'hidden_references', 'current_head', 'current_operation',
            'isCurrentBranch', 'refreshHistory', 'refreshStatus',
        ],
        data: () => ({
            show_rename_modal: false,
        }),
        computed: {
            reference() {
                return this.selected_reference;
            },
            is_wip() {
                return this.selected_reference.type === 'local_branch' && this.selected_reference.name.startsWith(settings.wip_prefix);
            },
        },
        methods: {
            async checkoutBranch() {
                await this.repo.callGit('checkout', this.reference.name);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async mergeBranch() {
                try {
                    await this.repo.callGit('merge', this.reference.name, '--no-ff');
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async restoreWip() {
                try {
                    await this.repo.callGit('cherry-pick', this.reference.hash, '--no-commit');
                    await this.repo.callGit('branch', '--delete', this.reference.name, '--force');
                } finally {
                    await this.repo.deleteFile('.git/MERGE_MSG');
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async resetBranchToHead() {
                const msg = `Reset local branch: ${this.reference.name} (was ${this.reference.hash})`;
                await this.repo.callGit('branch', this.reference.name, '--force', { msg });
                await this.refreshHistory();
            },
            async deleteReference() {
                if (this.reference.type === 'local_branch') {
                    const msg = `Deleted local branch: ${this.reference.name} (was ${this.reference.hash})`;
                    await this.repo.callGit('branch', '--delete', this.reference.name, '--force', { msg });
                } else if (this.reference.type === 'remote_branch') {
                    // Delete only the local remote-tracking branch.
                    // https://stackoverflow.com/questions/2003505/how-do-i-delete-a-git-branch-locally-and-remotely
                    const msg = `Deleted remote-tracking branch: ${this.reference.name} (was ${this.reference.hash})`;
                    await this.repo.callGit('branch', '--delete', this.reference.name, '--remotes', { msg });
                } else if (this.reference.type === 'tag') {
                    const msg = `Deleted tag: ${this.reference.name} (was ${this.reference.hash})`;
                    await this.repo.callGit('tag', '--delete', this.reference.name, { msg });
                }
                this.hidden_references.delete(this.reference.id);
                await this.refreshHistory();
            },
        },
    };
</script>
