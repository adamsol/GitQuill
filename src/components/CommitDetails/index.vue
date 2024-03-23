
<template>
    <div v-if="diff_summary" class="break-words">
        <div class="text-lg">
            {{ commit.subject }}
        </div>
        <div v-if="commit.body" class="mt-2 whitespace-pre-wrap">
            {{ commit.body }}
        </div>
        <hr class="my-2" />

        <div v-for="attr in commit.committer_email === commit.author_email ? ['author'] : ['author', 'committer']">
            <div class="text-xs text-gray mt-1">
                {{ attr }}:
            </div>
            <CommitterDetails :commit="commit" :prefix="attr" />
        </div>
        <hr class="my-2" />

        <FileRow v-for="file in diff_summary.files" :file />
    </div>
</template>

<script>
    import CommitterDetails from './CommitterDetails';
    import FileRow from './FileRow';

    export default {
        components: { CommitterDetails, FileRow },
        inject: ['selected_commit'],
        data: () => ({
            commit: undefined,
            diff_summary: undefined,
        }),
        watch: {
            async selected_commit() {
                let parent = this.selected_commit.parents.split(' ')[0];
                if (parent === '') {
                    // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
                    parent = (await electron.callGit('raw', ['hash-object', '-t', 'tree', '/dev/null'])).trim();
                }
                const diff_summary = await electron.callGit('diffSummary', [parent, this.selected_commit.hash, '--name-status']);

                this.commit = this.selected_commit;
                this.diff_summary = Object.freeze(diff_summary);
            },
        },
    };
</script>
