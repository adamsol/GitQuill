
<template>
    <div class="row !gap-1 whitespace-nowrap">
        <template v-for="reference in commit.references">
            <div
                v-if="reference.type !== 'head' || reference.name === current_branch"
                class="px-1.5 text-white rounded-md flex items-center gap-1.5 cursor-pointer"
                :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
                :title="$_.title(reference.type) + (reference.name === current_branch ? ' (current)' : '')"
                @click="selected_reference = Object.freeze(reference)"
            >
                <icon v-if="reference.name === current_branch" name="mdi-target" class="size-4" />
                {{ reference.name }}
                <icon v-if="reference.type !== 'head'" :name="$settings.icons[reference.type]" class="size-4" />
            </div>
        </template>
    </div>
</template>

<script>
    export default {
        inject: ['selected_reference', 'current_branch'],
        props: {
            commit: { type: Object, default: null },
        },
    };
</script>
