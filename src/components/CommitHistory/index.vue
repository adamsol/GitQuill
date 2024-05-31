
<template>
    <recycle-scroller
        v-if="commits"
        class="w-full h-full bg-gray-dark"
        :items="commits"
        :item-size="32"
        key-field="hash"
        v-slot="{ item }"
    >
        <CommitRow :commit="item" />
    </recycle-scroller>
</template>

<script>
    import ElectronEventMixin from '@/mixins/ElectronEventMixin';

    import CommitRow from './CommitRow';

    const field_separator = '\x06';

    export default {
        mixins: [ElectronEventMixin('window-focus', 'load')],
        components: { CommitRow },
        inject: ['head', 'commits', 'selected_commit', 'selected_file'],
        async created() {
            await this.load();
        },
        methods: {
            async load() {
                const head = await electron.callGit('rev-parse', 'HEAD');
                if (this.head === (this.head = head)) {
                    return;
                }
                const format = {
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
                };
                const log = await electron.callGit(
                    'log', '-z',
                    '--pretty=format:' + Object.values(format).join(field_separator),
                    '--date=format-local:%Y-%m-%d %H:%M',  // https://stackoverflow.com/questions/7853332/how-to-change-git-log-date-formats
                );
                const commits = [{ hash: 'WORKING_TREE' }];

                for (const row of log.split('\0')) {
                    const commit = Object.fromEntries(_.zip(Object.keys(format), row.split(field_separator)));
                    commit.hash_abbr = commit.hash.slice(0, 7);
                    commits.push(commit);
                }
                this.commits = Object.freeze(commits);

                const selected_hash = this.selected_commit?.hash;
                if (this.commits.every(commit => commit.hash !== selected_hash)) {
                    this.selected_commit = this.commits[0];
                    this.selected_file = null;
                }
            },
        },
    };
</script>
