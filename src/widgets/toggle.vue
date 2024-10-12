
<template>
    <div class="rounded-lg" :class="{ active }">
        <btn :title @click="$emit('update:active', !active)">
            <slot />
        </btn>
    </div>
</template>

<script>
    export default {
        props: {
            active: { type: Boolean },
            title: { type: String, default: '' },
        },
        emits: ['update:active'],
    };
</script>
