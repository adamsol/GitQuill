
<template>
    <div v-if="repo_details.path === undefined" class="h-full flex flex-col gap-2 items-center justify-center">
        <input v-model.trim="repo_details.label" placeholder="Label" />
        <btn @click="openRepo">
            <icon name="mdi-folder" class="size-5" />
            Open repository
        </btn>
    </div>
    <splitpanes v-else-if="show" @resized="main_pane_size = $event[0].size">
        <pane :size="main_pane_size">
            <CommitHistory v-show="selected_file === null" ref="commit_history" class="py-2" />
            <FileDiff v-if="selected_file !== null" ref="file_diff" />
        </pane>
        <pane class="min-w-80">
            <CommitDetails
                v-if="selected_commit !== undefined"
                class="pt-2 pb-4 pr-4"
            />
        </pane>
    </splitpanes>
</template>

<script>
    import { computed as vue_computed } from 'vue/dist/vue.esm-bundler';

    import StoreMixin from '@/mixins/StoreMixin';
    import { getStatus } from '@/utils/git';

    import CommitDetails from './CommitDetails';
    import CommitHistory from './CommitHistory';
    import FileDiff from './FileDiff';

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
        components: { CommitDetails, CommitHistory, FileDiff },
        mixins: [
            provideReactively({
                data: () => ({
                    commits: undefined,
                    selected_commit: undefined,
                    rebasing: false,
                    working_tree_files: undefined,
                    selected_file: null,
                    save_semaphore: Promise.resolve(),
                }),
                computed: {
                    commits_by_hash() {
                        return _.keyBy(this.commits, 'hash');
                    },
                    uncommitted_changes_count() {
                        if (this.working_tree_files !== undefined) {
                            const unique_file_paths = new Set(_.map([...this.working_tree_files.unstaged, ...this.working_tree_files.staged], 'path'));
                            return unique_file_paths.size;
                        }
                    },
                },
                methods: {
                    async updateFileStatus(file) {
                        // https://stackoverflow.com/questions/71268388/show-renamed-moved-status-with-git-diff-on-single-file
                        const status = await getStatus('--', file.path, ..._.filter([file.old_path]));
                        const files = _.cloneDeep(this.working_tree_files);

                        for (const area of ['unstaged', 'staged']) {
                            files[area] = _.reject(files[area], { path: file.path });
                            files[area] = _.sortBy([...files[area], ...status[area]], 'path');
                        }
                        this.working_tree_files = Object.freeze(files);
                    },
                    updateSelectedFile() {
                        if (this.selected_file === null || this.selected_commit?.hash !== 'WORKING_TREE' ) {
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
                        await this.$refs.file_diff?.save();
                    },
                    async refreshHistory() {
                        await this.$refs.commit_history.loadHistory();
                    },
                    async refreshStatus() {
                        await this.$refs.commit_history.loadStatus();
                    },
                },
            }),
            StoreMixin('main_pane_size', 70),
        ],
        props: {
            repo_details: { type: Object, required: true },
        },
        data: () => ({
            show: false,
        }),
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
