
<template>
    <splitpanes
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
                    <div class="grow flex items-center gap-1.5">
                        <icon :name="$settings.icons[type]" class="size-5" />
                        {{ $_.pluralize($_.title(type)) }}
                        <div class="text-gray">
                            ({{ references_by_type[type]?.length ?? 0 }})
                        </div>
                    </div>
                </div>
                <recycle-scroller
                    v-if="references_by_type[type] !== undefined"
                    class="grow"
                    :items="references_by_type[type]"
                    :item-size="32"
                    key-field="name"
                    v-slot="{ item }"
                >
                    <ReferenceRow :key="item.name" :reference="item" />
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
        inject: ['references_by_type'],
        computed: {
            reference_types() {
                return _.without(settings.reference_type_order, 'head');
            },
        },
    };
</script>
