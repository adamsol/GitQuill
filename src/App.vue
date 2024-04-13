
<template>
    <splitpanes class="h-full gap-1" @resized="main_pane_size = $event[0].size">
        <pane :size="main_pane_size">
            <CommitHistory v-if="selected_file === null" class="py-2" />
            <FileDiff v-else />
        </pane>
        <pane>
            <CommitDetails class="py-2 pr-3" />
        </pane>
    </splitpanes>
</template>

<script>
    import { computed as vue_computed } from 'vue/dist/vue.esm-bundler';

    import StoreMixin from '@/mixins/StoreMixin';

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
                    selected_commit: null,
                    selected_file: null,
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
