
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
                    async updateFileStatus(file) {
                        // https://stackoverflow.com/questions/71268388/show-renamed-moved-status-with-git-diff-on-single-file
                        const status = await getStatus('--', file.path, ..._.filter([file.old_path]));
                        const files = _.cloneDeep(this.files);

                        for (const area of ['unstaged', 'staged']) {
                            files[area] = _.reject(files[area], { path: file.path });
                            files[area] = _.sortBy([...files[area], ...status[area]], 'path');
                        }
                        this.files = Object.freeze(files);
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
                        const file = this.files[area].find(file => file.path >= this.selected_file.path);
                        this.selected_file = file ?? _.last(this.files[area]) ?? null;
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
    };
</script>
