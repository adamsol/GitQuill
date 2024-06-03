
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
            path: { type: String, required: true },
        },
        computed: {
            parts() {
                const index = this.path.lastIndexOf('/') + 1;
                return [this.path.slice(0, index), this.path.slice(index)];
            },
        },
    };
</script>
