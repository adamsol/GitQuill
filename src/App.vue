
<template>
    <splitpanes class="h-full gap-1" @resized="onResize">
        <pane :size="main_pane_size">
            <CommitHistory class="py-2" />
        </pane>
        <pane>
            <CommitDetails class="py-2 pr-3" />
        </pane>
    </splitpanes>
</template>

<script>
    import { computed as vue_computed } from 'vue/dist/vue.esm-bundler';

    import CommitDetails from './components/CommitDetails';
    import CommitHistory from './components/CommitHistory';

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
        components: { CommitDetails, CommitHistory },
        mixins: [provideReactively({
            data: {
                main_pane_size: electron.store.get('main_pane_size', 60),
                selected_commit: null,
            },
        })],
        methods: {
            onResize(panes) {
                electron.store.set('main_pane_size', panes[0].size);
            },
        },
    };
</script>
