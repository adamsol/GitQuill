
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
                <div class="grow overflow-auto">
                    <ReferenceRow v-for="reference in references_by_type[type]" :reference />
                </div>
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
                return ['local_branch', 'remote_branch', 'tag'];
            },
        },
    };
</script>
