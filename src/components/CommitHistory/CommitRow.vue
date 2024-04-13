
<template>
    <div
        class="row clickable whitespace-nowrap"
        :class="active ? 'active' : '[&:not(:first-child)]:*:text-gray'"
        @click="selected_commit = Object.freeze(commit)"
    >
        <div v-if="commit === null" class="italic">
            Uncommitted changes
        </div>
        <template v-else>
            <div class="grow ellipsis">
                {{ commit.subject }}
            </div>
            <div>
                {{ commit.author_name }}
            </div>
            <div>
                {{ commit.committer_date }}
            </div>
            <div class="font-mono">
                {{ commit.hash_abbr }}
            </div>
        </template>
    </div>
</template>

<script>
    export default {
        inject: ['selected_commit'],
        props: {
            commit: { type: Object, default: null },
        },
        computed: {
            active() {
                return this.commit?.hash === this.selected_commit?.hash;
            },
        },
    };
</script>
