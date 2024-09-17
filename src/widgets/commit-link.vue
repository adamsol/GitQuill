
<template>
    <button
        class="font-mono"
        title="View commit"
        @click="setSelectedCommits([commit_by_hash[hash]]); selected_file = null"
    >
        {{ hash_abbr }}
    </button>
</template>

<script>
    export default {
        inject: [
            'commit_by_hash', 'selected_file',
            'setSelectedCommits',
        ],
        props: {
            hash: { type: String, required: true },
        },
        computed: {
            hash_abbr() {
                return this.hash.slice(0, settings.hash_abbr_length);
            },
        },
    };
</script>
