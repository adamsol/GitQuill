
<template>
    <button
        class="rounded-lg flex items-center gap-1 p-1 whitespace-nowrap"
        :class="disabled ? '!text-gray' : 'clickable'"
        :disabled
        :type
    >
        <slot />
    </button>
</template>

<script>
    export default {
        props: {
            type: { type: String, default: 'button' },
            disabled: { type: Boolean },
        },
    };
</script>
