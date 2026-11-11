
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TypescriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

export const MonacoEnvironment = {
    // https://github.com/microsoft/monaco-editor/blob/v0.49.0/docs/integrate-esm.md#using-vite
    getWorker(worker_id, label) {
        if (label === 'json') {
            return new JsonWorker();
        }
        if (['css', 'scss', 'less'].includes(label)) {
            return new CssWorker();
        }
        if (['html', 'handlebars', 'razor'].includes(label)) {
            return new HtmlWorker();
        }
        if (['javascript', 'typescript'].includes(label)) {
            return new TypescriptWorker();
        }
        return new EditorWorker();
    },
};
