
<template>
    <div
        class="row clickable"
        :class="{ active }"
        @click="selected_reference = Object.freeze(reference)"
        @dblclick="selected_commit = Object.freeze(commit_by_hash[reference.hash])"
    >
        <div class="ellipsis" :title="reference.name + '\n(double click to view commit)'">
            {{ reference.name }}
        </div>
    </div>
</template>

<script>
    export default {
        inject: ['selected_reference', 'commit_by_hash', 'selected_commit'],
        props: {
            reference: { type: Object, required: true },
        },
        computed: {
            active() {
                return _.every(['type', 'name'].map(attr => this.reference[attr] === this.selected_reference?.[attr]));
            },
        },
    };
</script>
