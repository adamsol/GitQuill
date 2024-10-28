
<template>
    <modal v-slot="{ close }">
        <ReferenceNameForm
            label="Create tag"
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
                const existing_tag = _.find(this.references, { type: 'tag', name: data.name });
                const msg = existing_tag && `Overwritten tag: ${data.name} (was ${existing_tag.hash})`;
                await this.repo.callGit('tag', data.name, this.commit.hash, ...data.force ? ['--force'] : [], { msg });
                await this.refreshHistory();
            },
        },
    };
</script>
