
<template>
    <div class="text-sm text-gray font-mono whitespace-nowrap flex items-center gap-1">
        <div>{{ hash }}</div>
        <btn title="Copy to clipboard" @click="copy">
            <icon name="mdi-content-copy" class="size-4" />
        </btn>
    </div>
</template>

<script>
    export default {
        props: {
            hash: { type: String, required: true },
        },
        methods: {
            async copy() {
                await navigator.clipboard.writeText(this.hash);
            },
        },
    };
</script>
