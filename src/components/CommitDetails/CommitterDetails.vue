
<template>
    <div>
        <span :title="commit[`${prefix}_email`]">
            {{ commit[`${prefix}_name`] }}
        </span>
        <span class="text-sm text-gray ml-0.5">
            ({{ commit[`${prefix}_date`] }})
        </span>
    </div>
</template>

<script>
    export default {
        props: {
            commit: { type: Object, required: true },
            prefix: { type: String, required: true },
        },
    };
</script>
