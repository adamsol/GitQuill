
<template>
    <div class="row !gap-1 whitespace-nowrap">
        <template v-for="reference in commit.references">
            <div
                v-if="reference.type !== 'head' || current_branch_name === null"
                class="px-1.5 text-white rounded-md flex items-center gap-1.5 cursor-pointer"
                :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
                :title="$_.title(reference.type) + (isCurrentBranch(reference) ? ' (current)' : '')"
                @click="selected_reference = Object.freeze(reference)"
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
            'selected_reference', 'current_branch_name',
            'isCurrentBranch',
        ],
        props: {
            commit: { type: Object, default: null },
        },
    };
</script>
