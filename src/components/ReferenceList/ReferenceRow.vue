
<template>
    <div
        class="row clickable group"
        :class="{ active, 'text-gray line-through': hidden }"
        @click="setSelectedReference(reference)"
        @dblclick="hidden || commit === undefined ? {} : setSelectedCommits([reference.hash])"
    >
        <div class="grow ellipsis" :title>
            {{ reference.name }}
        </div>

        <div class="w-0 overflow-hidden group-hover:w-auto group-hover:overflow-visible">
            <btn
                :title="(hidden ? 'Show': 'Hide') + ' in the graph'"
                @click="toggleVisibility"
            >
                <icon :name="hidden ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" class="size-4" />
            </btn>
        </div>
    </div>
</template>

<script>
    export default {
        inject: [
            'selected_reference', 'hidden_references', 'commit_by_hash',
            'setSelectedReference', 'setSelectedCommits', 'refreshHistory',
        ],
        props: {
            reference: { type: Object, required: true },
        },
        computed: {
            active() {
                return this.reference.id === this.selected_reference?.id;
            },
            hidden() {
                return this.hidden_references.has(this.reference.id);
            },
            commit() {
                return this.commit_by_hash[this.reference.hash];
            },
            title() {
                let title = this.reference.name;
                if (this.hidden) {
                    title += '\n(hidden in the graph)';
                } else if (this.commit === undefined) {
                    title += '\n(not in the graph)';
                } else {
                    title += '\n(double-click to view commit)';
                }
                return title;
            },
        },
        methods: {
            async toggleVisibility() {
                const f = this.hidden ? 'delete' : 'add';
                this.hidden_references[f](this.reference.id);

                await this.refreshHistory({ skip_references: true });
            },
        },
    };
</script>
