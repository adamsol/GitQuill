
<template>
    <div class="grow flex items-center gap-1.5">
        <icon :name="icon" class="size-5 shrink-0" />
        <div>
            {{ label }}
            <span class="ml-0.5 text-gray">
                ({{ count }})
            </span>
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            count: { type: Number, required: true },
            icon: { type: String, required: true },
            label: { type: String, required: true },
        },
    };
</script>
