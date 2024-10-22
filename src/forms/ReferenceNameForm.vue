
<template>
    <form @submit.prevent="$emit('submit', { name, force })">
        <input
            v-model.trim="name"
            class="w-96"
            placeholder="Name"
            :spellcheck="false"
        />
        <div class="flex items-center gap-3 justify-end mt-2">
            <label title="Overwrite if exists">
                <input v-model="force" type="checkbox" />
                Force
            </label>
            <btn type="submit">
                <icon name="mdi-check" class="size-5" />
                {{ label }}
            </btn>
        </div>
    </form>
</template>

<script>
    export default {
        props: {
            initial_name: { type: String, default: '' },
            label: { type: String, required: true },
        },
        emits: ['update:name', 'submit'],
        data: () => ({
            name: '',
            force: false,
        }),
        created() {
            this.name = this.initial_name;
        }
    };
</script>
