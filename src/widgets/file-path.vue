
<template>
    <div class="flex overflow-hidden">
        <!-- https://stackoverflow.com/questions/70886734/how-do-i-control-the-order-in-which-flexbox-items-grow-shrink -->
        <div v-if="parts.length > 2" class="opacity-65 shrink-[100000000] ellipsis min-w-5">
            {{ parts[0] }}
        </div>
        <div v-if="parts.length > 2" class="opacity-65 shrink-0">
            /
        </div>
        <div v-if="parts.length > 1" class="opacity-65 shrink-[10000] ellipsis [direction:rtl]">
            <!-- https://stackoverflow.com/questions/24800720/how-not-to-make-dir-rtl-send-special-characters-like-to-the-left-side -->
            <bdi>{{ parts.at(-2) }}/</bdi>
        </div>
        <div class="ellipsis">
            {{ parts.at(-1) }}
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            path: { type: String, required: true },
        },
        computed: {
            parts() {
                const parts = this.path.split('/');
                const result = [];

                if (parts.length > 2) {
                    result.push(parts.slice(0, -2).join('/'));
                }
                result.push(...parts.slice(-2));

                return result;
            },
        },
    };
</script>
