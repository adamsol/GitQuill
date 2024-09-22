
<template>
    <modal v-slot="{ close }">
        <form @submit.prevent="submit().then(close)">
            <input v-model.trim="name" class="w-96" placeholder="Name" />
            <div class="flex items-center gap-3 justify-end mt-2">
                <label>
                    <input v-model="checkout" type="checkbox" />
                    Checkout
                </label>
                <btn type="submit">
                    <icon name="mdi-source-branch" class="size-5" />
                    Create branch
                </btn>
            </div>
        </form>
    </modal>
</template>

<script>
    export default {
        inject: [
            'repo',
            'refreshHistory', 'refreshStatus',
        ],
        props: {
            commit: { type: Object, required: true },
        },
        data: () => ({
            name: '',
            checkout: true,
        }),
        methods: {
            async submit() {
                if (this.checkout) {
                    await this.repo.callGit('checkout', this.commit.hash, '-b', this.name);
                } else {
                    await this.repo.callGit('branch', this.name, this.commit.hash);
                }
                await Promise.all([
                    this.refreshHistory(),
                    ...this.checkout ? [this.refreshStatus()] : [],
                ]);
            },
        },
    };
</script>
