
<template>
    <div class="rounded-lg" :class="{ active }">
        <btn @click="$emit('update:active', !active)">
            <slot />
        </btn>
    </div>
</template>

<script>
    export default {
        props: {
            active: { type: Boolean },
        },
        emits: ['update:active'],
    };
</script>
