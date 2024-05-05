
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center gap-2 p-2">
            <div v-if="file !== undefined" class="grow ellipsis">
                {{ file.path }}
                <span v-if="file.area !== 'committed'" class="text-gray">
                    ({{ file.area }})
                </span>
            </div>

            <select v-model="language" title="Language" @change="onSelectLanguage">
                <option v-for="lang in languages" :value="lang">
                    {{ lang }}
                </option>
            </select>
            <hr class="mx-2" />

            <toggle v-model:active="collapse_unchanged_regions" title="Collapse unchanged regions">
                <icon name="mdi-view-day" class="size-6" />
            </toggle>
            <toggle v-model:active="side_by_side_view" title="Side-by-side view">
                <icon name="mdi-format-columns" class="size-6" />
            </toggle>
            <toggle v-model:active="whitespace_diff" title="Show leading/trailing whitespace diff">
                <icon name="mdi-format-pilcrow" class="size-6" />
            </toggle>
            <toggle v-model:active="word_wrap" title="Word wrap">
                <icon name="mdi-wrap" class="size-6" />
            </toggle>
            <hr class="mx-2" />

            <btn title="Close" @click="selected_file = null">
                <icon name="mdi-close" class="size-6" />
            </btn>
        </div>

        <div class="grow">
            <!-- Note: without `key`, the `hideUnchangedRegions` option behaves strangely after reloading the file. -->
            <vue-monaco-diff-editor
                v-if="loaded_contents !== undefined"
                :key="loaded_contents"
                :options="options"
                :original="loaded_contents[0]"
                :modified="loaded_contents[1]"
                :language="language"
                theme="custom"
                @mount="onMountEditor"
            />
        </div>
    </div>
</template>

<script>
    import { editor as monaco_editor } from 'monaco-editor';
    import monaco_metadata from 'monaco-editor/esm/metadata';
    import { createApp } from 'vue';

    import EventMixin from '@/mixins/EventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import Icon from '@/widgets/icon';

    // https://github.com/microsoft/vscode/blob/1.88.1/src/vs/editor/browser/widget/diffEditor/features/revertButtonsFeature.ts
    // https://github.com/microsoft/vscode/blob/1.88.1/src/vs/editor/browser/widget/diffEditor/diffEditorWidget.ts#L532
    class GlyphMarginWidget {
        static counter = 0;

        constructor({ diff_editor, lane, line_range_mapping, action }) {
            this.dom_node = document.createElement('button');
            this.dom_node.title = _.upperFirst(action);
            this.dom_node.addEventListener('click', () => {
                const [source, target] = action === 'stage' ? ['modified', 'original'] : ['original', 'modified'];
                diff_editor._editors[target].executeEdits(undefined, [{
                    range: line_range_mapping[target].toExclusiveRange(),
                    text: diff_editor._editors[source].getModel().getValueInRange(line_range_mapping[source].toExclusiveRange()),
                }]);
            });
            this.position = { lane, range: line_range_mapping.modified.toExclusiveRange() };
            this.id = `GlyphMarginWidget${++this.constructor.counter}`;

            createApp(Icon, { name: settings.icons[action], class: 'size-4 pointer-events-none' }).mount(this.dom_node);
        }
        getDomNode() { return this.dom_node; }
        getPosition() { return this.position; }
        getId() { return this.id; }
    }

    export default {
        mixins: [
            StoreMixin('collapse_unchanged_regions', true),
            StoreMixin('side_by_side_view', true),
            StoreMixin('whitespace_diff', false),
            StoreMixin('word_wrap', false),

            EventMixin('window-focus', 'load'),
            EventMixin('window-blur', 'save'),
        ],
        inject: [
            'selected_commit', 'files', 'selected_file', 'save_semaphore',
            'updateFileStatus', 'updateSelectedFile',
        ],
        data: () => ({
            file: undefined,
            loaded_contents: undefined,
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

                    readOnly: this.file.area === 'committed',
                    originalEditable: this.file.area === 'unstaged',

                    links: false,
                    contextmenu : false,
                    hover: { enabled: false },
                    quickSuggestions: false,
                    noSemanticValidation: true,
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'none',
                    glyphMargin: true,  // https://github.com/microsoft/monaco-editor/issues/4068
                    renderMarginRevertIcon: false,
                    renderGutterMenu: false,
                    lineDecorationsWidth: 15,  // https://github.com/microsoft/monaco-editor/issues/200
                    'bracketPairColorization.enabled': false,  // https://github.com/microsoft/monaco-editor/issues/3829
                };
            },
            extension() {
                const parts = this.file.path.split('.');
                return parts.length > 1 ? _.last(parts) : _.last(this.file.path.split('/'));
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
            onMountEditor(diff_editor) {
                this.diff_editor = diff_editor;
                for (const name of ['original', 'modified']) {
                    this.diff_editor._editors[name].getModel().setEOL(monaco_editor.EndOfLineSequence.LF);
                }
                this.saved_contents = this.getEditorContents();

                const widgets = [];

                diff_editor.onDidUpdateDiff(async () => {
                    await this.save();

                    const diff = diff_editor._diffModel.get().diff.get();
                    const changes = _.map(diff.mappings, 'lineRangeMapping');

                    if (changes.length === 0) {
                        if (!this.files[this.file.area].some(file => file.path === this.file.path)) {
                            this.updateSelectedFile();
                        } else {
                            this.whitespace_diff = true;
                        }
                    }
                    for (const widget of widgets) {
                        diff_editor._editors.modified.removeGlyphMarginWidget(widget);
                    }
                    widgets.length = 0;

                    const actions = [
                        ...this.file.area === 'unstaged' ? ['discard'] : [],
                        ...this.file.area === 'committed' ? [] : [this.file.area === 'unstaged' ? 'stage' : 'unstage'],
                    ];
                    for (const line_range_mapping of changes) {
                        widgets.push(...actions.map((action, i) => new GlyphMarginWidget({
                            diff_editor,
                            lane: i + 1,
                            line_range_mapping,
                            action,
                        })));
                    }
                    for (const widget of widgets) {
                        diff_editor._editors.modified.addGlyphMarginWidget(widget);
                    }
                });
            },
            getEditorContents() {
                return [
                    this.diff_editor._editors.original.getValue(),
                    this.diff_editor._editors.modified.getValue(),
                ];
            },
            async load() {
                await this.save_semaphore;

                // TODO: handle renamed files
                const commit = this.selected_commit;
                const file = this.selected_file;

                const loadOriginal = async () => {
                    if (file.status === 'A') {
                        return '';
                    } else {
                        let rev;
                        if (commit.hash === 'WORKING_TREE') {
                            // https://stackoverflow.com/questions/60853992/how-to-git-show-a-staged-file
                            rev = { unstaged: ':0', staged: 'HEAD' }[file.area];
                        } else {
                            rev = commit.parents.split(' ')[0];
                        }
                        if (rev === '') {
                            // Initial commit.
                            return '';
                        } else {
                            return await electron.callGit('show', [`${rev}:${file.path}`]);
                        }
                    }
                };
                const loadModified = async () => {
                    if (file.status === 'D') {
                        return '';
                    } else {
                        let rev;
                        if (commit.hash === 'WORKING_TREE') {
                            rev = { unstaged: '', staged: ':0' }[file.area];
                        } else {
                            rev = commit.hash;
                        }
                        if (rev === '') {
                            // Working tree.
                            return await electron.readFile(file.path);
                        } else {
                            return await electron.callGit('show', [`${rev}:${file.path}`]);
                        }
                    }
                };
                let contents = await Promise.all([loadOriginal(), loadModified()]);
                // Use only \n as the newline character, for simplicity and consistency between the working tree and the index.
                // Monaco Editor doesn't handle mixed line endings anyway.
                // https://github.com/microsoft/vscode/issues/127
                contents = contents.map(content => content.replace(/\r\n/g, '\n'));
                if (_.isEqual([file, contents], [this.file, this.saved_contents])) {
                    return;
                }
                this.file = file;
                this.loaded_contents = contents;
                this.language = electron.store.get(`language.${this.extension}`, this.languages[0]);
                this.diff_editor = undefined;
            },
            async save() {
                const contents = this.getEditorContents();
                if (_.isEqual(contents, this.saved_contents)) {
                    return;
                }
                await this.save_semaphore;
                let lift;
                this.save_semaphore = new Promise(resolve => lift = resolve);

                try {
                    let unstaged_content, staged_content;

                    if (this.file.area === 'unstaged') {
                        unstaged_content = contents[1];
                        if (!_.isEqual(contents[0], this.saved_contents[0])) {
                            staged_content = contents[0];
                        }
                    } else if (this.file.area === 'staged') {
                        unstaged_content = await electron.readFile(this.file.path);
                        staged_content = contents[1];
                    }
                    if (staged_content !== undefined) {
                        await electron.writeFile(this.file.path, staged_content);
                        await electron.callGit('add', [this.file.path]);
                    }
                    await electron.writeFile(this.file.path, unstaged_content);

                    this.saved_contents = contents;

                    await this.updateFileStatus(this.file.path);

                } finally {
                    lift();
                }
            },
            onSelectLanguage() {
                electron.store.set(`language.${this.extension}`, this.language);
            },
        },
    };
</script>
