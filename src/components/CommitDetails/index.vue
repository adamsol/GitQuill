
<template>
    <div v-if="files !== undefined" class="h-full break-words">
        <splitpanes
            v-if="commit.hash === 'WORKING_TREE'"
            horizontal
            @resized="commit_pane_size = $event[1].size"
        >
            <pane class="min-h-40">
                <splitpanes
                    horizontal
                    @resized="unstaged_pane_size = $event[0].size"
                >
                    <pane
                        v-for="area in ['unstaged', 'staged']"
                        class="min-h-20"
                        :size="area === 'unstaged' ? unstaged_pane_size : undefined"
                    >
                        <div class="flex flex-col h-full">
                            <div class="flex items-center gap-1">
                                <div class="grow">
                                    {{ $_.upperFirst(area) }}
                                </div>
                                <btn
                                    v-for="action in area === 'unstaged' ? ['discard', 'stage'] : ['unstage']"
                                    :disabled="files[area].length === 0"
                                    @click.stop="run(action)"
                                >
                                    <icon :name="$settings.icons[action]" class="size-5" />
                                    {{ $_.upperFirst(action) }} all
                                </btn>
                            </div>
                            <hr class="mt-2" />
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
                        :disabled="this.files.unstaged.length > 0"
                        @click.stop="continueRebase"
                    >
                        <icon name="mdi-forward" class="size-5" />
                        Continue
                    </btn>
                    <btn
                        :disabled="this.files.unstaged.length > 0 || this.files.staged.length > 0"
                        @click.stop="abortRebase"
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
                    <btn :disabled="message === ''" @click.stop="run('commit')">
                        <icon name="mdi-source-commit" class="size-5" />
                        Commit
                    </btn>
                </div>
                <textarea v-model.trim="message" class="grow px-2 resize-none" :spellcheck="false" />
            </pane>
        </splitpanes>

        <div v-else class="flex flex-col h-full">
            <div class="flex justify-end">
                <btn :disabled="rebasing" @click.stop="startRebase">
                    <icon name="mdi-file-edit" class="size-5" />
                    Edit (Rebase)
                </btn>
            </div>
            <hr class="my-2" />

            <div>
                <div class="text-sm text-gray font-mono whitespace-nowrap">
                    {{ commit.hash }}
                </div>
                <div class="text-xl">
                    <commit-message :content="commit.subject" />
                </div>
                <div v-if="commit.body" class="mt-2 whitespace-pre-wrap">
                    <commit-message :content="commit.body" />
                </div>
            </div>

            <div class="my-2">
                <div v-for="name in commit.committer_email === commit.author_email ? ['author'] : ['author', 'committer']">
                    <div class="text-xs text-gray mt-1">
                        {{ name }}:
                    </div>
                    <CommitterDetails :commit="commit" :prefix="name" />
                </div>
            </div>

            <hr class="mt-2" />
            <div class="grow overflow-auto">
                <FileRow v-for="file in files.committed" :key="file.path" :file />
            </div>
        </div>
    </div>
</template>

<script>
    import ElectronEventMixin from '@/mixins/ElectronEventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import { getStatus } from '@/utils/git';

    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';

    export default {
        mixins: [
            ElectronEventMixin('window-focus', 'load'),
            StoreMixin('unstaged_pane_size', 50),
            StoreMixin('commit_pane_size', 15),
        ],
        components: { CommitterDetails, FileRow },
        inject: [
            'commits', 'commits_by_hash', 'selected_commit', 'files', 'selected_file',
            'updateSelectedFile', 'saveSelectedFile', 'refreshCommitHistory',
        ],
        data: () => ({
            commit: undefined,
            rebasing: false,
            message: '',
            amend: false,
        }),
        watch: {
            async selected_commit() {
                await this.load();
            },
            amend() {
                const { subject, body } = this.commits_by_hash[this.commits[0].parents[0]];
                const message = subject + (body ? '\n\n' + body : '');

                if (this.amend) {
                    this.message = message;
                } else if (!this.amend && this.message === message) {
                    this.message = '';
                }
            },
        },
        async created() {
            await this.load();
        },
        async activated() {
            await this.load();
        },
        methods: {
            async load() {
                const commit = this.selected_commit;

                // https://stackoverflow.com/questions/3921409/how-to-know-if-there-is-a-git-rebase-in-progress
                this.rebasing = await repo.exists('.git/rebase-merge');

                if (commit.hash === 'WORKING_TREE') {
                    if (this.rebasing) {
                        this.message = await repo.readFile('.git/rebase-merge/message');
                    }
                    const files = await getStatus();
                    if (commit !== this.selected_commit) {
                        return;
                    }
                    this.files = Object.freeze(files);

                    if (!_.some(this.files[this.selected_file?.area], { path: this.selected_file?.path })) {
                        this.updateSelectedFile();
                    }
                } else {
                    let parent = commit.parents[0];
                    if (parent === undefined) {
                        // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                        parent = (await repo.callGit('hash-object', '-t', 'tree', '/dev/null')).trim();
                    }
                    const status = await repo.callGit('diff', parent, commit.hash, '--name-status', '-z');
                    if (commit !== this.selected_commit) {
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
            },
            async run(action) {
                await this.saveSelectedFile();

                if (action === 'stage') {
                    await repo.callGit('add', '--all');

                } else if (action === 'unstage') {
                    await repo.callGit('reset');

                } else if (action === 'discard') {
                    await repo.callGit('clean', '-f', '-d');
                    await repo.callGit('checkout', '--', '.');

                } else if (action === 'commit') {
                    await this.makeCommit(`--message`, this.message, ...this.amend ? ['--amend'] : []);
                    this.message = '';
                    this.amend = false;
                    this.refreshCommitHistory();
                }
                this.files = Object.freeze(await getStatus());
                this.updateSelectedFile();
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
                this.refreshCommitHistory();

                await repo.callGit('revert', commit.hash, '--no-commit');
                await repo.callGit('restore', '--source', commit.hash, '--', '.');

                this.selected_commit = this.commits[0];
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
                    this.refreshCommitHistory();
                    this.selected_file = null;
                    await this.load();
                }
            }
        },
    };
</script>
