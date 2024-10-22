
<template>
    <modal v-slot="{ close }">
        <ReferenceNameForm
            label="Create and checkout branch"
            @submit="submit($event).then(close)"
        />
    </modal>
</template>

<script>
    import ReferenceNameForm from '@/forms/ReferenceNameForm';

    export default {
        components: { ReferenceNameForm },
        inject: [
            'repo', 'current_head',
            'refreshHistory',
        ],
        methods: {
            async submit(data) {
                await this.repo.callGit('checkout', this.current_head, data.force ? '-B' : '-b', data.name);
                await this.refreshHistory();
            },
        },
    };
</script>
