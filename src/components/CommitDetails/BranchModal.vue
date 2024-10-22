
<template>
    <modal v-slot="{ close }">
        <ReferenceNameForm
            label="Create branch"
            @submit="submit($event).then(close)"
        />
    </modal>
</template>

<script>
    import ReferenceNameForm from '@/forms/ReferenceNameForm';

    export default {
        components: { ReferenceNameForm },
        inject: [
            'repo',
            'refreshHistory',
        ],
        props: {
            commit: { type: Object, required: true },
        },
        methods: {
            async submit(data) {
                await this.repo.callGit('branch', data.name, this.commit.hash, ...data.force ? ['--force'] : []);
                await this.refreshHistory();
            },
        },
    };
</script>
