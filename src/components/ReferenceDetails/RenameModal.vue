
<template>
    <modal v-slot="{ close }">
        <form @submit.prevent="submit().then(close)">
            <input v-model.trim="name" class="w-96" />
            <div class="flex items-center gap-3 justify-end mt-2">
                <label>
                    <input v-model="force" type="checkbox" />
                    Force
                </label>
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
            'repo', 'references', 'hidden_references',
            'setSelectedReference', 'refreshHistory',
        ],
        props: {
            reference: { type: Object, required: true },
        },
        data: () => ({
            name: undefined,
            force: false,
        }),
        created() {
            this.name = this.reference.name;
        },
        methods: {
            async submit() {
                await this.repo.callGit('branch', '--move', this.reference.name, this.name, ...this.force ? ['--force'] : []);
                await this.refreshHistory();

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
