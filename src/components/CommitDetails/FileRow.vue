
<template>
    <div class="flex">
        <div class="basis-6 shrink-0">
            {{ file.status }}
        </div>
        <div class="whitespace-nowrap overflow-hidden text-ellipsis">
            {{ file.file }}
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            file: { type: Object, required: true },
        },
    };
</script>
