
<template>
    <div
        class="row clickable group"
        :class="{ active }"
        :title="file.path"
        @click="selected_file = file"
    >
        <div class="w-3 shrink-0">
            {{ file.status }}
        </div>
        <div class="grow ellipsis">
            <filepath :file />
        </div>

        <div class="flex w-0 overflow-hidden group-hover:w-auto group-hover:overflow-visible">
            <btn
                v-for="action in file.area === 'unstaged' ? ['discard', 'stage'] : file.area === 'staged' ? ['unstage'] : []"
                :title="$_.upperFirst(action)"
                @click.stop="run(action)"
            >
                <icon :name="$settings.icons[action]" class="size-5" />
            </btn>
        </div>
    </div>
</template>

<script>
    export default {
        inject: [
            'selected_file',
            'updateFileStatus', 'updateSelectedFile', 'saveSelectedFile',
        ],
        props: {
            file: { type: Object, required: true },
        },
        computed: {
            active() {
                return _.isEqual(this.file, this.selected_file);
            },
        },
        methods: {
            async run(action) {
                await this.saveSelectedFile();

                if (action === 'stage') {
                    await electron.callGit('add', '--', this.file.path);

                } else if (action === 'unstage') {
                    await electron.callGit('reset', '--', this.file.path);

                } else if (action === 'discard') {
                    if (this.file.status === 'A') {
                        await electron.callGit('clean', '-f', '--', this.file.path);
                    } else {
                        await electron.callGit('checkout', '--', this.file.path);
                    }
                }
                await this.updateFileStatus(this.file.path);
                if (this.file.path === this.selected_file?.path) {
                    this.updateSelectedFile();
                }
            },
        },
    };
</script>
