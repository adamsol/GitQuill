
<template>
    <splitpanes
        :dbl-click-splitter="false"
        horizontal
        @resized="references_list_pane_sizes = Object.fromEntries($_.zip(reference_types, $_.map($event, 'size')))"
    >
        <pane
            v-for="(type, i) in reference_types"
            class="min-h-20"
            :size="references_list_pane_sizes[type]"
        >
            <div class="flex flex-col h-full">
                <hr v-if="i > 0" class="mb-2" />
                <div class="flex mb-2">
                    <panel-header
                        :count="references_by_type[type]?.length ?? 0"
                        :icon="$settings.icons[type]"
                        :label="$_.pluralize($_.title(type))"
                    />
                </div>
                <recycle-scroller
                    v-if="references_by_type[type] !== undefined"
                    class="grow"
                    :items="rows_by_type[type]"
                    :item-size="32"
                    key-field="id"
                    v-slot="{ item }"
                >
                    <ReferenceRow :key="item.id" :node="item" @toggle-group="toggleGroup(item)" />
                </recycle-scroller>
            </div>
        </pane>
    </splitpanes>
</template>

<script>
    import StoreMixin from '@/mixins/StoreMixin';

    import ReferenceRow from './ReferenceRow';

    export default {
        components: { ReferenceRow },
        mixins: [
            StoreMixin('references_list_pane_sizes', {}),
        ],
        inject: ['references_by_type', 'reference_tree', 'collapsed_references'],
        computed: {
            reference_types() {
                return _.without(settings.reference_type_order, 'head');
            },
            rows_by_type() {
                return _.mapValues(this.reference_tree.roots, root => {
                    const visit = (node) => {
                        for (const child of node.children) {
                            rows.push(child);
                            if (child.is_group && !this.collapsed_references.has(child.id)) {
                                visit(child);
                            }
                        }
                    };
                    const rows = [];
                    visit(root);
                    return rows;
                });
            },
        },
        methods: {
            toggleGroup(group) {
                if (this.collapsed_references.has(group.id)) {
                    this.collapsed_references.delete(group.id);
                } else {
                    this.collapsed_references.add(group.id);
                }
            },
        },
    };
</script>
