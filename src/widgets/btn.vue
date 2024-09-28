
<template>
    <button
        class="rounded-lg flex items-center gap-1 p-1 whitespace-nowrap"
        :class="[
            disabled ? '!text-gray' : 'clickable',
            second_click ? click_twice : '',
        ]"
        :disabled
        :title="title + (click_twice ? (title ? '\n' : '') + '(click twice)' : '')"
        :type
        @click.stop="onClick"
    >
        <slot />
    </button>
</template>

<script>
    export default {
        props: {
            click_twice: { type: [Boolean, String], default: false },
            disabled: { type: Boolean },
            title: { type: String, default: '' },
            type: { type: String, default: 'button' },
        },
        emits: ['click'],
        data: () => ({
            second_click: false,
        }),
        methods: {
            onClick() {
                if (!this.click_twice || this.second_click) {
                    this.second_click = false;
                    this.$emit('click');
                } else {
                    this.second_click = true;
                    setTimeout(() => this.second_click = false, settings.second_click_cooldown);
                }
            },
        },
    };
</script>
