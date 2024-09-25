
<template>
    <div v-if="files !== undefined" class="h-full break-words">
        <splitpanes
            v-if="current_commits.length === 1 && commit.hash === 'WORKING_TREE'"
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
                                    :class="{ 'text-red': first_click[action] }"
                                    :disabled="files[area].length === 0"
                                    :title="action === 'discard' ? '(click twice)' : ''"
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
                        @click="cancelCurrentOperation('--abort')"
                    >
                        <icon name="mdi-restore" class="size-5" />
                        Abort
                    </btn>
                    <btn @click="cancelCurrentOperation('--quit')">
                        <icon name="mdi-cancel" class="size-5" />
                        Quit
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
            <div class="flex justify-end gap-1 flex-wrap mb-3">
                <template v-if="current_operation === null">
                    <template v-if="current_commits.length === 1">
                        <btn :disabled="current_branch_name === null && current_head === commit.hash" @click="checkoutCommit">
                            <icon name="mdi-target" class="size-5" />
                            Checkout commit
                        </btn>
                        <btn :disabled="current_head === commit.hash" @click="resetToCommit">
                            <icon name="mdi-undo" class="size-5" />
                            Reset to commit
                        </btn>
                        <btn @click="show_branch_modal = true">
                            <icon name="mdi-source-branch" class="size-5" />
                            Branch
                        </btn>
                        <btn @click="show_tag_modal = true">
                            <icon name="mdi-tag-outline" class="size-5" />
                            Tag
                        </btn>
                    </template>
                    <btn :disabled="working_tree_selected" @click="cherrypickCommits">
                        <icon name="mdi-checkbox-marked-outline" class="size-5" />
                        Cherry-pick {{ current_commits.length > 1 ? `${current_commits.length} commits` : '' }}
                    </btn>
                    <btn :disabled="working_tree_selected" @click="revertCommits">
                        <icon name="mdi-backup-restore" class="size-5" />
                        Revert {{ current_commits.length > 1 ? `${current_commits.length} commits` : '' }}
                    </btn>
                    <btn v-if="current_commits.length === 1" @click="startRebase">
                        <icon name="mdi-file-edit-outline" class="size-5" />
                        Edit (Rebase)
                    </btn>
                    <BranchModal v-if="show_branch_modal" :commit @close="show_branch_modal = false" />
                    <TagModal v-if="show_tag_modal" :commit @close="show_tag_modal = false" />
                </template>
                <div v-else class="text-gray italic">
                    Functionality limited during {{ current_operation.type }}
                </div>
            </div>
            <div v-if="current_commits.length === 2">
                Diff between...
            </div>

            <div class="min-h-14 overflow-auto">
                <template v-for="c in current_commits">
                    <hr v-if="current_commits.length > 1" class="my-2" />

                    <div v-if="c.hash === 'WORKING_TREE'" class="text-xl italic">
                        Working tree
                    </div>

                    <div v-else>
                        <commit-hash :hash="c.hash" />
                        <div class="text-xl">
                            <commit-message :content="c.subject" />
                        </div>
                    </div>
                </template>

                <div v-if="current_commits.length === 1 && commit.body" class="my-2 whitespace-pre-wrap">
                    <commit-message :content="commit.body" />
                </div>
            </div>

            <template v-if="current_commits.length === 1">
                <hr class="my-2" />
                <div class="text-xs text-gray">
                    {{ $_.pluralize('parent', commit.parents.length) }}:
                </div>
                <div class="flex">
                    <template v-for="(hash, i) in commit.parents">
                        {{ i > 0 ? ',&nbsp;' : '' }}
                        <commit-link :hash />
                    </template>
                </div>
                <div v-for="name in commit.committer_email === commit.author_email ? ['author'] : ['author', 'committer']">
                    <div class="text-xs text-gray mt-1">
                        {{ name }}:
                    </div>
                    <CommitterDetails :commit :prefix="name" />
                </div>
            </template>

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
            'repo', 'commits', 'commit_by_hash', 'selected_commits', 'revisions_to_diff',
            'current_branch_name', 'current_head', 'current_operation', 'current_operation_label',
            'working_tree_files', 'uncommitted_changes_count', 'selected_file',
            'setSelectedCommits', 'updateSelectedFile', 'saveSelectedFile', 'refreshHistory', 'refreshStatus',
        ],
        data: () => ({
            current_commits: undefined,
            files: undefined,
            first_click: {},
            message: '',
            amend: false,
            show_branch_modal: false,
            show_tag_modal: false,
        }),
        computed: {
            commit() {
                return this.current_commits[0];
            },
            working_tree_selected() {
                return _.some(this.current_commits, { hash: 'WORKING_TREE' });
            },
            current_operation_in_conflict() {
                return this.current_operation !== null && (this.current_operation.type !== 'rebase' || this.current_operation.hash !== this.current_head);
            },
        },
        watch: {
            selected_commits: {
                async handler() {
                    await this.load();
                },
                deep: true,
            },
            async working_tree_files() {
                if (_.some(this.current_commits, { hash: 'WORKING_TREE' }) && this.current_commits.length <= 2) {
                    await this.load();
                }
            },
            amend() {
                const { subject, body } = this.commit_by_hash[this.current_head];
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
        methods: {
            async load() {
                const current_commits = this.selected_commits;
                const revisions_to_diff = this.revisions_to_diff;

                if (current_commits.length === 1 && current_commits[0].hash === 'WORKING_TREE') {
                    if (this.message === '') {
                        if (this.current_operation?.type === 'rebase') {
                            this.message = await this.repo.readFile('.git/rebase-merge/message');
                        } else if (['cherry-pick', 'revert'].includes(this.current_operation?.type)) {
                            const message = await this.repo.readFile('.git/MERGE_MSG');
                            this.message = message.split('\n').filter(line => !line.startsWith('#')).join('\n');
                        }
                    }
                    this.files = this.working_tree_files;

                } else if (current_commits.length <= 2) {
                    const hashes = [];
                    for (const hash of revisions_to_diff) {
                        if (hash === 'WORKING_TREE') {
                            continue;
                        } else if (hash === 'EMPTY_ROOT') {
                            // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                            hashes.push((await this.repo.callGit('hash-object', '-t', 'tree', '/dev/null')).trim());
                        } else {
                            hashes.push(hash);
                        }
                    }
                    const status = await this.repo.callGit('diff', ...hashes.reverse(), '--name-status', '-z');
                    if (!_.isEqual(revisions_to_diff, this.revisions_to_diff)) {
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

                } else {
                    this.files = Object.freeze({ committed: [] });
                }
                this.current_commits = current_commits;
            },
            async run(action) {
                await this.saveSelectedFile();

                if (action === 'stage') {
                    await this.repo.callGit('add', '--all');

                } else if (action === 'unstage') {
                    await this.repo.callGit('restore', '--staged', '--', '.');

                } else if (action === 'discard') {
                    if (this.first_click.discard) {
                        await Promise.all([
                            this.repo.callGit('clean', '--force', '--', '.'),
                            this.repo.callGit('checkout', '--', '.'),
                        ]);
                    } else {
                        this.first_click.discard = true;
                        setTimeout(() => this.first_click.discard = false, settings.discard_second_click_cooldown);
                    }
                }
                await this.refreshStatus();
            },
            async doCommit() {
                await this.saveSelectedFile();

                await this.repo.callGit('commit', ...this.amend ? ['--amend'] : [], '--message', this.message);
                this.message = '';
                this.amend = false;

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async checkoutCommit() {
                await this.repo.callGit('checkout', this.commit.hash);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async resetToCommit() {
                await this.repo.callGit('reset', this.commit.hash);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async cherrypickCommits() {
                try {
                    await this.repo.callGit('cherry-pick', ..._.map(this.current_commits, 'hash'));
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                }
            },
            async revertCommits() {
                try {
                    await this.repo.callGit('revert', ..._.map(this.current_commits, 'hash'));
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
                await this.repo.callGit('-c', 'sequence.editor=sed -i 1s/^pick/edit/', 'rebase', '--interactive', target);
                if (this.selected_file !== null) {
                    await this.repo.callGit('revert', commit.hash, '--no-commit');
                    await this.repo.callGit('restore', '--source', commit.hash, '--', '.');
                }
                this.setSelectedCommits([this.commits[0]]);
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
                    await this.repo.callGit('commit', '--amend', '--message', this.message);
                }
                try {
                    if (this.current_operation_in_conflict) {
                        await this.repo.callGit('-c', `core.editor=true`, this.current_operation.type, '--continue');
                    } else {
                        await this.repo.callGit(this.current_operation.type, '--skip');
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
            async cancelCurrentOperation(cmd) {
                if (await this.saveSelectedFile()) {
                    return;
                }
                await this.repo.callGit(this.current_operation.type, cmd);

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
