
<template>
    <div v-if="files !== undefined" class="break-words">
        <div v-if="commit === null">
            <div v-for="attr in ['unstaged', 'staged']" class="mb-2">
                {{ attr }}:
                <FileRow v-for="file in files[attr]" :file />
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

            <FileRow v-for="file in files" :file />
        </template>
    </div>
</template>

<script>
    import EventMixin from '@/mixins/EventMixin';

    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';

    export default {
        mixins: [EventMixin('window-focus', 'load')],
        components: { CommitterDetails, FileRow },
        inject: ['selected_commit', 'selected_file'],
        data: () => ({
            commit: undefined,
            files: undefined,
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
                if (this.selected_commit === null) {
                    const summary = await electron.callGit('status');
                    const filterFiles = files => files.filter(file => file.status !== ' ');

                    this.commit = null;
                    this.files = Object.freeze({
                        unstaged: filterFiles(summary.files.map(file => ({
                            status: file.working_dir === '?' ? 'A' : file.working_dir,
                            path: file.path,
                            area: 'unstaged',
                        }))),
                        staged: filterFiles(summary.files.map(file => ({
                            status: file.index === '?' ? ' ' : file.index,
                            path: file.path,
                            area: 'staged',
                        }))),
                    });

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

                    this.commit = this.selected_commit;
                    this.files = Object.freeze(summary.files.map(file => ({ status: file.status, path: file.file })));
                }
            },
        },
    };
</script>
