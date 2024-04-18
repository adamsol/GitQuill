
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center gap-2 p-2">
            <div class="ellipsis">
                {{ selected_file.path }}
            </div>
            <div class="grow" />

            <select v-model="language" title="Language" @change="onSelectLanguage">
                <option v-for="lang in languages" :value="lang">
                    {{ lang }}
                </option>
            </select>
            <hr class="mx-2" />

            <toggle v-model:active="collapse_unchanged_regions" title="Collapse unchanged regions">
                <icon name="mdi-view-day" />
            </toggle>
            <toggle v-model:active="side_by_side_view" title="Side-by-side view">
                <icon name="mdi-format-columns" />
            </toggle>
            <toggle v-model:active="whitespace_diff" title="Show leading/trailing whitespace diff">
                <icon name="mdi-format-pilcrow" />
            </toggle>
            <toggle v-model:active="word_wrap" title="Word wrap">
                <icon name="mdi-wrap" />
            </toggle>
            <hr class="mx-2" />

            <btn title="Close" @click="selected_file = null">
                <icon name="mdi-close" />
            </btn>
        </div>

        <div class="grow">
            <vue-monaco-diff-editor
                :key="contents"
                :options="options"
                :original="contents[0]"
                :modified="contents[1]"
                :language="language"
                theme="custom"
            />
        </div>
    </div>
</template>

<script>
    import monaco_metadata from 'monaco-editor/esm/metadata';

    import EventMixin from '@/mixins/EventMixin';
    import StoreMixin from '@/mixins/StoreMixin';

    export default {
        mixins: [
            StoreMixin('collapse_unchanged_regions', true),
            StoreMixin('side_by_side_view', true),
            StoreMixin('whitespace_diff', false),
            StoreMixin('word_wrap', false),

            EventMixin('window-focus', 'load'),
        ],
        inject: ['selected_commit', 'selected_file'],
        data: () => ({
            contents: [],
            language: undefined,
            languages: ['plaintext', ..._.map(monaco_metadata.languages, 'label')],
        }),
        computed: {
            options() {
                return {
                    hideUnchangedRegions: {
                        enabled: this.collapse_unchanged_regions,
                    },
                    renderSideBySide: this.side_by_side_view,
                    useInlineViewWhenSpaceIsLimited: false,
                    enableSplitViewResizing: false,
                    ignoreTrimWhitespace: !this.whitespace_diff,
                    wordWrap: this.word_wrap ? 'on' : 'off',

                    readOnly: true,
                    links: false,
                    contextmenu : false,
                    hover: { enabled: false },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'none',
                    lineDecorationsWidth: 15,  // https://github.com/microsoft/monaco-editor/issues/200
                    'bracketPairColorization.enabled': false,  // https://github.com/microsoft/monaco-editor/issues/3829
                };
            },
            extension() {
                const parts = this.selected_file.path.split('.');
                return parts.length > 1 ? _.last(parts) : _.last(this.selected_file.path.split('/'));
            },
        },
        watch: {
            selected_file: {
                async handler() {
                    await this.load();
                },
                immediate: true,
            },
        },
        methods: {
            async load() {
                // TODO: handle renamed files
                const loadOriginal = async () => {
                    if (this.selected_file.status === 'A') {
                        return '';
                    } else {
                        let rev;
                        if (this.selected_commit === null) {
                            // https://stackoverflow.com/questions/60853992/how-to-git-show-a-staged-file
                            rev = { unstaged: ':0', staged: 'HEAD' }[this.selected_file.area];
                        } else {
                            rev = this.selected_commit.parents.split(' ')[0];
                        }
                        if (rev === '') {
                            // Initial commit.
                            return '';
                        } else {
                            return await electron.callGit('show', [`${rev}:${this.selected_file.path}`]);
                        }
                    }
                };
                const loadModified = async () => {
                    if (this.selected_file.status === 'D') {
                        return '';
                    } else {
                        let rev;
                        if (this.selected_commit === null) {
                            rev = { unstaged: '', staged: ':0' }[this.selected_file.area];
                        } else {
                            rev = this.selected_commit.hash;
                        }
                        if (rev === '') {
                            // Working tree.
                            return await electron.readFile(this.selected_file.path);
                        } else {
                            return await electron.callGit('show', [`${rev}:${this.selected_file.path}`]);
                        }
                    }
                };
                const contents = await Promise.all([loadOriginal(), loadModified()]);
                if (!_.isEqual(contents, this.contents)) {
                    this.contents = contents;
                    this.language = electron.store.get(`language.${this.extension}`, this.languages[0]);
                }
            },
            onSelectLanguage() {
                electron.store.set(`language.${this.extension}`, this.language);
            },
        },
    };
</script>
