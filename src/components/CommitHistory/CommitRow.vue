
<template>
    <div
        class="flex gap-3 px-3 py-1 cursor-pointer hover:bg-accent/10 *:whitespace-nowrap"
        :class="commit?.hash === selected_commit?.hash ? 'text-accent bg-accent/10' : '[&:not(:first-child)]:*:text-gray'"
        @click="selected_commit = Object.freeze(commit)"
    >
        <div v-if="commit === null" class="italic">
            Uncommitted changes
        </div>
        <template v-else>
            <div class="grow overflow-hidden text-ellipsis">
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
    };
</script>
