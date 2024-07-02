
<template>
    <div class="row !gap-1 whitespace-nowrap">
        <div
            v-for="ref in commit.refs"
            class="px-1.5 text-white rounded-md flex items-center"
            :style="{ 'background-color': $settings.colors[commit.level % $settings.colors.length] }"
            :title="$_.upperFirst(ref.type.replace('_', ' '))"
        >
            <div v-if="ref.type === 'head'">
                &ZeroWidthSpace;
            </div>
            <div v-else class="mr-1.5">
                {{ ref.name }}
            </div>
            <icon
                :name="$settings.icons[ref.type]"
                class="size-4 shrink-0"
            />
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            commit: { type: Object, default: null },
        },
    };
</script>
