
<template>
    <button class="clickable rounded-lg flex items-center gap-1 p-1 whitespace-nowrap" :type>
        <slot />
    </button>
</template>

<script>
    export default {
        props: {
            type: { type: String, default: 'button' },
        },
    };
</script>
