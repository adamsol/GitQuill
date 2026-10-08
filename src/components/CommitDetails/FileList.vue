
<template>
    <recycle-scroller
        v-slot="{ item }"
        class="grow"
        :items="files"
        :item-size="item_size"
        key-field="path"
        tabindex="0"
        @click="$event.currentTarget.focus()"
        @keydown="onKeyDown"
    >
        <FileRow :key="item.path" :file="item" />
    </recycle-scroller>
</template>

<script>
    import FileRow from './FileRow';

    export default {
        components: { FileRow },
        inject: ['selected_file'],
        props: {
            files: { type: Array, required: true },
            item_size: { type: Number, required: true },
        },
        methods: {
            onKeyDown(event) {
                const direction = { ArrowUp: -1, ArrowDown: 1, '[': -1, ']': 1 }[event.key];

                if (direction !== undefined) {
                    event.preventDefault();

                    if (this.selected_file !== null) {
                        const index = _.findIndex(this.files, _.pick(this.selected_file, ['area', 'path']));
                        const next_index = (index + direction + this.files.length) % this.files.length;
                        this.selected_file = this.files[next_index];

                        const scroller = event.currentTarget;
                        const top = next_index * this.item_size;
                        if (top < scroller.scrollTop) {
                            scroller.scrollTop = top;
                        } else if (top + this.item_size > scroller.scrollTop + scroller.clientHeight) {
                            scroller.scrollTop = top + this.item_size - scroller.clientHeight;
                        }
                    }
                }
            },
        },
    };
</script>
