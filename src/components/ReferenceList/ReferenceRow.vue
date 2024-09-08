
<template>
    <div
        class="row clickable group"
        :class="{ active, 'text-gray line-through': hidden }"
        @click="selected_reference = Object.freeze(reference)"
        @dblclick="hidden ? {} : selected_commit = Object.freeze(commit_by_hash[reference.hash])"
    >
        <div class="grow ellipsis" :title="reference.name + '\n(double click to view commit)'">
            {{ reference.name }}
        </div>

        <div class="w-0 overflow-hidden group-hover:w-auto group-hover:overflow-visible">
            <btn
                :title="hidden ? 'Show': 'Hide'"
                @click.stop="toggleVisibility"
            >
                <icon :name="hidden ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" class="size-4" />
            </btn>
        </div>
    </div>
</template>

<script>
    export default {
        inject: [
            'selected_reference', 'hidden_references', 'commit_by_hash', 'selected_commit',
            'refreshHistory',
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
