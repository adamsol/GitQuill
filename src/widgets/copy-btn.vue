
<template>
    <btn title="Copy to clipboard" @click="copy">
        <icon :name="copied ? 'mdi-check' : 'mdi-content-copy'" :class="icon_class" />
        <slot />
    </btn>
</template>

<script>
    export default {
        props: {
            callback: { type: Function, required: true },
            icon_class: { type: String, default: '' },
        },
        data: () => ({
            copied: false,
        }),
        methods: {
            async copy() {
                await navigator.clipboard.writeText(await this.callback());

                this.copied = true;
                setTimeout(() => this.copied = false, 800);
            },
        },
    };
</script>
