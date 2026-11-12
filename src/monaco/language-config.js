
import * as monaco from 'monaco-editor';
import { language as python_language } from 'monaco-editor/esm/vs/basic-languages/python/python';

export function configureMonacoLanguages() {
    // Disable all diagnostics, as they are often incorrect and unnecessary.
    for (const service of ['json', 'css', 'html', 'typescript']) {
        for (const [name, defaults] of Object.entries(monaco.languages[service])) {
            if (name.endsWith('Defaults')) {
                defaults.setModeConfiguration({ ...defaults.modeConfiguration, diagnostics: false });
            }
        }
    }
    // Don't highlight Python built-in names and soft keywords.
    const python_builtin_names_start = python_language.keywords.indexOf('int');
    python_language.keywords = _.without(
        python_language.keywords.slice(0, python_builtin_names_start),
        '_', 'case', 'exec', 'match', 'print', 'type',
    );
}
