
<template>
    <modal v-slot="{ close }">
        <form @submit.prevent="submit().then(close)">
            <input v-model.trim="name" class="w-96" />
            <div class="flex justify-end mt-2">
                <btn type="submit">
                    <icon name="mdi-pencil" class="size-5" />
                    Rename
                </btn>
            </div>
        </form>
    </modal>
</template>

<script>
    export default {
        inject: [
            'current_branch',
            'refreshHistory', 'refreshStatus',
        ],
        props: {
            reference: { type: Object, required: true },
        },
        data: () => ({
            name: undefined,
        }),
        created() {
            this.name = this.reference.name;
        },
        methods: {
            async submit() {
                await repo.callGit('branch', '--move', this.reference.name, this.name);

                await Promise.all([
                    this.refreshHistory(),
                    ...this.reference.name === this.current_branch ? [this.refreshStatus()] : [],
                ]);
            },
        },
    };
</script>
