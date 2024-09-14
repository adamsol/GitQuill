
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
            'references', 'hidden_references',
            'setSelectedReference', 'isCurrentBranch', 'refreshHistory', 'refreshStatus',
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
                    ...this.isCurrentBranch(this.reference) ? [this.refreshStatus()] : [],
                ]);
                const new_reference = _.find(this.references, { type: this.reference.type, name: this.name });
                this.setSelectedReference(new_reference);

                if (this.hidden_references.has(this.reference.id)) {
                    this.hidden_references.delete(this.reference.id);
                    this.hidden_references.add(new_reference.id);
                }
            },
        },
    };
</script>
