
<template>
    <button class="clickable rounded-lg p-1" :type>
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
