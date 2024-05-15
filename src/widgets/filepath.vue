
<template>
    <span class="opacity-65">
        {{ parts[0] }}
    </span>
    <span>
        {{ parts[1] }}
    </span>
</template>

<script>
    export default {
        props: {
            file: { type: Object, required: true },
        },
        computed: {
            parts() {
                const index = this.file.path.lastIndexOf('/') + 1;
                return [this.file.path.slice(0, index), this.file.path.slice(index)];
            },
        },
    };
</script>
