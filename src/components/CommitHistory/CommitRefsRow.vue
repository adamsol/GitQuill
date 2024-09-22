
<template>
    <div class="row !gap-1 whitespace-nowrap select-none">
        <template v-for="reference in commit.references">
            <div
                v-if="!hidden_references.has(reference.id) && (reference.type !== 'head' || current_branch_name === null)"
                class="px-1.5 text-white rounded-md flex items-center gap-1.5 cursor-pointer"
                :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
                :title="$_.title(reference.type) + (isCurrentBranch(reference) ? ' (current)' : '\n(double-click to checkout)')"
                @click="setSelectedReference(reference)"
                @dblclick="isCurrentBranch(reference) ? {} : checkoutBranch(reference)"
            >
                <icon v-if="reference.type === 'head' || isCurrentBranch(reference)" name="mdi-target" class="size-4" />
                {{ reference.name }}
                <icon v-if="reference.type !== 'head'" :name="$settings.icons[reference.type]" class="size-4" />
            </div>
        </template>
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
        methods: {
            async checkoutBranch(reference) {
                await this.repo.callGit('checkout', reference.name);

                await Promise.all([
                    this.refreshHistory(),
                    this.refreshStatus(),
                ]);
            },
        },
    };
</script>
