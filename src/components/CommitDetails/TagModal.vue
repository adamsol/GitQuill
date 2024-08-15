
<template>
    <modal v-slot="{ close }">
        <form @submit.prevent="submit().then(close)">
            <input v-model.trim="name" class="w-96" placeholder="Name" />
            <div class="flex justify-end mt-2">
                <btn type="submit">
                    <icon name="mdi-tag-outline" class="size-5" />
                    Create tag
                </btn>
            </div>
        </form>
    </modal>
</template>

<script>
    export default {
        inject: ['refreshHistory'],
        props: {
            commit: { type: Object, required: true },
        },
        data: () => ({
            name: '',
        }),
        methods: {
            async submit() {
                await repo.callGit('tag', this.name, this.commit.hash);
                await this.refreshHistory();
            },
        },
    };
</script>
