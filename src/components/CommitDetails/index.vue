
<template>
    <div v-if="files !== undefined" class="h-full break-words">
        <splitpanes
            v-if="commit.hash === 'WORKING_TREE' && second_commit === null"
            horizontal
            @resized="commit_pane_size = $event[1].size"
        >
            <pane class="min-h-40">
                <splitpanes
                    horizontal
                    @resized="unstaged_pane_size = $event[0].size"
                >
                    <pane
                        v-for="(area, i) in ['unstaged', 'staged']"
                        class="min-h-20"
                        :size="area === 'unstaged' ? unstaged_pane_size : undefined"
                    >
                        <div class="flex flex-col h-full">
                            <hr v-if="i > 0" class="mb-2" />
                            <div class="flex items-center gap-1 mb-2">
                                <div class="grow">
                                    {{ $_.title(area) }} files
                                </div>
                                <btn
                                    v-for="action in area === 'unstaged' ? ['discard', 'stage'] : ['unstage']"
                                    :disabled="files[area].length === 0"
                                    @click="run(action)"
                                >
                                    <icon :name="$settings.icons[action]" class="size-5" />
                                    {{ $_.title(action) }} all
                                </btn>
                            </div>
                            <div class="grow overflow-auto">
                                <FileRow v-for="file in files[area]" :key="file.path" :file />
                            </div>
                        </div>
                    </pane>
                </splitpanes>
            </pane>
            <pane :size="commit_pane_size" class="min-h-24 flex flex-col gap-2">
                <div v-if="current_operation === null" class="flex items-center justify-end gap-3">
                    <label>
                        <input v-model="amend" type="checkbox" />
                        Amend
                    </label>
                    <btn :disabled="message === ''" @click="doCommit">
                        <icon name="mdi-source-commit" class="size-5" />
                        Commit
                    </btn>
                </div>
                <div v-else class="flex items-center">
                    <div class="grow">
                        {{ current_operation_label }}...
                    </div>
                    <btn
                        :disabled="files.unstaged.length > 0"
                        @click="continueCurrentOperation"
                    >
                        <icon name="mdi-forward" class="size-5" />
                        Continue
                    </btn>
                    <btn
                        :disabled="files.unstaged.length > 0 || files.staged.length > 0"
                        @click="abortCurrentOperation"
                    >
                        <icon name="mdi-cancel" class="size-5" />
                        Abort
                    </btn>
                </div>
                <textarea
                    v-model.trim="message"
                    class="grow px-2 resize-none"
                    :disabled="current_operation_in_conflict"
                    :spellcheck="false"
                    :title="current_operation_in_conflict ? `Editing the commit message during ${this.current_operation.type} conflict is unsupported.` : ''"
                />
            </pane>
        </splitpanes>

        <div v-else class="flex flex-col h-full">
            <div v-if="second_commit === null" class="flex justify-end gap-1 flex-wrap mb-3">
                <template v-if="current_operation === null">
                    <btn :disabled="current_branch_name === null && current_head === commit.hash" @click="checkoutCommit">
                        <icon name="mdi-target" class="size-5" />
                        Checkout commit
                    </btn>
                    <btn @click="show_branch_modal = true">
                        <icon name="mdi-source-branch" class="size-5" />
                        Branch
                    </btn>
                    <btn @click="show_tag_modal = true">
                        <icon name="mdi-tag-outline" class="size-5" />
                        Tag
                    </btn>
                    <btn :disabled="current_head === commit.hash" @click="resetToCommit">
                        <icon name="mdi-undo" class="size-5" />
                        Reset to commit
                    </btn>
                    <btn @click="cherrypickCommit">
                        <icon name="mdi-checkbox-marked-outline" class="size-5" />
                        Cherry-pick
                    </btn>
                    <btn @click="revertCommit">
                        <icon name="mdi-backup-restore" class="size-5" />
                        Revert
                    </btn>
                    <btn @click="startRebase">
                        <icon name="mdi-file-edit-outline" class="size-5" />
                        Edit (Rebase)
                    </btn>
                    <BranchModal v-if="show_branch_modal" :commit @close="show_branch_modal = false" />
                    <TagModal v-if="show_tag_modal" :commit @close="show_tag_modal = false" />
                </template>
                <div v-else class="italic">
                    Functionality limited during {{ current_operation.type }}
                </div>
            </div>
            <div v-else>
                Diff between...
            </div>

            <template v-for="c in second_commit === null ? [commit] : ordered_commits">
                <hr v-if="second_commit !== null" class="my-2" />

                <div v-if="c.hash === 'WORKING_TREE'" class="text-xl italic">
                    Working tree
                </div>

                <div v-else>
                    <commit-hash :hash="c.hash" />
                    <div class="text-xl">
                        <commit-message :content="c.subject" />
                    </div>
                    <div v-if="c.body" class="mt-2 whitespace-pre-wrap">
                        <commit-message :content="c.body" />
                    </div>
                </div>
            </template>

            <div v-if="second_commit === null" class="mt-2">
                <div v-for="name in commit.committer_email === commit.author_email ? ['author'] : ['author', 'committer']">
                    <div class="text-xs text-gray mt-1">
                        {{ name }}:
                    </div>
                    <CommitterDetails :commit :prefix="name" />
                </div>
            </div>

            <hr class="my-2" />
            <div class="grow overflow-auto">
                <FileRow v-for="file in files.committed" :key="file.path" :file />
            </div>
        </div>
    </div>
</template>

<script>
    import StoreMixin from '@/mixins/StoreMixin';

    import BranchModal from './BranchModal';
    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';
    import TagModal from './TagModal';

    export default {
        mixins: [
            StoreMixin('unstaged_pane_size', 50),
            StoreMixin('commit_pane_size', 15),
        ],
        components: { BranchModal, CommitterDetails, FileRow, TagModal },
        inject: [
            'commits', 'commit_by_hash', 'selected_commit', 'second_selected_commit', 'ordered_commits_to_diff',
            'current_branch_name', 'current_head', 'current_operation', 'current_operation_label',
            'working_tree_files', 'uncommitted_changes_count', 'selected_file',
            'updateSelectedFile', 'saveSelectedFile', 'refreshStatus', 'refreshHistory',
        ],
        data: () => ({
            commit: undefined,
            second_commit: undefined,
            ordered_commits: undefined,
            files: undefined,
            message: '',
            amend: false,
            show_branch_modal: false,
            show_tag_modal: false,
        }),
        computed: {
            current_operation_in_conflict() {
                return this.current_operation !== null && (this.current_operation.type !== 'rebase' || this.current_operation.hash !== this.commits[0].parents[0]);
            },
        },
        watch: {
            async selected_commit() {
                await this.load();
            },
            async second_selected_commit() {
                await this.load();
            },
            async working_tree_files() {
                if (_.some([this.commit, this.second_commit], { hash: 'WORKING_TREE' })) {
                    await this.load();
                }
            },
            amend() {
                const { subject, body } = this.commit_by_hash[this.commits[0].parents[0]];
                const message = subject + (body ? '\n\n' + body : '');

                if (this.amend) {
                    this.message = message;
                } else if (!this.amend && this.message === message) {
                    this.message = '';
                }
            },
        },
        async created() {
            // Prevent strange unfolding effect when the application starts.
            await this.$nextTick();
            await this.load();
        },
        async activated() {
            await this.load();
        },
        methods: {
            async load() {
                const commit = this.selected_commit;
                const second_commit = this.second_selected_commit;
                const ordered_commits = this.ordered_commits_to_diff;

                if (commit.hash === 'WORKING_TREE' && second_commit === null) {
                    if (this.message === '') {
                        if (this.current_operation?.type === 'rebase') {
                            this.message = await repo.readFile('.git/rebase-merge/message');
                        } else if (['cherry-pick', 'revert'].includes(this.current_operation?.type)) {
                            const message = await repo.readFile('.git/MERGE_MSG');
                            this.message = message.split('\n').filter(line => !line.startsWith('#')).join('\n');
                        }
                    }
                    this.files = this.working_tree_files;

                } else {
                    const hashes = [];
                    for (const commit of ordered_commits) {
                        if (commit.hash === 'WORKING_TREE') {
                            continue;
                        } else if (commit.hash === 'EMPTY_ROOT') {
                            // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                            hashes.push((await repo.callGit('hash-object', '-t', 'tree', '/dev/null')).trim());
                        } else {
                            hashes.push(commit.hash);
                        }
                    }
                    const status = await repo.callGit('diff', ...hashes.reverse(), '--name-status', '-z');
                    if (!_.isEqual(ordered_commits, this.ordered_commits_to_diff)) {
                        return;
                    }
                    const tokens = status.split('\0');
                    const files = [];

                    for (let i = 0; i < tokens.length - 1; ++i) {
                        const file = {
                            status: tokens[i][0],
                            path: tokens[++i],
                            area: 'committed',
                        };
                        if (['R', 'C'].includes(file.status)) {
                            // Note: the order is different to that of `git status -z`.
                            file.old_path = file.path;
                            file.path = tokens[++i];
                        }
                        files.push(file);
                    }
                    this.files = Object.freeze({ committed: files });
                }
                this.commit = commit;
                this.second_commit = second_commit;
                this.ordered_commits = ordered_commits;
            },
            async run(action) {
                await this.saveSelectedFile();

                if (action === 'stage') {
                    await repo.callGit('add', '--all');

                } else if (action === 'unstage') {
                    await repo.callGit('restore', '--staged', '--', '.');

                } else if (action === 'discard') {
                    await Promise.all([
                        repo.callGit('clean', '--force', '--', '.'),
                        repo.callGit('checkout', '--', '.'),
                    ]);
                }
                await this.refreshStatus();
            },
            async doCommit() {
                await this.saveSelectedFile();

                await repo.callGit('commit', ...this.amend ? ['--amend'] : [], '--message', this.message);
                this.message = '';
                this.amend = false;

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async checkoutCommit() {
                await repo.callGit('checkout', this.commit.hash);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async resetToCommit() {
                await repo.callGit('reset', this.commit.hash);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async cherrypickCommit() {
                try {
                    await repo.callGit('cherry-pick', this.commit.hash);
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async revertCommit() {
                try {
                    await repo.callGit('revert', this.commit.hash);
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async startRebase() {
                const commit = this.commit;
                let target = commit.parents[0];
                if (target === undefined) {
                    // https://stackoverflow.com/questions/22992543/how-do-i-git-rebase-the-first-commit
                    target = '--root';
                }
                await repo.callGit('-c', 'sequence.editor=sed -i 1s/^pick/edit/', 'rebase', '--interactive', target);
                if (this.selected_file !== null) {
                    await repo.callGit('revert', commit.hash, '--no-commit');
                    await repo.callGit('restore', '--source', commit.hash, '--', '.');
                }
                this.selected_commit = Object.freeze(this.commits[0]);
                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async continueCurrentOperation() {
                if (await this.saveSelectedFile()) {
                    return;
                }
                // No conflict means that we've just started rebasing.
                // Edit the commit message in this case.
                if (!this.current_operation_in_conflict) {
                    await repo.callGit('commit', '--amend', '--message', this.message);
                }
                try {
                    if (this.current_operation_in_conflict) {
                        await repo.callGit('-c', `core.editor=true`, this.current_operation.type, '--continue');
                    } else {
                        await repo.callGit(this.current_operation.type, '--skip');
                    }
                } finally {
                    this.message = '';
                    this.amend = false;

                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async abortCurrentOperation() {
                if (await this.saveSelectedFile()) {
                    return;
                }
                await repo.callGit(this.current_operation.type, '--abort');

                this.message = '';
                this.amend = false;

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
        },
    };
</script>
