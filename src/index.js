
import * as monaco from 'monaco-editor';
import { createApp } from 'vue';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';
import Draggable from 'vuedraggable';
import { RecycleScroller } from 'vue-virtual-scroller';

import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import AppRoot from './AppRoot';
import { MonacoEnvironment } from './monaco/environment';
import { configureMonacoLanguages } from './monaco/language-config';
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
import SplitView from './widgets/split-view';
import Toggle from './widgets/toggle';

window._ = _;
window.settings = settings;
window.MonacoEnvironment = MonacoEnvironment;

const app = createApp(AppRoot);

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
app.component('SplitView', SplitView);
app.component('Toggle', Toggle);

configureMonacoLanguages();
monaco.editor.defineTheme('custom', monaco_theme);
// Keep one empty Monaco model to prevent destroying and recreating the diff worker when switching files.
// https://github.com/microsoft/vscode/blob/1.145.2/src/vs/editor/browser/services/editorWorkerService.ts#L380
monaco.editor.createModel('', 'plaintext');

app.use(VueMonacoEditorPlugin, { monaco });

app.config.globalProperties.$_ = _;
app.config.globalProperties.$settings = settings;

app.mount('#app');
