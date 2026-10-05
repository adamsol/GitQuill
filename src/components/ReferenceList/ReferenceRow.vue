
<template>
    <div
        class="row clickable group !gap-1"
        :class="{ active, 'text-gray': hidden }"
        :style="{ paddingLeft: `${4 + node.depth * 20}px` }"
        @click="is_group ? $emit('toggle-group') : setSelectedReference(reference)"
        @dblclick="is_group || hidden || commit === undefined ? {} : setSelectedCommits([reference.hash])"
    >
        <icon
            v-if="is_group"
            :name="collapsed_references.has(node.id) ? 'mdi-chevron-right' : 'mdi-chevron-down'"
            class="size-4 shrink-0"
        />
        <span v-else class="size-4 shrink-0" />

        <div class="grow flex gap-1 min-w-0" :title>
            <span class="ellipsis" :class="{ 'line-through': hidden }">
                {{ label }}
            </span>
            <span v-if="is_group" class="text-gray shrink-0">
                ({{ node.descendant_count }})
            </span>
        </div>

        <div class="w-0 overflow-hidden group-hover:w-auto group-hover:overflow-visible">
            <btn :title="hidden ? 'Show' : 'Hide'" @click="toggleReferenceNodeVisibility(node)">
                <icon :name="hidden ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" class="size-4" />
            </btn>
        </div>
    </div>
</template>

<script>
    export default {
        inject: [
            'selected_reference', 'commit_by_hash', 'collapsed_references',
            'setSelectedReference', 'setSelectedCommits', 'isReferenceNodeHidden', 'toggleReferenceNodeVisibility',
        ],
        props: {
            node: { type: Object, required: true },
        },
        emits: ['toggle-group'],
        computed: {
            reference() {
                return this.node.reference;
            },
            is_group() {
                return this.node.is_group;
            },
            active() {
                return !this.is_group && this.reference.id === this.selected_reference?.id;
            },
            hidden() {
                return this.isReferenceNodeHidden(this.node);
            },
            commit() {
                return this.commit_by_hash[this.reference.hash];
            },
            id_parts() {
                return this.node.id.split('/');
            },
            label() {
                return this.id_parts.at(this.is_group ? -2 : -1);
            },
            title() {
                if (this.is_group) {
                    return this.id_parts.slice(2, -1).join('/');
                }
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
    };
</script>
