
import _ from 'lodash';
import * as monaco from 'monaco-editor';
import { Splitpanes, Pane } from 'splitpanes';
import { createApp } from 'vue/dist/vue.esm-bundler';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';
import Draggable from 'vuedraggable';
import { RecycleScroller } from 'vue-virtual-scroller';

import AppRoot from './AppRoot';
import './index.css';
import * as settings from '@/settings';
import monaco_theme from './theme/monaco';

import Btn from './widgets/btn';
import CommitMessage from './widgets/commit-message';
import FilePath from './widgets/file-path';
import Icon from './widgets/icon';
import Toggle from './widgets/toggle';

window._ = _;
window.settings = settings;

const app = createApp(AppRoot);

app.component('Splitpanes', Splitpanes);
app.component('Pane', Pane);

app.component('Draggable', Draggable);
app.component('RecycleScroller', RecycleScroller);

app.component('Btn', Btn);
app.component('CommitMessage', CommitMessage);
app.component('FilePath', FilePath);
app.component('Icon', Icon);
app.component('Toggle', Toggle);

for (const lang of ['css', 'scss', 'less']) {
    // https://github.com/atularen/ngx-monaco-editor/issues/61
    monaco.languages.css[`${lang}Defaults`].setOptions({ validate: false });
}
monaco.editor.defineTheme('custom', monaco_theme);

app.use(VueMonacoEditorPlugin, { monaco });

app.config.globalProperties.$_ = _;
app.config.globalProperties.$settings = settings;

app.mount('#app');
