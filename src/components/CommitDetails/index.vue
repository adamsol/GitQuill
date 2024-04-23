
<template>
    <div v-if="files !== undefined" class="break-words">
        <div v-if="commit.hash === 'WORKING_TREE'">
            <div v-for="attr in ['unstaged', 'staged']" class="mb-2">
                {{ attr }}:
                <FileRow v-for="file in files[attr]" :key="file.path" :file />
            </div>
        </div>
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
    import { getStatus } from '@/utils/git';

    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';

    export default {
        mixins: [EventMixin('window-focus', 'load')],
        components: { CommitterDetails, FileRow },
        inject: ['selected_commit', 'files', 'selected_file'],
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
        },
    };
</script>
