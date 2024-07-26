
<template>
    <div class="row !gap-1 whitespace-nowrap">
        <template v-for="ref in commit.refs">
            <div
                v-if="ref.type !== 'head' || ref.name === current_branch"
                class="px-1.5 text-white rounded-md flex items-center gap-1.5"
                :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
                :title="$_.upperFirst(ref.type.replace('_', ' ')) + (ref.name === current_branch ? ' (current)' : '')"
            >
                <icon v-if="ref.name === current_branch" name="mdi-target" class="size-4" />
                {{ ref.name }}
                <icon v-if="ref.type !== 'head'" :name="$settings.icons[ref.type]" class="size-4" />
            </div>
        </template>
    </div>
</template>

<script>
    export default {
        inject: ['current_branch'],
        props: {
            commit: { type: Object, default: null },
        },
    };
</script>
