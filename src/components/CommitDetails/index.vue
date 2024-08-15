
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
                <div v-if="rebasing" class="flex items-center mt-2">
                    <div class="grow">
                        Rebasing...
                    </div>
                    <btn
                        :disabled="files.unstaged.length > 0"
                        @click="continueRebase"
                    >
                        <icon name="mdi-forward" class="size-5" />
                        Continue
                    </btn>
                    <btn
                        :disabled="files.unstaged.length > 0 || files.staged.length > 0"
                        @click="abortRebase"
                    >
                        <icon name="mdi-cancel" class="size-5" />
                        Abort
                    </btn>
                </div>
                <div v-else class="flex items-center justify-end gap-3">
                    <label>
                        <input v-model="amend" type="checkbox" />
                        Amend
                    </label>
                    <btn :disabled="message === ''" @click="run('commit')">
                        <icon name="mdi-source-commit" class="size-5" />
                        Commit
                    </btn>
                </div>
                <textarea v-model.trim="message" class="grow px-2 resize-none" :spellcheck="false" />
            </pane>
        </splitpanes>

        <div v-else class="flex flex-col h-full">
            <div v-if="second_commit === null" class="flex justify-end gap-1 flex-wrap mb-2">
                <btn @click="run('checkout')">
                    <icon name="mdi-target" class="size-5" />
                    Checkout
                </btn>
                <btn @click="show_branch_modal = true">
                    <icon name="mdi-source-branch" class="size-5" />
                    Create branch
                </btn>
                <btn @click="show_tag_modal = true">
                    <icon name="mdi-tag-outline" class="size-5" />
                    Create tag
                </btn>
                <btn :disabled="rebasing || uncommitted_changes_count > 0" @click="startRebase">
                    <icon name="mdi-file-edit" class="size-5" />
                    Edit (Rebase)
                </btn>

                <BranchModal v-if="show_branch_modal" :commit @close="show_branch_modal = false" />
                <TagModal v-if="show_tag_modal" :commit @close="show_tag_modal = false" />
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
            'rebasing', 'working_tree_files', 'uncommitted_changes_count', 'selected_file',
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
                    if (this.rebasing && this.message === '') {
                        this.message = await repo.readFile('.git/rebase-merge/message');
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
                    await repo.callGit('reset');

                } else if (action === 'discard') {
                    await repo.callGit('clean', '--force', '-d');
                    await repo.callGit('checkout', '--', '.');

                } else if (action === 'commit') {
                    await this.makeCommit('--message', this.message, ...this.amend ? ['--amend'] : []);
                    this.message = '';
                    this.amend = false;

                } else if (action === 'checkout') {
                    await repo.callGit('checkout', this.commit.hash);
                }
                await Promise.all([
                    ['checkout', 'commit'].includes(action) ? [this.refreshHistory()] : [],
                    this.refreshStatus(),
                ]);
            },
            async makeCommit(...options) {
                await repo.callGit('commit', ...options, '--allow-empty');
            },
            async startRebase() {
                const commit = this.commit;
                let target = commit.parents[0];
                if (target === undefined) {
                    // https://stackoverflow.com/questions/22992543/how-do-i-git-rebase-the-first-commit
                    target = '--root';
                }
                await repo.callGit('-c', 'sequence.editor=sed -i 1s/^pick/edit/', 'rebase', '--interactive', target);
                await repo.callGit('revert', commit.hash, '--no-commit');
                await repo.callGit('restore', '--source', commit.hash, '--', '.');

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
                this.selected_commit = Object.freeze(this.commits[0]);
                this.updateSelectedFile();
            },
            async continueRebase() {
                // Properly handle editing the commit message during rebase, even without file changes.
                // https://stackoverflow.com/questions/43489971/how-to-suppress-the-editor-for-git-rebase-continue
                // https://stackoverflow.com/questions/27641184/git-rebase-continue-but-modify-commit-message-to-document-changes-during-conf
                // https://stackoverflow.com/questions/28267344/how-can-i-reference-the-original-of-a-currently-edited-commit-during-git-rebase
                const rev = (await repo.readFile('.git/rebase-merge/stopped-sha')).trim();
                if (rev !== this.commits[0].parents[0]) {
                    // We were in a merge conflict. Recreate the commit with its author.
                    await this.makeCommit('--reuse-message', rev);
                }
                await this.makeCommit('--message', this.message, '--amend');
                this.message = '';
                this.amend = false;
                await this.finishRebase('--skip');
            },
            async abortRebase() {
                this.message = '';
                this.amend = false;
                await this.finishRebase('--abort');
            },
            async finishRebase(cmd) {
                await this.saveSelectedFile();
                try {
                    await repo.callGit('rebase', cmd);
                } finally {
                    await Promise.all([
                        this.refreshHistory(),
                        this.refreshStatus(),
                    ]);
                    this.selected_commit = Object.freeze(this.commits[0]);
                    this.selected_file = null;
                }
            }
        },
    };
</script>
