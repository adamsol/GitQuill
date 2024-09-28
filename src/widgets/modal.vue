
<template>
    <teleport to="#tab_wrapper">
        <div
            ref="modal"
            class="absolute inset-0 z-40 flex flex-col bg-black/40 p-6"
            @click.self="close"
            @keydown.esc="close"
        >
            <div class="m-auto max-h-full max-w-full p-8 overflow-auto rounded-lg bg-gray-bg shadow-[0_0_1rem_0_black]">
                <slot :close />
            </div>
        </div>
    </teleport>
</template>

<script>
    export default {
        emits: ['close'],
        data: () => ({
            body_css: document.body.style.cssText,
        }),
        mounted() {
            this.$refs.modal.querySelector('input:not([type=checkbox]):not([disabled]), textarea:not([disabled])')?.focus();

            if (document.body.style.overflow !== 'hidden') {
                // https://stackoverflow.com/questions/8079187/how-to-calculate-the-width-of-the-scroll-bar/56283274
                const scrollbar_width = window.innerWidth - document.body.clientWidth;
                document.body.style.cssText += `overflow: hidden; padding-right: ${scrollbar_width}px`;
            }
        },
        unmounted() {
            document.body.style.cssText = this.body_css;
        },
        methods: {
            close() {
                this.$emit('close');
            },
        },
    };
</script>
