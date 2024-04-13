
<template>
    <div class="row clickable" :class="{ active }" @click="selected_file = file">
        <div class="w-3 shrink-0">
            {{ file.status }}
        </div>
        <div class="ellipsis">
            {{ file.path }}
        </div>
    </div>
</template>

<script>
    export default {
        inject: ['selected_file'],
        props: {
            file: { type: Object, required: true },
        },
        computed: {
            active() {
                return this.file.path === this.selected_file?.path && this.file.area === this.selected_file?.area;
            },
        },
    };
</script>
