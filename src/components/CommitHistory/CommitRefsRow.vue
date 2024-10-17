
<template>
    <div class="row !gap-1 whitespace-nowrap select-none">
        <div
            v-for="reference in references"
            class="px-1.5 text-white rounded-md flex items-center gap-1.5"
            :class="{ 'cursor-pointer': reference.type !== 'head' }"
            :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
            :title="getTitle(reference)"
            @click="reference.type === 'head' ? {} : setSelectedReference(reference)"
            @dblclick="checkoutBranch(reference)"
        >
            <icon v-if="isCurrentBranch(reference)" name="mdi-target" class="size-4" />
            {{ reference.name }}
            <icon v-if="reference.type !== 'head'" :name="$settings.icons[reference.type]" class="size-4" />
        </div>
    </div>
</template>

<script>
    export default {
        inject: [
            'repo', 'hidden_references', 'current_branch_name',
            'setSelectedReference', 'isCurrentBranch', 'refreshHistory', 'refreshStatus',
        ],
        props: {
            commit: { type: Object, default: null },
        },
        computed: {
            references() {
                const references = this.commit.references.filter(ref =>
                    !this.hidden_references.has(ref.id) && (ref.type !== 'head' || this.current_branch_name === null)
                );
                return _.sortBy(references, ref =>
                    this.isCurrentBranch(ref) ? -1 : settings.reference_type_order.indexOf(ref.type)
                );
            },
        },
        methods: {
            getTitle(reference) {
                let title = _.title(reference.type);
                if (this.isCurrentBranch(reference)) {
                    title += ' (current)';
                } else if (reference.type === 'local_branch') {
                    title += '\n(double-click to checkout)';
                }
                return title;
            },
            async checkoutBranch(reference) {
                if (this.isCurrentBranch(reference) || reference.type !== 'local_branch') {
                    return;
                }
                await this.repo.callGit('checkout', reference.name);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
        },
    };
</script>
