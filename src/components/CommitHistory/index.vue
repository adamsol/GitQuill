
<template>
    <div class="w-full h-full overflow-y-auto">
        <CommitRow v-for="commit in commits" :commit />
    </div>
</template>

<script>
    import CommitRow from './CommitRow';

    export default {
        components: { CommitRow },
        inject: ['selected_commit'],
        data: () => ({
            commits: undefined,
        }),
        async created() {
            const log = await electron.callGit('log', {
                format: {
                    hash: '%H',
                    parents: '%P',
                    subject: '%s',
                    body: '%b',
                    author_email: '%ae',
                    author_name: '%an',
                    author_date: '%ad',
                    committer_email: '%ce',
                    committer_name: '%cn',
                    committer_date: '%cd',
                },
                // https://stackoverflow.com/questions/7853332/how-to-change-git-log-date-formats
                '--date=format-local:%Y-%m-%d %H:%M': null,
            });
            for (const commit of log.all) {
                commit.hash_abbr = commit.hash.slice(0, 7);
            }
            this.commits = Object.freeze(log.all);
            this.selected_commit = Object.freeze(this.commits[0]);
        },
    };
</script>
