
<template>
    <div class="text-sm text-gray font-mono whitespace-nowrap flex items-center gap-1">
        <div>{{ hash }}</div>
        <copy-btn :callback="() => hash" icon_class="size-4" />
    </div>
</template>

<script>
    export default {
        props: {
            hash: { type: String, required: true },
        },
    };
</script>
