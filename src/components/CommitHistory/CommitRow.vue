
<template>
    <div
        class="row clickable whitespace-nowrap"
        :class="active ? 'active' : '[&:not(:first-child)]:*:text-gray'"
        @click="selected_commit = Object.freeze(commit); selected_file = null"
    >
        <div v-if="commit.hash === 'WORKING_TREE'" class="italic">
            <template v-if="rebasing">
                [Rebasing]
            </template>
            <template v-if="uncommitted_changes_count === 0">
                Working tree clean
            </template>
            <template v-else>
                Uncommitted changes
                ({{ uncommitted_changes_count }})
            </template>
        </div>
        <template v-else>
            <div class="grow ellipsis" :title="commit.subject">
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
        inject: ['selected_commit', 'uncommitted_changes_count', 'rebasing', 'selected_file'],
        props: {
            commit: { type: Object, default: null },
        },
        computed: {
            active() {
                return this.commit.hash === this.selected_commit.hash;
            },
        },
    };
</script>
