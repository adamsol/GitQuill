
<template>
    <div class="h-full flex flex-col gap-3">
        <div class="flex items-center gap-1">
            <icon name="mdi-magnify" class="size-5 ml-2" />
            <input
                v-model.trim="search_query"
                ref="search_input"
                class="grow"
                :spellcheck="false"
                @change="search()"
                @input="resetSearch()"
                @keydown.enter.exact="changeSearchIndex(1)"
                @keydown.enter.shift="changeSearchIndex(-1)"
                @keydown.esc="clearSearch()"
                @paste="search()"
            />
            <template v-if="search_index !== null">
                <div class="px-2">
                    {{ search_index + 1 }} / {{ search_items.length }}
                </div>
                <btn title="Previous" @click="changeSearchIndex(-1)">
                    <icon name="mdi-chevron-up" class="size-6" />
                </btn>
                <btn title="Next" @click="changeSearchIndex(1)">
                    <icon name="mdi-chevron-down" class="size-6" />
                </btn>
                <btn title="Clear" @click="clearSearch()">
                    <icon name="mdi-close" class="size-6" />
                </btn>
            </template>
        </div>
        <recycle-scroller
            v-if="commits !== undefined"
            ref="scroller"
            class="grow bg-gray-dark"
            :items="commits"
            :item-size="32"
            key-field="hash"
            v-slot="{ item }"
        >
            <CommitRow :commit="item" />
        </recycle-scroller>
    </div>
</template>

<script>
    import ElectronEventMixin from '@/mixins/ElectronEventMixin';
    import WindowEventMixin from '@/mixins/WindowEventMixin';

    import CommitRow from './CommitRow';

    const field_separator = '\x06';

    export default {
        mixins: [
            ElectronEventMixin('window-focus', 'load'),

            WindowEventMixin('keydown', 'onKeyDown'),
        ],
        components: { CommitRow },
        inject: ['commit_history_key', 'head', 'commits', 'selected_commit', 'selected_file'],
        data: () => ({
            search_query: '',
            search_items: [],
            search_index: null,
        }),
        watch: {
            commit_history_key: {
                async handler() {
                    await this.load();
                },
                immediate: true,
            },
            async selected_file() {
                if (this.selected_file === null) {
                    await this.load();
                }
            },
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
                await this.search();
            },
            async search() {
                // https://stackoverflow.com/questions/48368799/vue-vuex-paste-event-triggered-before-input-binded-value-is-updated
                await new Promise(r => setTimeout(r));

                if (this.search_query === '') {
                    this.resetSearch();
                    return;
                }
                const found = [];
                const attrs = ['hash', 'subject', 'body', 'author_name', 'committer_name'];
                // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
                const regex = new RegExp('(^|\\b|\\W)' + this.search_query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

                for (const [i, commit] of this.commits.entries()) {
                    if (i > 0 && _.some(attrs.map(attr => commit[attr]), value => regex.test(value))) {
                        found.push(i);
                    }
                }
                this.search_items = found;
                if (found.length > 0) {
                    this.setSearchIndex(0);
                } else {
                    this.search_index = -1;
                }
            },
            changeSearchIndex(delta) {
                if (this.search_items.length > 0) {
                    this.setSearchIndex((this.search_index + delta + this.search_items.length) % this.search_items.length);
                }
            },
            setSearchIndex(index) {
                this.search_index = index;
                this.selected_commit = this.commits[this.search_items[this.search_index]];

                const scroller = this.$refs.scroller;
                const state = scroller.getScroll();
                const pos = this.search_items[this.search_index] * scroller.itemSize;
                if (pos < state.start || pos + scroller.itemSize > state.end) {
                    this.$refs.scroller.scrollToPosition(pos - (state.end - state.start) / 5);
                }
            },
            resetSearch() {
                this.search_index = null;
                this.search_items = [];
            },
            clearSearch() {
                this.search_query = '';
                this.$refs.search_input.blur();
                this.resetSearch();
            },
            onKeyDown(event) {
                if (event.ctrlKey && event.key === 'f') {
                    this.$refs.search_input.focus();
                }
            },
        },
    };
</script>
