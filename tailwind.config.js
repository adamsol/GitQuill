
import colors from './src/theme/colors';

export default {
    content: ['./src/**/*.{vue,css}'],
    theme: {
        extend: {
            colors,
            fontSize: {
                lg: ['1.125rem', '1.5rem'],
            },
        },
    },
};
