
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center">
            <draggable v-model="tabs" item-key="id" class="flex items-center overflow-x-auto">
                <template #item="{ element: tab }">
                    <div
                        class="clickable pl-4 pr-2 py-1.5 flex gap-3 whitespace-nowrap"
                        :class="{ active: tab.id === selected_tab_id }"
                        @click="selected_tab_id = tab.id"
                    >
                        {{ tab.label ?? "New tab" }}
                        <btn title="Close" @click.stop="closeTab(tab)">
                            <icon name="mdi-close" class="size-4" />
                        </btn>
                    </div>
                </template>
            </draggable>
            <btn title="Add tab" @click="addTab">
                <icon name="mdi-plus" class="size-6" />
            </btn>
        </div>
        <hr class="mb-1" />

        <div class="grow overflow-hidden">
            <keep-alive v-for="tab in tabs" :key="tab.id">
                <TabContent
                    v-if="tab.id === selected_tab_id"
                    :repo_details="tab"
                />
            </keep-alive>
        </div>
    </div>
</template>

<script>
    import StoreMixin from '@/mixins/StoreMixin';
    import WindowEventMixin from '@/mixins/WindowEventMixin';

    import TabContent from './components/TabContent';

    export default {
        components: { TabContent },
        mixins: [
            StoreMixin('tabs', [{ id: 1 }]),
            StoreMixin('selected_tab_id', 1),
            WindowEventMixin('keydown', 'onKeyDown'),
        ],
        computed: {
            selected_tab() {
                return _.find(this.tabs, { id: this.selected_tab_id });
            },
        },
        created() {
            let last_id = _.max(_.map(this.tabs, 'id')) ?? 0;
            this.getNextId = () => ++last_id;

            window.repo = {
                callGit: async (...args) => await electron.callGit(this.selected_tab.path, args),
                ...Object.fromEntries(['exists', 'readFile', 'writeFile', 'deleteFile'].map(func_name =>
                    [func_name, async (file_path, ...args) => await electron[func_name]([this.selected_tab.path, file_path], ...args)]
                )),
            };
        },
        methods: {
            closeTab(tab) {
                _.remove(this.tabs, { id: tab.id });

                if (this.selected_tab_id === tab.id) {
                    this.selected_tab_id = _.last(this.tabs)?.id;
                }
                if (this.selected_tab_id === undefined) {
                    this.addTab();
                }
            },
            addTab() {
                const id = this.getNextId();
                this.tabs.push({ id });
                this.selected_tab_id = id;
            },
            onKeyDown(event) {
                if (event.ctrlKey && event.key === 't') {
                    this.addTab();
                }
            },
        },
    };
</script>
