
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
            'repo', 'references', 'current_head',
            'refreshHistory',
        ],
        methods: {
            async submit(data) {
                const existing_branch = _.find(this.references, { type: 'local_branch', name: data.name });
                const msg = existing_branch && `Overwritten local branch: ${data.name} (was ${existing_branch.hash})`;
                await this.repo.callGit('checkout', this.current_head, data.force ? '-B' : '-b', data.name, { msg });
                await this.refreshHistory();
            },
        },
    };
</script>
