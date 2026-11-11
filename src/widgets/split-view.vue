
<template>
    <div
        class="flex w-full h-full *:w-full *:h-full *:shrink-0 *:overflow-hidden"
        :class="vertical && 'flex-col'"
    >
        <slot />
    </div>
</template>

<script>
    import _ from 'lodash';
    import Split from 'split.js';

    export default {
        props: {
            vertical: { type: Boolean },
            sizes: { type: Array, required: true },
        },
        emits: ['resize'],
        mounted() {
            const defined_sizes = this.sizes.filter(size => size !== undefined);
            const remaining_size_per_pane = (100 - _.sum(defined_sizes)) / (this.sizes.length - defined_sizes.length);

            this.split = Split([...this.$el.children], {
                direction: this.vertical ? 'vertical' : 'horizontal',
                sizes: this.sizes.map(size => size ?? remaining_size_per_pane),
                minSize: 30,
                gutterSize: 16,
                snapOffset: 0,
                onDragEnd: () => this.$emit('resize', this.split.getSizes()),
            });
        },
        unmounted() {
            this.split.destroy();
        },
    };
</script>
