
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
            'repo', 'references',
            'refreshHistory',
        ],
        props: {
            commit: { type: Object, required: true },
        },
        methods: {
            async submit(data) {
                const existing_branch = _.find(this.references, { type: 'local_branch', name: data.name });
                const msg = existing_branch && `Overwritten local branch: ${data.name} (was ${existing_branch.hash})`;
                await this.repo.callGit('branch', data.name, this.commit.hash, ...data.force ? ['--force'] : [], { msg });
                await this.refreshHistory();
            },
        },
    };
</script>
