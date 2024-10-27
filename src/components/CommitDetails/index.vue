
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
                                    :click_twice="action === 'discard' && 'text-red'"
                                    :disabled="files[area].length === 0"
                                    @click="run(action)"
                                >
                                    <icon :name="$settings.icons[action]" class="size-5" />
                                    {{ $_.title(action) }} all
                                </btn>
                            </div>
                            <recycle-scroller
                                class="grow"
                                :items="files[area]"
                                :item-size="36"
                                key-field="path"
                                v-slot="{ item }"
                            >
                                <FileRow :key="item.path" :file="item" />
                            </recycle-scroller>
                        </div>
                    </pane>
                </splitpanes>
            </pane>

            <pane :size="commit_pane_size" class="min-h-24 flex flex-col gap-2">
                <div v-if="current_operation?.conflict">
                    Conflict:
                </div>
                <div v-else class="flex items-center gap-3 justify-end">
                    <label>
                        <input v-model="amend" type="checkbox" />
                        Amend
                    </label>
                    <btn :disabled="message === '' || files.staged.length === 0 && !amend" @click="doCommit">
                        <icon name="mdi-source-commit" class="size-5" />
                        Commit
                    </btn>
                </div>

                <textarea
                    v-model.trim="message"
                    class="grow px-2 resize-none"
                    :disabled="current_operation?.conflict"
                    :spellcheck="false"
                />

                <div v-if="current_operation !== null" class="flex items-center gap-1">
                    <div>
                        {{ current_operation.label }}...
                    </div>
                    <div class="grow" />

                    <btn v-if="current_operation.conflict" :disabled="files.unstaged.length > 0" @click="continueCurrentOperation">
                        <icon name="mdi-forward" class="size-5" />
                        Continue
                    </btn>
                    <btn v-else :disabled="$_.some(files, 'length')" @click="continueCurrentOperation">
                        <icon name="mdi-forward" class="size-5" />
                        Proceed
                    </btn>
                    <btn @click="cancelCurrentOperation('--quit')">
                        <icon name="mdi-close-circle-outline" class="size-5" />
                        Quit
                    </btn>
                    <btn :disabled="$_.some(files, 'length')" @click="cancelCurrentOperation('--abort')">
                        <icon name="mdi-cancel" class="size-5" />
                        Abort
                    </btn>
                </div>
            </pane>
        </splitpanes>

        <div v-else class="flex flex-col h-full">
            <div class="flex justify-end gap-1 flex-wrap mb-3">
                <div v-if="current_operation?.conflict" class="text-gray italic">
                    Functionality limited during conflict
                </div>
                <template v-else>
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
                    <btn v-if="current_commits.length === 1" :disabled="!can_edit" @click="startRebase">
                        <icon name="mdi-file-edit-outline" class="size-5" />
                        Edit (Rebase)
                    </btn>
                    <BranchModal v-if="show_branch_modal" :commit @close="show_branch_modal = false" />
                    <TagModal v-if="show_tag_modal" :commit @close="show_tag_modal = false" />
                </template>
            </div>
            <div v-if="current_commits.length === 2">
                Diff between...
            </div>
            <hr v-if="current_commits.length > 1" class="my-2" />

            <div class="min-h-14 overflow-auto">
                <template v-for="(c, i) in current_commits">
                    <hr v-if="i > 0" class="my-2" />

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
            <recycle-scroller
                class="grow"
                :items="files.committed"
                :item-size="32"
                key-field="path"
                v-slot="{ item }"
            >
                <FileRow :key="item.path" :file="item" />
            </recycle-scroller>
        </div>
    </div>
</template>

<script>
    import StoreMixin from '@/mixins/StoreMixin';
    import { findPathBetweenCommits, getEmptyRootHash } from '@/utils/git';

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
            'current_branch_name', 'current_head', 'current_operation',
            'working_tree_files', 'uncommitted_changes_count', 'selected_file',
            'setSelectedCommits', 'updateSelectedFile', 'saveSelectedFile', 'refreshHistory', 'refreshStatus',
        ],
        data: () => ({
            current_commits: undefined,
            files: undefined,
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
            can_edit() {
                if (this.current_operation !== null) {
                    return false;
                }
                const path = [];
                if (!findPathBetweenCommits(this.commits[0], this.current_commits[0], this.commit_by_hash, path)) {
                    return false;
                }
                if (_.some(path, commit => commit.parents.length > 1)) {
                    return false;
                }
                return true;
            },
        },
        watch: {
            async selected_commits() {
                await this.load();
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
            await this.load();
        },
        methods: {
            async load() {
                const current_commits = this.selected_commits.map(hash => this.commit_by_hash[hash]);
                const revisions_to_diff = this.revisions_to_diff;

                if (current_commits.length === 1 && current_commits[0].hash === 'WORKING_TREE') {
                    if (this.message === '' && this.current_operation?.conflict) {
                        this.message = this.current_operation?.conflict_message;
                    }
                    this.files = this.working_tree_files;

                } else if (current_commits.length <= 2) {
                    const hashes = [];
                    for (const hash of revisions_to_diff) {
                        if (hash === 'WORKING_TREE') {
                            continue;
                        } else if (hash === 'EMPTY_ROOT') {
                            hashes.push(await getEmptyRootHash(this.repo));
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
                    await Promise.all([
                        this.repo.callGit('clean', '--force', '--', '.'),
                        this.repo.callGit('checkout', '--', '.'),
                    ]);
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
                const script = `
                    const fs = require('fs');
                    const file_path = process.argv[1];
                    const content = fs.readFileSync(file_path, { encoding: 'utf8' });
                    fs.writeFileSync(file_path, content.replace(/^pick/, 'edit'));
                `.replace(/\n\s*/g, ' ');

                // https://stackoverflow.com/questions/49465229/git-interactive-rebase-edit-particular-commit-without-needing-to-use-editor
                const cmd = `node --eval "${script}"`;
                await this.repo.callGit('-c', `sequence.editor=${cmd}`, 'rebase', '--interactive', target);

                if (this.selected_file !== null) {
                    const parent_hash = commit.parents[0] ?? await getEmptyRootHash(this.repo);
                    await this.repo.callGit('restore', '--source', parent_hash, '--staged', '--', '.');
                    await this.repo.callGit('restore', '--source', commit.hash, '--', '.');
                }
                this.setSelectedCommits(['WORKING_TREE']);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
            async continueCurrentOperation() {
                if (await this.saveSelectedFile()) {
                    return;
                }
                try {
                    if (this.files.staged.length > 0) {
                        // https://stackoverflow.com/questions/43489971/how-to-suppress-the-editor-for-git-rebase-continue
                        const noop = 'node --eval ""';
                        await this.repo.callGit('-c', `core.editor=${noop}`, this.current_operation.type, '--continue');
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
