
<template>
    <div v-if="commit_by_hash[hash] === undefined" class="text-gray">
        not in the graph
    </div>
    <button
        v-else
        class="font-mono"
        title="View commit"
        @click="setSelectedCommits([hash]); selected_file = null"
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
