
<template>
    <div v-if="repo_details.path === undefined" class="h-full flex flex-col gap-2 items-center justify-center">
        <input v-model.trim="repo_details.label" placeholder="Label" />
        <btn @click="openRepo">
            <icon name="mdi-folder" class="size-5" />
            Open repository
        </btn>
    </div>
    <div v-else-if="show" class="h-full flex flex-col">
        <ActionBar />
        <div class="grow overflow-hidden">
            <splitpanes @resized="main_pane_size = $event[0].size">
                <pane :size="main_pane_size">
                    <splitpanes v-show="selected_file === null" @resized="references_pane_size = $event[0].size">
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

    import StoreMixin from '@/mixins/StoreMixin';
    import { getStatus } from '@/utils/git';

    import ActionBar from './ActionBar';
    import CommitDetails from './CommitDetails';
    import CommitHistory from './CommitHistory';
    import FileDiff from './FileDiff';
    import ReferenceDetails from './ReferenceDetails';
    import ReferenceList from './ReferenceList';

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
            data: data,
            computed,
            methods,
        };
    }

    export default {
        components: { ActionBar, CommitDetails, CommitHistory, FileDiff, ReferenceDetails, ReferenceList },
        mixins: [
            provideReactively({
                data: () => ({
                    references: undefined,
                    selected_reference: null,
                    hidden_references: new Set(),
                    commits: undefined,
                    selected_commits: [],
                    autolinks: undefined,
                    current_branch_name: null,
                    current_operation: null,
                    working_tree_files: undefined,
                    selected_file: null,
                    save_semaphore: Promise.resolve(),
                }),
                computed: {
                    repo() {
                        const handleErrors = async promise => {
                            try {
                                return await promise;
                            } catch (e) {
                                const message = e.message.replace(/^Error invoking remote method '[\w-]+': Error: /, '');
                                this.error_messages.push(message);
                                throw e;
                            }
                        };
                        return Object.freeze({
                            openTerminal: async () => await handleErrors(electron.openTerminal(this.repo_details.path)),
                            callGit: async (...args) => await handleErrors(electron.callGit(this.repo_details.path, ...args)),
                            ...Object.fromEntries(['readFile', 'writeFile', 'deleteFile'].map(func_name =>
                                [func_name, async (...args) => await handleErrors(electron[func_name](this.repo_details.path, ...args))]
                            )),
                        });
                    },
                    references_by_hash() {
                        return _.groupBy(this.references, 'hash');
                    },
                    references_by_type() {
                        return _.groupBy(this.references, 'type');
                    },
                    commit_by_hash() {
                        return _.keyBy(this.commits, 'hash');
                    },
                    selected_commit_hashes() {
                        return new Set(_.map(this.selected_commits, 'hash'));
                    },
                    commits_to_diff() {
                        if (this.selected_commits.length <= 2) {
                            const second_commit_or_parent =
                                this.selected_commits[1] ??
                                this.commit_by_hash[this.selected_commits[0].parents[0]] ??
                                { hash: 'EMPTY_ROOT', index: Infinity }
                            ;
                            return _.sortBy([this.selected_commits[0], second_commit_or_parent], 'index');
                        }
                    },
                    current_head() {
                        return this.references_by_type.head[0].hash;
                    },
                    current_operation_label() {
                        return {
                            'rebase': 'Rebasing',
                            'cherry-pick': 'Cherry-picking',
                            'revert': 'Reverting',
                        }[this.current_operation?.type];
                    },
                    uncommitted_changes_count() {
                        if (this.working_tree_files !== undefined) {
                            const unique_file_paths = new Set(_.map([...this.working_tree_files.unstaged, ...this.working_tree_files.staged], 'path'));
                            return unique_file_paths.size;
                        }
                    },
                },
                methods: {
                    setSelectedReference(reference) {
                        this.selected_reference = reference;
                        if (reference !== null) {
                            this.setSelectedCommits([]);
                        }
                    },
                    setSelectedCommits(commits) {
                        this.selected_commits = commits.map(Object.freeze);
                        if (commits.length > 0) {
                            this.setSelectedReference(null);
                        }
                    },
                    isCurrentBranch(reference) {
                        return reference.type === 'local_branch' && reference.name === this.current_branch_name;
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
                    updateSelectedFile() {
                        if (this.selected_file === null) {
                            return;
                        }
                        let area = this.selected_file.area;
                        // For rebasing.
                        if (area === 'committed') {
                            area = 'unstaged';
                        }
                        const file = this.working_tree_files[area].find(file => file.path >= this.selected_file.path);
                        this.selected_file = file ?? _.last(this.working_tree_files[area]) ?? null;
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
            StoreMixin('main_pane_size', 70),
            StoreMixin('references_pane_size', 15),
        ],
        props: {
            repo_details: { type: Object, required: true },
        },
        data: () => ({
            show: false,
            error_messages: [],
        }),
        watch: {
            repo_details: {
                async handler() {
                    if (this.repo_details.path !== undefined) {
                        const hidden_references_content = await this.repo.readFile('.git/.quill/hidden-refs.txt', { null_if_not_exists: true });
                        this.hidden_references = new Set(hidden_references_content?.split('\n') ?? []);

                        const autolinks_content = await this.repo.readFile('.git/.quill/autolinks.json5', { null_if_not_exists: true });
                        this.autolinks = JSON5.parse(autolinks_content ?? '[]');
                    }
                },
                deep: true,
                immediate: true,
            },
            hidden_references: {
                async handler() {
                    await this.repo.writeFile('.git/.quill/hidden-refs.txt', [...this.hidden_references].join('\n'));
                },
                deep: true,
            },
        },
        async created() {
            // Prevent running the `activated` hook when components are created,
            // in order to avoid loading data twice.
            // https://github.com/vuejs/core/issues/10806
            await this.$nextTick();
            this.show = true;
        },
        methods: {
            async openRepo() {
                let path = await electron.openRepo();
                if (path !== undefined) {
                    path = path.replace(/\\/g, '/');
                    this.repo_details.path = path;
                    this.repo_details.label ??= path.slice(path.lastIndexOf('/') + 1);
                }
            },
        },
    };
</script>
