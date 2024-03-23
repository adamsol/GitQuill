
import { Splitpanes, Pane } from 'splitpanes';
import { createApp } from 'vue/dist/vue.esm-bundler';

import App from './App';
import './index.css';

const app = createApp(App);

app.component('Splitpanes', Splitpanes);
app.component('Pane', Pane);

app.mount('#app');
