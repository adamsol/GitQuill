
<template>
    <div class="h-full flex flex-col gap-3">
        <div class="flex items-center gap-1">
            <icon name="mdi-magnify" class="size-5 shrink-0" />
            <input
                v-model.trim="search_query"
                ref="search_input"
                class="grow"
                placeholder="Search commits"
                :spellcheck="false"
                @input="resetSearch()"
                @keydown.enter.exact="search_index === null ? search() : changeSearchIndex(1)"
                @keydown.enter.shift="changeSearchIndex(-1)"
                @keydown.esc="clearSearch()"
                @paste="search()"
            />
            <template v-if="search_index !== null">
                <div class="px-2">
                    {{ search_index + 1 }} / {{ search_hashes.length }}
                </div>
                <btn title="Previous" @click="changeSearchIndex(-1)">
                    <icon name="mdi-chevron-up" class="size-6" />
                </btn>
                <btn title="Next" @click="changeSearchIndex(1)">
                    <icon name="mdi-chevron-down" class="size-6" />
                </btn>
                <btn title="Clear search" @click="clearSearch()">
                    <icon name="mdi-close" class="size-6" />
                </btn>
            </template>

            <hr class="mx-2" />
            <btn title="Commit history settings" @click="show_settings_modal = true">
                <icon name="mdi-cog-outline" class="size-6" />
            </btn>

            <SettingsModal
                v-if="show_settings_modal"
                v-model:initial_limit="commit_history_initial_limit"
                v-model:search_limit="commit_history_search_limit"
                @close="show_settings_modal = false"
            />
        </div>

        <div class="grow py-1 bg-gray-dark overflow-hidden relative">
            <splitpanes
                :dbl-click-splitter="false"
                @resized="[commit_refs_column_size, commit_graph_column_size] = $_.map($event, 'size')"
            >
                <pane :size="commit_refs_column_size" class="flex flex-col overflow-x-auto min-w-12">
                    <!-- `list-class="static"` is necessary for horizontal scroll. -->
                    <recycle-scroller
                        v-if="commits !== undefined"
                        ref="references_scroller"
                        class="scrollbar-hidden"
                        emit-update
                        :items="commits"
                        :item-size="row_height"
                        key-field="hash"
                        list-class="static"
                        v-slot="{ item }"
                        @scroll="onScroll"
                        @update="onScrollerUpdate"
                    >
                        <CommitRefsRow :key="item.hash" :commit="item" />
                    </recycle-scroller>
                </pane>
                <pane
                    :size="commit_graph_column_size"
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
                        <CommitRow :key="item.hash" :commit="item" />
                    </recycle-scroller>
                </pane>
            </splitpanes>

            <btn
                v-if="commits !== undefined && !scrolled_to_top"
                class="absolute left-1/2 -translate-x-1/2 top-3 bg-gray-dark/80 border border-accent hover:!bg-gray-bg"
                @click="$refs.main_scroller.$el.scrollTop = 0"
            >
                <icon name="mdi-arrow-up" class="size-5" />
                Scroll to top
            </btn>
            <btn
                v-if="scrolled_to_bottom && !loaded_all"
                class="absolute left-1/2 -translate-x-1/2 bottom-3 bg-gray-dark/80 border border-accent hover:!bg-gray-bg"
                @click="loadMore"
            >
                <icon name="mdi-arrow-down" class="size-5" />
                Load more
            </btn>
        </div>
    </div>
</template>

<script>
    import ElectronEventMixin from '@/mixins/ElectronEventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import WindowEventMixin from '@/mixins/WindowEventMixin';
    import { getStatus } from '@/utils/git';

    import CommitGraph from './CommitGraph';
    import CommitRefsRow from './CommitRefsRow';
    import CommitRow from './CommitRow'
    import SettingsModal from './SettingsModal';

    const field_separator = '\x06';
    const commit_limit_multiplier = 4;

    export default {
        mixins: [
            StoreMixin('commit_refs_column_size', 20),
            StoreMixin('commit_graph_column_size', 10),
            StoreMixin('commit_history_initial_limit', 100),
            StoreMixin('commit_history_search_limit', null),

            ElectronEventMixin('window-focus', 'load'),
            WindowEventMixin('keydown', 'onKeyDown'),
        ],
        components: { CommitGraph, CommitRefsRow, CommitRow, SettingsModal },
        inject: [
            'tab_active', 'repo', 'references', 'references_by_hash', 'selected_reference', 'hidden_references',
            'commits', 'commit_by_hash', 'revisions_to_diff', 'selected_commits',
            'current_branch_name', 'current_head', 'current_operation', 'working_tree_files', 'selected_file',
            'setSelectedReference', 'setSelectedCommits', 'updateSelectedFile',
        ],
        data: () => ({
            current_commit_limit: undefined,
            scroll_position: 0,
            scrolled_to_top: undefined,
            scrolled_to_bottom: undefined,
            search_query: '',
            search_hashes: [],
            search_index: null,
            show_settings_modal: false,
        }),
        computed: {
            row_height() {
                return 40;
            },
            loaded_all() {
                return this.current_commit_limit === null || this.current_commit_limit > this.commits.length - 1;
            },
        },
        watch: {
            async tab_active() {
                if (this.tab_active) {
                    await this.load();
                }
            },
            selected_commits(new_value, old_value) {
                const scroller = this.$refs.main_scroller;

                if (new_value.length === 1 && old_value.length <= 1 && scroller !== undefined) {
                    const state = scroller.getScroll();
                    const pos = this.commit_by_hash[new_value[0]].index * scroller.itemSize;
                    if (pos < state.start || pos + scroller.itemSize > state.end) {
                        this.$refs.main_scroller.scrollToPosition(pos - (state.end - state.start) / 5);
                    }
                }
            },
            async commit_history_initial_limit() {
                if (this.search_index === null) {
                    await this.loadHistory({ skip_references: true });
                }
            },
            async commit_history_search_limit() {
                if (this.search_index !== null) {
                    await this.loadHistory({ skip_references: true });
                }
            },
        },
        async created() {
            await this.load();
        },
        methods: {
            async load() {
                await Promise.all([
                    this.loadHistory(),
                    this.loadStatus(),
                ]);
            },
            async loadHistory({ skip_references = false, limit } = {}) {
                if (!skip_references) {
                    const summary = await this.repo.callGit(
                        'for-each-ref', '--sort=version:refname',
                        '--format=%(refname) %(objectname) %(*objectname)',  // https://stackoverflow.com/questions/1862423/how-to-tell-which-commit-a-tag-points-to-in-git
                    );
                    const references_by_type = {};

                    for (const line of _.filter(summary.split('\n'))) {
                        const [id, ...hashes] = line.split(' ');
                        const name = id.split('/').slice(2).join('/');
                        const hash = hashes[1] || hashes[0];
                        let type;

                        if (id.startsWith('refs/tags/')) {
                            type = 'tag';
                        } else if (id.startsWith('refs/heads/')) {
                            type = 'local_branch';
                        } else if (id.startsWith('refs/remotes/') && !id.endsWith('/HEAD')) {
                            type = 'remote_branch';
                        } else {
                            continue;
                        }
                        references_by_type[type] ??= [];
                        references_by_type[type].push({ type, name, id, hash });
                    }
                    references_by_type.tag?.reverse();
                    const references = Object.values(references_by_type).flat();

                    let head = (await this.repo.readFile('.git/HEAD')).trim();
                    const prefix = 'ref: refs/heads/';

                    if (head.startsWith(prefix)) {
                        const name = head.slice(prefix.length);
                        head = _.find(references, { type: 'local_branch', name }).hash;
                        this.current_branch_name = name;
                    } else {
                        this.current_branch_name = null;
                    }
                    references.push({ type: 'head', name: 'HEAD', id: 'HEAD', hash: head });

                    if (_.isEqual(this.references, references)) {
                        return;
                    }
                    this.references = Object.freeze(references);

                    if (this.selected_reference !== null) {
                        const reference = _.find(this.references, { id: this.selected_reference.id });
                        this.setSelectedReference(reference ?? null);
                    }
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
                const excluded_references = [...this.hidden_references, 'refs/stash'];

                if (limit === undefined) {
                    limit = this.search_index === null ? this.commit_history_initial_limit : this.commit_history_search_limit;

                    if (limit !== null) {
                        const scroller = this.$refs.main_scroller;
                        if (scroller !== undefined) {
                            const state = scroller.getScroll();
                            while ((limit + 1) * scroller.itemSize < state.end) {
                                limit *= commit_limit_multiplier;
                            }
                        }
                    }
                }
                const log = await this.repo.callGit(
                    'log', ..._.map(excluded_references, id => `--exclude=${id}`), '--all', '--date-order', '-z',
                    '--pretty=format:' + Object.values(format).join(field_separator),
                    '--date=format-local:%Y-%m-%d %H:%M',  // https://stackoverflow.com/questions/7853332/how-to-change-git-log-date-formats
                    ...limit === null ? [] : [`--max-count=${limit}`],
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
                    commit.hash_abbr = commit.hash.slice(0, settings.hash_abbr_length);
                    commit.references = this.references_by_hash[commit.hash] ?? [];
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
                if (this.commits === undefined) {
                    this.setSelectedCommits(['WORKING_TREE']);
                }
                this.commits = Object.freeze(commits);
                this.current_commit_limit = limit;

                if (!_.every(this.selected_commits, hash => _.find(this.commits, { hash }) !== undefined)) {
                    this.setSelectedCommits([]);
                    this.selected_file = null;
                }
                if (this.search_index !== null) {
                    await this.search();
                }
            },
            async loadStatus() {
                let operation = null;

                for (const [type, path] of [
                    ['rebase', '.git/rebase-merge/stopped-sha'],
                    ['cherry-pick', '.git/CHERRY_PICK_HEAD'],
                    ['revert', '.git/REVERT_HEAD'],
                    ['merge', '.git/MERGE_HEAD'],
                ]) {
                    const hash = await this.repo.readFile(path, { null_if_not_exists: true });

                    if (hash !== null) {
                        const label = {
                            'rebase': 'Rebasing',
                            'cherry-pick': 'Cherry-picking',
                            'revert': 'Reverting',
                            'merge': 'Merging',
                        }[type];
                        const conflict_message = await this.repo.readFile('.git/MERGE_MSG', { null_if_not_exists: true });

                        operation = {
                            type,
                            label,
                            hash: hash.trim(),
                            conflict_message: conflict_message?.split('\n').filter(line => !line.startsWith('#')).join('\n'),
                            conflict: conflict_message !== null,
                        };
                        break;
                    }
                }
                this.current_operation = operation;

                this.working_tree_files = Object.freeze(await getStatus(this.repo));

                if (this.revisions_to_diff?.includes('WORKING_TREE')) {
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
                if (this.commit_history_search_limit === null ? !this.loaded_all : this.commits.length - 1 < this.commit_history_search_limit) {
                    await this.loadHistory({
                        skip_references: true,
                        limit: this.commit_history_search_limit,
                    });
                }
                // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
                const regexes = this.search_query.split(/\s+/).map(term =>
                    new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                );
                const found = [];

                for (const [i, commit] of this.commits.entries()) {
                    if (i > 0) {
                        const values = ['hash', 'subject', 'body', 'author_name', 'committer_name'].map(attr => commit[attr]);
                        values.push(..._.map(commit.references, 'name'));

                        if (_.every(regexes, regex => _.some(values, value => regex.test(value)))) {
                            found.push(commit.hash);
                        }
                    }
                }
                const preserved_index = found.indexOf(this.search_hashes[this.search_index]);
                this.search_hashes = found;

                if (found.length > 0) {
                    if (this.search_index === null) {
                        this.setSearchIndex(0);
                    } else {
                        this.setSearchIndex(preserved_index, { select: false });
                    }
                } else {
                    this.search_index = -1;
                }
            },
            changeSearchIndex(delta) {
                if (this.search_hashes.length > 0) {
                    this.setSearchIndex((this.search_index + delta + this.search_hashes.length) % this.search_hashes.length);
                }
            },
            setSearchIndex(index, { select = true } = {}) {
                this.search_index = index;
                if (select) {
                    this.setSelectedCommits([this.search_hashes[this.search_index]]);
                }
            },
            resetSearch() {
                this.search_index = null;
                this.search_hashes = [];
            },
            clearSearch() {
                this.search_query = '';
                this.$refs.search_input.blur();
                this.resetSearch();
            },
            async loadMore() {
                await this.loadHistory({
                    skip_references: true,
                    limit: this.current_commit_limit * commit_limit_multiplier,
                });
            },
            onKeyDown(event) {
                if (this.selected_file !== null) {
                    return;
                }
                if (event.ctrlKey && event.key === 'f') {
                    this.$refs.search_input.focus();
                }
                if (event.key === 'F3') {
                    this.changeSearchIndex(event.shiftKey ? -1 : 1);
                }
            },
            onScroll(event) {
                this.scroll_position = event.target.scrollTop;
                this.$refs.main_scroller.scrollToPosition(this.scroll_position);
                this.$refs.references_scroller.scrollToPosition(this.scroll_position);
                this.$refs.graph_pane.$el.scrollTop = this.scroll_position;
            },
            onScrollerUpdate() {
                const scroller = this.$refs.main_scroller;
                const state = scroller.getScroll();

                this.scrolled_to_top = state.start < scroller.itemSize;
                this.scrolled_to_bottom = state.end > (this.commits.length - 1) * scroller.itemSize;
            },
        },
    };
</script>
