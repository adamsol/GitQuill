
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
                <div class="flex items-center justify-end gap-3">
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
            <div>
                <div class="text-sm text-gray font-mono whitespace-nowrap">
                    {{ commit.hash }}
                </div>
                <div class="text-xl">
                    {{ commit.subject }}
                </div>
                <div v-if="commit.body" class="mt-2 whitespace-pre-wrap">
                    {{ commit.body }}
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
            'commits', 'selected_commit', 'files', 'selected_file',
            'updateSelectedFile', 'saveSelectedFile', 'refreshCommitHistory',
        ],
        data: () => ({
            commit: undefined,
            message: '',
            amend: false,
        }),
        watch: {
            selected_commit: {
                async handler() {
                    await this.load();
                },
                immediate: true,
            },
            amend() {
                const { subject, body } = this.commits[1];
                const message = subject + (body ? '\n\n' + body : '');

                if (this.amend && this.message === '') {
                    this.message = message;
                } else if (!this.amend && this.message === message) {
                    this.message = '';
                }
            },
        },
        methods: {
            async load() {
                const commit = this.selected_commit;
                if (commit === undefined) {
                    return;
                }
                if (commit.hash === 'WORKING_TREE') {
                    this.files = Object.freeze(await getStatus());

                    const selected_area = this.selected_file?.area;
                    const selected_path = this.selected_file?.path;
                    if (this.files[selected_area]?.every(file => file.path !== selected_path)) {
                        this.selected_file = null;
                    }
                } else {
                    let parent = commit.parents.split(' ')[0];
                    if (parent === '') {
                        // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                        parent = (await electron.callGit('raw', ['hash-object', '-t', 'tree', '/dev/null'])).trim();
                    }
                    const summary = await electron.callGit('diffSummary', [parent, commit.hash, '--name-status']);

                    this.files = Object.freeze({
                        committed: summary.files.map(file => ({
                            status: file.status,
                            path: file.file,
                            area: 'committed',
                        })),
                    });
                }
                this.commit = commit;
            },
            async run(action) {
                await this.saveSelectedFile();

                if (action === 'stage') {
                    await electron.callGit('add', ['-A']);

                } else if (action === 'unstage') {
                    await electron.callGit('reset', 'mixed');

                } else if (action === 'discard') {
                    await electron.callGit('clean', 'f');
                    await electron.callGit('checkout', ['--', '.']);

                } else if (action === 'commit') {
                    await electron.callGit('commit', this.message, [...this.amend ? ['--amend'] : [], '--allow-empty']);

                    this.message = '';
                    this.amend = false;
                    this.refreshCommitHistory();
                }
                this.files = Object.freeze(await getStatus());
                this.updateSelectedFile();
            },
        },
    };
</script>
