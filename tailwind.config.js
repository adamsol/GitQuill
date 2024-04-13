
import colors from './src/theme/colors';

export default {
    content: ['./src/**/*.vue'],
    safelist: ['splitpanes__splitter', 'monaco-editor'],
    theme: {
        extend: {
            colors,
            fontSize: {
                lg: ['1.125rem', '1.5rem'],
            },
        },
    },
};
