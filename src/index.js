
import * as monaco from 'monaco-editor';
import { language as python_language } from 'monaco-editor/esm/vs/basic-languages/python/python';
import { Splitpanes, Pane } from 'splitpanes';
import { createApp } from 'vue';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';
import Draggable from 'vuedraggable';
import { RecycleScroller } from 'vue-virtual-scroller';

import 'splitpanes/dist/splitpanes.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import AppRoot from './AppRoot';
import { MonacoEnvironment } from './monaco/environment';
import monaco_theme from './monaco/theme';
import * as settings from './settings';
import _ from './utils';

import './index.css';

import Btn from './widgets/btn';
import CommitHash from './widgets/commit-hash';
import CommitLink from './widgets/commit-link';
import CommitMessage from './widgets/commit-message';
import CopyBtn from './widgets/copy-btn';
import FilePath from './widgets/file-path';
import Icon from './widgets/icon';
import Modal from './widgets/modal';
import PanelHeader from './widgets/panel-header';
import Toggle from './widgets/toggle';

window._ = _;
window.settings = settings;
window.MonacoEnvironment = MonacoEnvironment;

const app = createApp(AppRoot);

app.component('Splitpanes', Splitpanes);
app.component('Pane', Pane);

app.component('Draggable', Draggable);
app.component('RecycleScroller', RecycleScroller);

app.component('Btn', Btn);
app.component('CommitHash', CommitHash);
app.component('CommitLink', CommitLink);
app.component('CommitMessage', CommitMessage);
app.component('CopyBtn', CopyBtn);
app.component('FilePath', FilePath);
app.component('Icon', Icon);
app.component('Modal', Modal);
app.component('PanelHeader', PanelHeader);
app.component('Toggle', Toggle);

for (const lang of ['css', 'scss', 'less']) {
    // https://github.com/atularen/ngx-monaco-editor/issues/61
    monaco.languages.css[`${lang}Defaults`].setOptions({ validate: false });
}
const python_builtin_names_start = python_language.keywords.indexOf('int');
python_language.keywords = _.without(
    python_language.keywords.slice(0, python_builtin_names_start),
    '_', 'case', 'exec', 'match', 'print', 'type',
);
monaco.editor.defineTheme('custom', monaco_theme);

// Keep one empty Monaco model to prevent destroying and recreating the diff worker when switching files.
// https://github.com/microsoft/vscode/blob/1.145.2/src/vs/editor/browser/services/editorWorkerService.ts#L380
monaco.editor.createModel('', 'plaintext');

app.use(VueMonacoEditorPlugin, { monaco });

app.config.globalProperties.$_ = _;
app.config.globalProperties.$settings = settings;

app.mount('#app');
