
<template>
    <splitpanes @resized="main_pane_size = $event[0].size">
        <pane :size="main_pane_size">
            <CommitHistory
                v-if="selected_file === null"
                :key="commit_history_key"
                class="py-2"
            />
            <FileDiff v-else ref="file_diff" />
        </pane>
        <pane class="min-w-80">
            <CommitDetails class="pt-2 pb-4 pr-4" />
        </pane>
    </splitpanes>
</template>

<script>
    import { computed as vue_computed } from 'vue/dist/vue.esm-bundler';

    import StoreMixin from '@/mixins/StoreMixin';
    import { getStatus } from '@/utils/git';

    import CommitDetails from './components/CommitDetails';
    import CommitHistory from './components/CommitHistory';
    import FileDiff from './components/FileDiff';

    function provideReactively({ data = {}, computed = {}, methods = {} }) {
        const names = [...Object.keys(data), ...Object.keys(computed), ...Object.keys(methods)];
        return {
            provide() {
                // https://vuejs.org/guide/components/provide-inject.html#working-with-reactivity
                return Object.fromEntries(names.map(name => [name, vue_computed({
                    get: () => this[name],
                    set: value => this[name] = value,
                })]));
            },
            data: () => data,
            computed,
            methods,
        };
    }

    export default {
        components: { CommitDetails, CommitHistory, FileDiff },
        mixins: [
            provideReactively({
                data: {
                    commit_history_key: 0,
                    head: undefined,
                    commits: undefined,
                    selected_commit: undefined,
                    files: undefined,
                    selected_file: null,
                    save_semaphore: Promise.resolve(),
                },
                methods: {
                    async updateFileStatus(file_path) {
                        const status = await getStatus(file_path);
                        const files = _.cloneDeep(this.files);

                        for (const area of ['unstaged', 'staged']) {
                            files[area] = files[area].filter(file => file.path !== file_path);
                            if (status[area].length === 1) {
                                files[area] = _.sortBy([...files[area], ...status[area]], 'path');
                            }
                        }
                        this.files = Object.freeze(files);
                    },
                    updateSelectedFile() {
                        if (this.selected_file === null) {
                            return;
                        }
                        const file = this.files[this.selected_file.area].find(file => file.path >= this.selected_file.path);
                        this.selected_file = file ?? _.last(this.files[this.selected_file.area]) ?? null;
                    },
                    async saveSelectedFile() {
                        await this.$refs.file_diff?.save();
                    },
                    refreshCommitHistory() {
                        this.commit_history_key += 1;
                    },
                },
            }),
            StoreMixin('main_pane_size', 70),
        ],
        watch: {
            selected_commit() {
                this.selected_file = null;
            },
        },
    };
</script>
