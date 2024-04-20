
<template>
    <recycle-scroller
        v-if="commits"
        class="w-full h-full"
        :items="commits"
        :item-size="32"
        key-field="hash"
        v-slot="{ item }"
    >
        <CommitRow :commit="item" />
    </recycle-scroller>
</template>

<script>
    import EventMixin from '@/mixins/EventMixin';

    import CommitRow from './CommitRow';

    export default {
        mixins: [EventMixin('window-focus', 'load')],
        components: { CommitRow },
        inject: ['head', 'commits', 'selected_commit'],
        async created() {
            await this.load();
        },
        methods: {
            async load() {
                const head = await electron.callGit('revparse', 'HEAD');
                if (this.head === (this.head = head)) {
                    return;
                }
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
                this.commits = Object.freeze([
                    { hash: 'WORKING_TREE' },
                    ...log.all,
                ]);

                const selected_hash = this.selected_commit?.hash;
                if (this.commits.every(commit => commit.hash !== selected_hash)) {
                    this.selected_commit = this.commits[0];
                }
            },
        },
    };
</script>
