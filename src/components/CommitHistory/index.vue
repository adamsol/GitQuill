
<template>
    <div class="h-full flex flex-col gap-3">
        <div class="flex items-center gap-1">
            <icon name="mdi-magnify" class="size-5 ml-2 shrink-0" />
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

        <splitpanes
            class="py-1 bg-gray-dark overflow-hidden"
            @resized="commit_history_column_sizes = $_.map($event, 'size')"
        >
            <pane :size="commit_history_column_sizes[0]" class="flex flex-col overflow-x-auto min-w-12">
                <!-- `list-class="static"` is necessary for horizontal scroll. -->
                <recycle-scroller
                    v-if="commits !== undefined"
                    ref="references_scroller"
                    class="scrollbar-hidden"
                    :items="commits"
                    :item-size="row_height"
                    key-field="hash"
                    list-class="static"
                    v-slot="{ item }"
                    @scroll="onScroll"
                >
                    <CommitRefsRow :commit="item" />
                </recycle-scroller>
            </pane>
            <pane
                :size="commit_history_column_sizes[1]"
                ref="graph_pane"
                class="relative overflow-auto scrollbar-hidden min-w-8"
                @scroll="onScroll"
            >
                <div
                    v-if="commits !== undefined"
                    class="absolute w-full"
                    :style="{ 'height': `${commits.length * row_height}px` }"
                />
                <CommitGraph
                    v-if="commits !== undefined"
                    class="sticky top-0"
                    :row_height
                    :scroll_position
                />
            </pane>
            <pane class="flex flex-col min-w-96">
                <recycle-scroller
                    v-if="commits !== undefined"
                    ref="main_scroller"
                    emit-update
                    :items="commits"
                    item-class="pt-1"
                    :item-size="row_height"
                    key-field="hash"
                    v-slot="{ item }"
                    @scroll="onScroll"
                >
                    <CommitRow :commit="item" />
                </recycle-scroller>
            </pane>
        </splitpanes>
    </div>
</template>

<script>
    import ElectronEventMixin from '@/mixins/ElectronEventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import WindowEventMixin from '@/mixins/WindowEventMixin';
    import { getStatus } from '@/utils/git';

    import CommitGraph from './CommitGraph';
    import CommitRefsRow from './CommitRefsRow';
    import CommitRow from './CommitRow';

    const field_separator = '\x06';
    const reference_type_order = ['head', 'tag', 'local_branch', 'remote_branch'];

    export default {
        mixins: [
            ElectronEventMixin('window-focus', 'load'),
            WindowEventMixin('keydown', 'onKeyDown'),
            StoreMixin('commit_history_column_sizes', [10, 10]),
        ],
        components: { CommitGraph, CommitRefsRow, CommitRow },
        inject: [
            'references', 'references_by_hash', 'selected_reference', 'commits', 'selected_commit', 'second_selected_commit',
            'current_branch_name', 'current_head', 'current_operation', 'working_tree_files', 'selected_file',
            'updateSelectedFile',
        ],
        data: () => ({
            scroll_position: 0,
            search_query: '',
            search_items: [],
            search_index: null,
        }),
        computed: {
            row_height() {
                return 40;
            },
        },
        watch: {
            selected_commit() {
                const scroller = this.$refs.main_scroller;

                if (this.selected_commit !== null && scroller !== undefined) {
                    const state = scroller.getScroll();
                    const pos = this.selected_commit.index * scroller.itemSize;
                    if (pos < state.start || pos + scroller.itemSize > state.end) {
                        this.$refs.main_scroller.scrollToPosition(pos - (state.end - state.start) / 5);
                    }
                }
            },
        },
        async created() {
            await this.load();
        },
        async activated() {
            await this.load();
        },
        methods: {
            async load() {
                await Promise.all([
                    this.loadHistory(),
                    this.loadStatus(),
                ]);
            },
            async loadHistory() {
                const summary = await repo.callGit('show-ref', '--dereference', '--head');
                let references = [];
                const tags = {};

                for (const line of _.filter(summary.split('\n'))) {
                    let [hash, name] = line.split(' ');
                    let reference;

                    if (name === 'HEAD') {
                        reference = { type: 'head', name, hash };
                    } else if (name.startsWith('refs/tags/')) {
                        // Handle both lightweight and annotated tags. Annotated tags appear twice.
                        reference = { type: 'tag', name: name.split('/').slice(2).join('/').replace(/\^\{}$/, ''), hash };
                        if (tags[reference.name] === undefined) {
                            tags[reference.name] = reference;
                        } else {
                            tags[reference.name].hash = hash;
                            continue;
                        }
                    } else if (name.startsWith('refs/heads/')) {
                        reference = { type: 'local_branch', name: name.split('/').slice(2).join('/'), hash };
                    } else if (name.startsWith('refs/remotes/') && !name.endsWith('/HEAD')) {
                        reference = { type: 'remote_branch', name: name.split('/').slice(2).join('/'), hash };
                    } else {
                        continue;
                    }
                    references.push(reference);
                }
                references = _.sortBy(references, 'name');

                if (_.isEqual(this.references, references)) {
                    return;
                }
                this.references = Object.freeze(references);

                if (this.selected_reference !== null && !_.some(this.references, _.pick(this.selected_reference, 'type', 'name'))) {
                    this.selected_reference = null;
                }

                // https://git-scm.com/docs/git-log#_pretty_formats
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
                const log = await repo.callGit(
                    'log', 'HEAD', '--branches', '--tags', '--remotes', '--date-order', '-z',
                    '--pretty=format:' + Object.values(format).join(field_separator),
                    '--date=format-local:%Y-%m-%d %H:%M',  // https://stackoverflow.com/questions/7853332/how-to-change-git-log-date-formats
                );
                const commits = [
                    { hash: 'WORKING_TREE', parents: this.current_head },
                    ...log.split('\0').map(row => Object.fromEntries(_.zip(Object.keys(format), row.split(field_separator)))),
                ];
                const occupied_levels = {};
                const running_commits = new Set();
                const remaining_parents = {};
                const children = {};

                for (const [i, commit] of commits.entries()) {
                    commit.index = i;
                    commit.hash_abbr = commit.hash.slice(0, 7);
                    commit.references = _.sortBy(this.references_by_hash[commit.hash], ref => reference_type_order.indexOf(ref.type));
                    commit.parents = commit.parents ? commit.parents.split(' ') : [];
                    for (const parent_hash of commit.parents) {
                        children[parent_hash] ??= [];
                        children[parent_hash].push(commit);
                        remaining_parents[commit.hash] = new Set(commit.parents);
                    }
                    for (const child of _.sortBy(children[commit.hash], 'level')) {
                        if (occupied_levels[child.level] === child && commit.hash === child.parents[0]) {
                            commit.level = child.level;
                            break;
                        }
                    }
                    if (commit.level === undefined) {
                        for (let level = 0; ; ++level) {
                            if (occupied_levels[level] === undefined) {
                                commit.level = level;
                                break;
                            }
                        }
                    }
                    if (commit.parents.length > 0) {
                        occupied_levels[commit.level] = commit;
                        running_commits.add(commit);
                    }
                    for (const child of children[commit.hash] ?? []) {
                        remaining_parents[child.hash].delete(commit.hash);
                        if (remaining_parents[child.hash].size === 0) {
                            if (child.level > commit.level) {
                                delete occupied_levels[child.level];
                            }
                            running_commits.delete(child);
                        }
                    }
                    commit.running_commits = [...running_commits];
                }
                if (this.commits === undefined || this.selected_commit?.hash === 'WORKING_TREE') {
                    this.selected_commit = Object.freeze(commits[0]);
                }
                this.commits = Object.freeze(commits);

                if (this.selected_commit !== null && !_.some(this.commits, _.pick(this.selected_commit, 'hash'))) {
                    this.selected_commit = null;
                    this.selected_file = null;
                }
                if (this.second_selected_commit !== null && !_.some(this.commits, _.pick(this.second_selected_commit, 'hash'))) {
                    this.second_selected_commit = null;
                    this.selected_file = null;
                }
                await this.search();
            },
            async loadStatus() {
                let operation = null;

                for (const [type, path] of [
                    ['rebase', '.git/rebase-merge/stopped-sha'],
                    ['cherry-pick', '.git/CHERRY_PICK_HEAD'],
                    ['revert', '.git/REVERT_HEAD'],
                ]) {
                    const hash = await repo.readFile(path, true);
                    if (hash !== null) {
                        operation = { type, hash: hash.trim() };
                        break;
                    }
                }
                this.current_operation = operation;

                const { branch, ...files } = Object.freeze(await getStatus('--branch'));
                this.current_branch_name = branch === 'HEAD' ? null : branch;
                this.working_tree_files = files;

                if (this.selected_commit?.hash === 'WORKING_TREE') {
                    this.updateSelectedFile();
                }
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
                this.selected_commit = Object.freeze(this.commits[this.search_items[this.search_index]]);
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
            onScroll(event) {
                this.scroll_position = event.target.scrollTop;
                this.$refs.main_scroller.scrollToPosition(this.scroll_position);
                this.$refs.references_scroller.scrollToPosition(this.scroll_position);
                this.$refs.graph_pane.$el.scrollTop = this.scroll_position;
            },
        },
    };
</script>
