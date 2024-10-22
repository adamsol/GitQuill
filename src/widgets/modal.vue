
<template>
    <teleport v-if="tab_active" to="#tab_wrapper">
        <div
            ref="modal"
            class="absolute inset-0 z-40 flex flex-col bg-black/40 p-6"
            tabindex="-1"
            @click.self="close"
            @keydown.esc="close"
        >
            <div class="m-auto max-h-full max-w-full p-8 overflow-auto rounded-lg bg-gray-bg shadow-[0_0_2rem_0_#0008]">
                <slot :close />
            </div>
        </div>
    </teleport>
</template>

<script>
    export default {
        inject: ['tab_active'],
        emits: ['close'],
        data: () => ({
            body_css: document.body.style.cssText,
        }),
        mounted() {
            this.$refs.modal.focus();
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
