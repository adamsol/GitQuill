
<template>
    <div class="flex gap-2 text-xs">
        <span v-if="changes.added === undefined" class="text-gray">
            binary
        </span>
        <template v-else>
            <span class="text-red">
                −{{ changes.removed }}
            </span>
            <span class="text-green">
                +{{ changes.added }}
            </span>
        </template>
    </div>
</template>

<script>
    export default {
        props: {
            changes: { type: Object, required: true },
        },
    };
</script>
