
<template>
    <div v-show="active" class="h-full flex flex-col">
        <div v-if="repo_details.path === undefined" class="grow flex flex-col gap-2 items-center justify-center">
            <input
                v-model.trim="repo_details.title"
                placeholder="Title"
                :spellcheck="false"
            />
            <btn @click="openRepo">
                <icon name="mdi-folder" class="size-5" />
                Open repository
            </btn>
        </div>

        <template v-else>
            <ActionBar class="pt-1.5 pb-0.5" />

            <div class="grow overflow-hidden">
                <splitpanes
                    :dbl-click-splitter="false"
                    @resized="main_pane_size = $event[0].size"
                >
                    <pane :size="main_pane_size">
                        <splitpanes
                            v-show="selected_file === null"
                            :dbl-click-splitter="false"
                            @resized="references_pane_size = $event[0].size"
                        >
                            <pane class="min-w-48" :size="references_pane_size">
                                <ReferenceList class="pt-2 pb-4 pl-4" />
                            </pane>
                            <pane>
                                <CommitHistory ref="commit_history" class="py-2" />
                            </pane>
                        </splitpanes>
                        <FileDiff v-if="selected_file !== null" ref="file_diff" />
                    </pane>
                    <pane class="min-w-96">
                        <CommitDetails
                            v-if="selected_commits.length > 0"
                            class="pt-2 pb-4 pr-4"
                        />
                        <ReferenceDetails
                            v-else-if="selected_reference !== null"
                            class="pt-2 pb-4 pr-4"
                        />
                    </pane>
                </splitpanes>
            </div>
        </template>
    </div>

    <modal v-if="error_messages.length > 0" @close="error_messages.shift()">
        <div class="whitespace-pre font-mono">
            {{ error_messages[0] }}
        </div>
    </modal>
</template>

<script>
    import JSON5 from 'json5';
    import { computed as vue_computed } from 'vue/dist/vue.esm-bundler';

    import { ReferenceNode } from '@/domain/reference-node';
    import StoreMixin from '@/mixins/StoreMixin';
    import { getReferenceAncestorIds, getStatus } from '@/utils/git';

    import ActionBar from './ActionBar';
    import CommitDetails from './CommitDetails';
    import CommitHistory from './CommitHistory';
    import FileDiff from './FileDiff';
    import ReferenceDetails from './ReferenceDetails';
    import ReferenceList from './ReferenceList';

    const reference_state_files = [
        ['hidden_references', 'hidden-refs.txt'],
        ['collapsed_references', 'collapsed-refs.txt'],
    ];

    function provideReactively({ data = () => ({}), computed = {}, methods = {} }) {
        return {
            provide() {
                const names = [...Object.keys(data()), ...Object.keys(computed), ...Object.keys(methods)];
                // https://vuejs.org/guide/components/provide-inject.html#working-with-reactivity
                return Object.fromEntries(names.map(name => [name, vue_computed({
                    get: () => this[name],
                    set: value => this[name] = value,
                })]));
            },
            data,
            computed,
            methods,
        };
    }

    export default {
        components: { ActionBar, CommitDetails, CommitHistory, FileDiff, ReferenceDetails, ReferenceList },
        mixins: [
            provideReactively({
                data: () => ({
                    config: undefined,
                    references: undefined,
                    selected_reference: null,
                    hidden_references: new Set(),
                    collapsed_references: new Set(),
                    commits: undefined,
                    selected_commits: [],
                    current_branch_name: null,
                    current_operation: null,
                    working_tree_files: undefined,
                    selected_file: null,
                    save_semaphore: Promise.resolve(),
                }),
                computed: {
                    tab_active() {
                        return this.active;
                    },
                    repo() {
                        const handleErrors = async promise => {
                            try {
                                return await promise;
                            } catch (e) {
                                const message = e.message.replace(/^Error invoking remote method '[\w-]+': Error: /, '');
                                if (_.last(this.error_messages) !== message) {
                                    this.error_messages.push(message);
                                }
                                throw e;
                            }
                        };
                        return Object.freeze(Object.fromEntries(
                            ['openTerminal', 'callGit', 'readFile', 'writeFile', 'deleteFile'].map(func_name =>
                                [func_name, async (...args) => await handleErrors(electron[func_name](this.repo_details.path, ...args))]
                            )
                        ));
                    },
                    references_by_hash() {
                        return _.groupBy(this.references, 'hash');
                    },
                    references_by_type() {
                        return _.groupBy(this.references, 'type');
                    },
                    reference_tree() {
                        const roots = {};
                        const nodes = {};

                        for (const reference of this.references) {
                            roots[reference.type] ??= new ReferenceNode({ children: [] });
                            let parent = roots[reference.type];
                            const ancestor_ids = getReferenceAncestorIds(reference.id);

                            for (const [depth, id] of ancestor_ids.entries()) {
                                if (nodes[id] === undefined) {
                                    const node = new ReferenceNode({ id, depth, children: [], descendant_count: 0 });
                                    nodes[id] = node;
                                    parent.children.push(node);
                                }
                                parent = nodes[id];
                                parent.descendant_count += 1;
                            }
                            const node = new ReferenceNode({ reference, id: reference.id, depth: ancestor_ids.length });
                            nodes[reference.id] = node;
                            parent.children.push(node);
                        }
                        return { roots, nodes };
                    },
                    commit_by_hash() {
                        return _.keyBy(this.commits, 'hash');
                    },
                    revisions_to_diff() {
                        if (this.selected_commits.length === 1) {
                            const commit = this.commit_by_hash[this.selected_commits[0]];
                            const parent = commit.hash === 'WORKING_TREE' ? 'HEAD' : commit.parents[0] ?? 'EMPTY_ROOT';
                            return [commit.hash, parent];

                        } else if (this.selected_commits.length === 2) {
                            return _.sortBy(this.selected_commits, hash => this.commit_by_hash[hash].index);
                        }
                    },
                    current_head() {
                        return this.references_by_type.head[0].hash;
                    },
                    uncommitted_file_count() {
                        if (this.working_tree_files === undefined) {
                            return 0;
                        }
                        const unique_file_paths = new Set(_.map([...this.working_tree_files.unstaged, ...this.working_tree_files.staged], 'path'));
                        return unique_file_paths.size;
                    },
                },
                methods: {
                    setSelectedReference(reference) {
                        this.selected_reference = reference;
                        if (reference !== null) {
                            this.setSelectedCommits([]);
                        }
                    },
                    setSelectedCommits(hashes) {
                        this.selected_commits = hashes;
                        if (hashes.length > 0) {
                            this.setSelectedReference(null);
                        }
                    },
                    isCurrentBranch(reference) {
                        return reference.type === 'local_branch' && reference.name === this.current_branch_name || reference.type === 'head';
                    },
                    isReferenceHidden(reference) {
                        const node = this.reference_tree.nodes[reference.id];
                        return node === undefined || this.isReferenceNodeHidden(node);
                    },
                    isReferenceNodeHidden(node) {
                        return [node.id, ...getReferenceAncestorIds(node.id)].some(id => this.hidden_references.has(id));
                    },
                    normalizeReferenceState() {
                        for (const references of [this.hidden_references, this.collapsed_references]) {
                            for (const id of references) {
                                if (this.reference_tree.nodes[id] === undefined) {
                                    references.delete(id);
                                }
                            }
                        }
                        const normalizeNode = (node) => {
                            if (node.is_group) {
                                for (const child of node.children) {
                                    normalizeNode(child);
                                }
                                if (!node.is_root && node.children.every(child => this.isReferenceNodeHidden(child))) {
                                    for (const child of node.children) {
                                        this.hidden_references.delete(child.id);
                                    }
                                    this.hidden_references.add(node.id);
                                }
                            }
                        };
                        for (const root of Object.values(this.reference_tree.roots)) {
                            normalizeNode(root);
                        }
                    },
                    async toggleReferenceNodeVisibility(node) {
                        if (this.isReferenceNodeHidden(node)) {
                            for (const pattern of getReferenceAncestorIds(node.id)) {
                                if (this.hidden_references.delete(pattern)) {
                                    for (const child of this.reference_tree.nodes[pattern].children) {
                                        this.hidden_references.add(child.id);
                                    }
                                }
                            }
                            this.hidden_references.delete(node.id);
                        } else {
                            this.hidden_references.add(node.id);
                        }
                        this.normalizeReferenceState();
                        await this.refreshHistory({ skip_references: true });
                    },
                    async updateFileStatus(file) {
                        // https://stackoverflow.com/questions/71268388/show-renamed-moved-status-with-git-diff-on-single-file
                        const status = await getStatus(this.repo, '--', file.path, ..._.filter([file.old_path]));
                        const files = _.cloneDeep(this.working_tree_files);

                        for (const area of ['unstaged', 'staged']) {
                            files[area] = _.reject(files[area], { path: file.path });
                            files[area] = _.sortBy([...files[area], ...status[area]], 'path');
                        }
                        this.working_tree_files = Object.freeze(files);
                    },
                    async saveSelectedFile() {
                        return await this.$refs.file_diff?.save();
                    },
                    async refreshHistory(...args) {
                        await this.$refs.commit_history.loadHistory(...args);
                    },
                    async refreshStatus() {
                        await this.$refs.commit_history.loadStatus();
                    },
                },
            }),
            StoreMixin('main_pane_size', 75),
            StoreMixin('references_pane_size', 15),
        ],
        props: {
            active: { type: Boolean },
            repo_details: { type: Object, required: true },
        },
        data: () => ({
            error_messages: [],
        }),
        watch: {
            'repo_details.path': {
                async handler() {
                    if (this.repo_details.path !== undefined) {
                        await Promise.all(reference_state_files.map(async ([name, filename]) => {
                            const content = await this.repo.readFile(`.git/.quill/${filename}`, { null_if_not_exists: true });
                            this[name] = new Set(_.filter(content?.split('\n') ?? []));
                        }));
                        const config_content = await this.repo.readFile('.git/.quill/config.json5', { null_if_not_exists: true });
                        this.config = Object.freeze(JSON5.parse(config_content ?? '{}'));
                    }
                },
                immediate: true,
            },
            ...Object.fromEntries(reference_state_files.map(([name, filename]) => [name, {
                async handler() {
                    await this.repo.writeFile(`.git/.quill/${filename}`, [...this[name]].join('\n'), { make_directory: true });
                },
                deep: true,
            }])),
        },
        methods: {
            async openRepo() {
                let path = await electron.openRepo();
                if (path !== undefined) {
                    path = path.replace(/\\/g, '/');
                    this.repo_details.path = path;
                    this.repo_details.title ||= path.slice(path.lastIndexOf('/') + 1);
                }
            },
        },
    };
</script>
