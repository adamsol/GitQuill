
<template>
    <modal v-slot="{ close }">
        <div class="table border-spacing-x-4 border-spacing-y-2" @keydown.enter="close">
            <div class="table-row">
                <div class="table-cell">
                    Initial commit limit
                </div>
                <div class="table-cell">
                    <input
                        type="number"
                        :value="initial_limit"
                        @change="$emit('update:initial_limit', $event.target.value ? +$event.target.value : null)"
                    />
                </div>
            </div>
            <div class="table-row">
                <div class="table-cell">
                    Commit limit in search mode
                </div>
                <div class="table-cell">
                    <input
                        type="number"
                        :value="search_limit"
                        @change="$emit('update:search_limit', $event.target.value ? +$event.target.value : null)"
                    />
                </div>
            </div>
        </div>
    </modal>
</template>

<script>
    export default {
        props: {
            initial_limit: { type: Number, default: null },
            search_limit: { type: Number, default: null },
        },
        emits: ['update:initial_limit', 'update:search_limit'],
    };
</script>
