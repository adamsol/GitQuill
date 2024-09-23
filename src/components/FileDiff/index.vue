
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center gap-2 p-2">
            <div v-if="file !== undefined" class="ellipsis">
                <template v-if="['R', 'C'].includes(file.status)">
                    <file-path :path="file.old_path" />
                    ->
                </template>
                <file-path :path="file.path" />
            </div>
            <div v-if="unsaved_changes" title="Unsaved changes">
                *
            </div>
            <div class="grow" />

            <select v-model="language" title="Language" @change="onSelectLanguage">
                <option v-for="lang in languages" :value="lang">
                    {{ lang }}
                </option>
            </select>
            <hr class="mx-2" />

            <input
                v-if="collapse_unchanged_regions"
                v-model="context_line_count"
                class="w-12"
                min="0"
                title="Number of context lines"
                type="number"
            />
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

            <btn title="Close" @click="close">
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

    import ElectronEventMixin from '@/mixins/ElectronEventMixin';
    import StoreMixin from '@/mixins/StoreMixin';
    import WindowEventMixin from '@/mixins/WindowEventMixin';
    import Icon from '@/widgets/icon';

    // https://github.com/microsoft/vscode/blob/1.88.1/src/vs/editor/browser/widget/diffEditor/features/revertButtonsFeature.ts
    // https://github.com/microsoft/vscode/blob/1.88.1/src/vs/editor/browser/widget/diffEditor/diffEditorWidget.ts#L532
    class GlyphMarginWidget {
        static counter = 0;

        constructor({ diff_editor, lane, line_range_mapping, action, callback }) {
            this.dom_node = document.createElement('button');
            this.dom_node.title = _.title(action) + (action === 'discard' ? '\n(click twice)' : '');
            this.first_click = false;
            this.dom_node.addEventListener('click', () => {
                if (action === 'discard' && !this.first_click) {
                    this.first_click = true;
                    this.dom_node.classList.add('text-red');
                    setTimeout(() => {
                        this.first_click = false;
                        this.dom_node.classList.remove('text-red');
                    }, settings.discard_second_click_cooldown);
                    return;
                }
                const [source, target] = action === 'stage' ? ['modified', 'original'] : ['original', 'modified'];
                const editor = diff_editor._editors[target];
                editor.pushUndoStop();
                editor.executeEdits(undefined, [{
                    range: line_range_mapping[target].toExclusiveRange(),
                    text: diff_editor._editors[source].getModel().getValueInRange(line_range_mapping[source].toExclusiveRange()),
                }]);
                callback();
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
            StoreMixin('context_line_count', 3),
            StoreMixin('collapse_unchanged_regions', true),
            StoreMixin('side_by_side_view', true),
            StoreMixin('whitespace_diff', false),
            StoreMixin('word_wrap', false),

            ElectronEventMixin('window-blur', 'save'),

            WindowEventMixin('keydown', 'onKeyDown'),
            WindowEventMixin('beforeunload', 'onBeforeUnload'),
        ],
        inject: [
            'repo', 'commits_to_diff', 'working_tree_files', 'selected_file', 'save_semaphore',
            'updateFileStatus', 'updateSelectedFile',
        ],
        data: () => ({
            file: undefined,
            loaded_contents: undefined,
            unsaved_changes: false,
            language: undefined,
            languages: ['plaintext', ..._.map(monaco_metadata.languages, 'label')],
        }),
        computed: {
            options() {
                return {
                    hideUnchangedRegions: {
                        contextLineCount: this.context_line_count,
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
            async selected_file() {
                await this.save();
                await this.load();
            },
        },
        async created() {
            await this.load();
        },
        async deactivated() {
            await this.save();
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
                    const contents = this.getEditorContents();
                    this.unsaved_changes = !_.isEqual(contents, this.saved_contents);

                    const diff = diff_editor._diffModel.get().diff.get();
                    const changes = _.map(diff.mappings, 'lineRangeMapping');

                    if (changes.length === 0 && contents[0] !== contents[1]) {
                        this.whitespace_diff = true;
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
                            callback: async () => await this.save(),
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

                const commits_to_diff = this.commits_to_diff;
                const file = this.selected_file;

                const loadOriginal = async () => {
                    if (file.status === 'A') {
                        return '';
                    } else {
                        // https://stackoverflow.com/questions/60853992/how-to-git-show-a-staged-file
                        const rev = file.area === 'unstaged' ? ':0' : commits_to_diff[1].hash;

                        if (rev === 'EMPTY_ROOT') {
                            return '';
                        } else {
                            const file_path = ['R', 'C'].includes(file.status) ? file.old_path : file.path;
                            return await this.repo.callGit('show', `${rev}:${file_path}`);
                        }
                    }
                };
                const loadModified = async () => {
                    if (file.status === 'D') {
                        return '';
                    } else {
                        const rev = file.area === 'staged' ? ':0' : commits_to_diff[0].hash;

                        if (rev === 'WORKING_TREE') {
                            return await this.repo.readFile(file.path);
                        } else {
                            return await this.repo.callGit('show', `${rev}:${file.path}`);
                        }
                    }
                };
                let contents = await Promise.all([loadOriginal(), loadModified()]);
                if (file !== this.selected_file) {
                    return;
                }
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
                if (this.diff_editor === undefined) {
                    return false;
                }
                await this.save_semaphore;

                const contents = this.getEditorContents();
                if (_.isEqual(contents, this.saved_contents)) {
                    return false;
                }
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
                        unstaged_content = await this.repo.readFile(this.file.path);
                        staged_content = contents[1];
                    }
                    if (staged_content !== undefined) {
                        await this.repo.writeFile(this.file.path, staged_content);
                        await this.repo.callGit('add', '--', this.file.path);
                    }
                    await this.repo.writeFile(this.file.path, unstaged_content);

                    this.saved_contents = contents;
                    this.unsaved_changes = false;

                    await this.updateFileStatus(this.file);

                    if (!_.some(this.working_tree_files[this.file.area], { path: this.file.path })) {
                        this.updateSelectedFile();
                    }
                } finally {
                    lift();
                }
                return true;
            },
            async close() {
                await this.save();
                this.selected_file = null;
            },
            async onKeyDown(event) {
                if (event.ctrlKey && event.key === 's') {
                    await this.save();
                }
                if (event.code === 'Escape') {
                    await this.close();
                }
            },
            async onBeforeUnload() {
                await this.save();
            },
            onSelectLanguage() {
                electron.store.set(`language.${this.extension}`, this.language);
            },
        },
    };
</script>
