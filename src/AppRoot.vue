
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center">
            <draggable
                v-model="tabs"
                item-key="id"
                class="flex items-center overflow-x-auto"
                :disabled="renamed_tab !== null"
            >
                <template #item="{ element: tab }">
                    <div
                        class="clickable pl-4 pr-2 py-1.5 flex gap-3 whitespace-nowrap"
                        :class="{ active: tab.id === selected_tab_id }"
                        @click="selected_tab_id = tab.id"
                    >
                        <span class="relative" title="Double-click or press F2 to rename tab" @dblclick.stop="startRenamingTab(tab)">
                            <span :class="{ invisible: renamed_tab === tab }">
                                {{ getTabTitle(tab) }}
                            </span>
                            <input
                                v-if="renamed_tab === tab"
                                ref="tab_title_input"
                                v-model="renamed_tab_title"
                                class="absolute inset-y-0 left-0 -right-1 min-w-0 p-0"
                                :spellcheck="false"
                                @dblclick.stop
                                @keydown.stop
                                @keydown.enter.prevent="saveTabTitle(tab)"
                                @keydown.esc.prevent="renamed_tab = null"
                                @blur="saveTabTitle(tab)"
                            />
                        </span>
                        <btn title="Close" @click="closeTab(tab)">
                            <icon name="mdi-close" class="size-4" />
                        </btn>
                    </div>
                </template>
            </draggable>
            <btn title="Add tab" @click="addTab">
                <icon name="mdi-plus" class="size-6" />
            </btn>
        </div>
        <hr />

        <div id="tab_wrapper" class="grow pt-1 overflow-hidden relative">
            <template v-for="tab in tabs" :key="tab.id">
                <TabContent
                    v-if="tabs_initialized.has(tab.id)"
                    :active="tab.id === selected_tab_id"
                    :repo_details="tab"
                />
            </template>
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
        data: () => ({
            tabs_initialized: new Set(),
            renamed_tab: null,
            renamed_tab_title: '',
        }),
        watch: {
            selected_tab_id: {
                handler() {
                    this.tabs_initialized.add(this.selected_tab_id);
                },
                immediate: true,
            },
        },
        created() {
            let last_id = _.max(_.map(this.tabs, 'id')) ?? 0;
            this.getNextId = () => ++last_id;
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
            async startRenamingTab(tab) {
                this.renamed_tab = tab;
                this.renamed_tab_title = this.getTabTitle(tab);

                await this.$nextTick();
                this.$refs.tab_title_input.focus();
                this.$refs.tab_title_input.select();
            },
            getTabTitle(tab) {
                return tab.title || 'New tab';
            },
            saveTabTitle(tab) {
                if (this.renamed_tab === tab) {
                    this.renamed_tab = null;
                    tab.title = this.renamed_tab_title.trim();
                }
            },
            onKeyDown(event) {
                if (event.ctrlKey && event.key === 't') {
                    this.addTab();
                }
                if (event.key === 'F2') {
                    this.startRenamingTab(_.find(this.tabs, { id: this.selected_tab_id }));
                }
            },
        },
    };
</script>
