
<template>
    <svg class="fill-current" viewBox="0 0 24 24">
        <path :d />
    </svg>
</template>

<script>
    import * as icons from '@mdi/js';

    export default {
        props: {
            name: { type: String, required: true },
        },
        computed: {
            d() {
                return icons[_.camelCase(this.name)];
            },
        },
    };
</script>
