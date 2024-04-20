
import _ from 'lodash';
import * as monaco from 'monaco-editor';
import { Splitpanes, Pane } from 'splitpanes';
import { createApp } from 'vue/dist/vue.esm-bundler';
import { install as VueMonacoEditorPlugin } from '@guolao/vue-monaco-editor';
import { RecycleScroller } from 'vue-virtual-scroller';

import App from './App';
import './index.css';
import monaco_theme from './theme/monaco';
import Btn from './widgets/btn';
import Icon from './widgets/icon';
import Toggle from './widgets/toggle';

window._ = _;

const app = createApp(App);

app.component('Splitpanes', Splitpanes);
app.component('Pane', Pane);

app.component('RecycleScroller', RecycleScroller);

app.component('Btn', Btn);
app.component('Icon', Icon);
app.component('Toggle', Toggle);

monaco.editor.defineTheme('custom', monaco_theme);
app.use(VueMonacoEditorPlugin, { monaco });

app.mount('#app');
