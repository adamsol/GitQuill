
import colors from 'tailwindcss/colors';

export default {
    content: ['./src/**/*.vue'],
    safelist: ['splitpanes__splitter'],
    theme: {
        extend: {
            colors: {
                gray: {
                    light: colors.zinc[200],
                    DEFAULT: colors.zinc[400],
                    dark: colors.zinc[800],
                },
                accent: colors.sky[300],
            },
            fontSize: {
                lg: ['1.125rem', '1.5rem'],
            },
        },
    },
};
