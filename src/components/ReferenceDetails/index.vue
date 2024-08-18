
<template>
    <div v-if="reference !== undefined" class="break-words">
        <div class="flex justify-end gap-1 flex-wrap mb-2">
            <btn v-if="reference.type === 'local_branch'" :disabled="isCurrentBranch(reference)" @click="checkoutBranch">
                <icon name="mdi-target" class="size-5" />
                Checkout
            </btn>
            <btn v-if="reference.type === 'local_branch'" @click="show_rename_modal = true">
                <icon name="mdi-pencil" class="size-5" />
                Rename
            </btn>
            <btn :disabled="isCurrentBranch(reference)" @click="deleteReference">
                <icon name="mdi-delete" class="size-5" />
                Delete
            </btn>

            <RenameModal v-if="show_rename_modal" :reference @close="show_rename_modal = false" />
        </div>

        <div class="text-sm text-gray">
            {{ $_.title(reference.type) }}
        </div>
        <div class="text-xl">
            {{ reference.name }}
        </div>

        <div class="flex justify-end mt-2">
            <btn class="font-mono" title="View commit" @click="selected_commit = Object.freeze(commit_by_hash[reference.hash])">
                <icon name="mdi-source-commit" class="size-5"></icon>
                {{ reference.hash.slice(0, 7) }}
            </btn>
        </div>
    </div>
</template>

<script>
    import RenameModal from './RenameModal';

    export default {
        components: { RenameModal },
        inject: [
            'selected_reference',
            'isCurrentBranch', 'refreshHistory', 'refreshStatus',
        ],
        data: () => ({
            show_rename_modal: false,
        }),
        computed: {
            reference() {
                return this.selected_reference;
            },
        },
        methods: {
            async checkoutBranch() {
                await repo.callGit('checkout', this.reference.name);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async deleteReference() {
                if (this.reference.type === 'local_branch') {
                    await repo.callGit('branch', '--delete', this.reference.name, '--force');
                } else if (this.reference.type === 'remote_branch') {
                    // Delete only the local remote-tracking branch.
                    // https://stackoverflow.com/questions/2003505/how-do-i-delete-a-git-branch-locally-and-remotely
                    await repo.callGit('branch', '--delete', this.reference.name, '--remotes');
                } else if (this.reference.type === 'tag') {
                    await repo.callGit('tag', '--delete', this.reference.name);
                }
                await this.refreshHistory();
            },
        },
    };
</script>
