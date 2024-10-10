
<template>
    <modal v-slot="{ close }">
        <form @submit.prevent="submit().then(close)">
            <input v-model.trim="name" class="w-96" placeholder="Name" />
            <div class="flex items-center gap-3 justify-end mt-2">
                <label>
                    <input v-model="force" type="checkbox" />
                    Force
                </label>
                <btn type="submit">
                    <icon name="mdi-source-branch" class="size-5" />
                    Create and checkout branch
                </btn>
            </div>
        </form>
    </modal>
</template>

<script>
    export default {
        inject: [
            'repo', 'current_head',
            'refreshHistory',
        ],
        data: () => ({
            name: '',
            force: false,
        }),
        methods: {
            async submit() {
                await this.repo.callGit('checkout', this.current_head, this.force ? '-B' : '-b', this.name);
                await this.refreshHistory();
            },
        },
    };
</script>
