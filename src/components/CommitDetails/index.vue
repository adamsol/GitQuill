
<template>
    <div v-if="files !== undefined" class="h-full break-words">
        <splitpanes
            v-if="commit.hash === 'WORKING_TREE'"
            class="h-full gap-1"
            horizontal
            @resized="unstaged_pane_size = $event[0].size"
        >
            <pane
                v-for="area in ['unstaged', 'staged']"
                class="min-h-20"
                :size="area === 'unstaged' ? unstaged_pane_size : undefined"
            >
                <div class="flex flex-col max-h-full">
                    <div class="flex items-center gap-1">
                        <div class="grow">
                            {{ $_.upperFirst(area) }}
                        </div>
                        <btn
                            v-for="action in area === 'unstaged' ? ['discard', 'stage'] : ['unstage']"
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
        <template v-else>
            <div class="text-lg">
                {{ commit.subject }}
            </div>
            <div v-if="commit.body" class="mt-2 whitespace-pre-wrap">
                {{ commit.body }}
            </div>
            <hr class="my-2" />

            <div v-for="name in commit.committer_email === commit.author_email ? ['author'] : ['author', 'committer']">
                <div class="text-xs text-gray mt-1">
                    {{ name }}:
                </div>
                <CommitterDetails :commit="commit" :prefix="name" />
            </div>
            <hr class="my-2" />

            <FileRow v-for="file in files" :key="file.path" :file />
        </template>
    </div>
</template>

<script>
    import EventMixin from '@/mixins/EventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import { getStatus } from '@/utils/git';

    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';

    export default {
        mixins: [
            EventMixin('window-focus', 'load'),
            StoreMixin('unstaged_pane_size', 50),
        ],
        components: { CommitterDetails, FileRow },
        inject: [
            'selected_commit', 'files', 'selected_file',
            'updateSelectedFile',
        ],
        data: () => ({
            commit: undefined,
        }),
        watch: {
            selected_commit: {
                async handler() {
                    await this.load();
                },
                immediate: true,
            },
        },
        methods: {
            async load() {
                if (this.selected_commit === undefined) {
                    return;
                }
                if (this.selected_commit.hash === 'WORKING_TREE') {
                    this.files = Object.freeze(await getStatus());

                    const selected_area = this.selected_file?.area;
                    const selected_path = this.selected_file?.path;
                    if (this.files[selected_area]?.every(file => file.path !== selected_path)) {
                        this.selected_file = null;
                    }
                } else {
                    let parent = this.selected_commit.parents.split(' ')[0];
                    if (parent === '') {
                        // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                        parent = (await electron.callGit('raw', ['hash-object', '-t', 'tree', '/dev/null'])).trim();
                    }
                    const summary = await electron.callGit('diffSummary', [parent, this.selected_commit.hash, '--name-status']);

                    this.files = Object.freeze(summary.files.map(file => ({
                        status: file.status,
                        path: file.file,
                        area: 'committed',
                    })));
                }
                this.commit = this.selected_commit;
            },
            async run(action) {
                if (action === 'stage') {
                    await electron.callGit('add', ['-A']);

                } else if (action === 'unstage') {
                    await electron.callGit('reset', 'mixed');

                } else if (action === 'discard') {
                    await electron.callGit('clean', 'f');
                    await electron.callGit('checkout', ['--', '.']);
                }
                this.files = Object.freeze(await getStatus());
                this.updateSelectedFile();
            },
        },
    };
</script>
