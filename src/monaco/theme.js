
import '@/index.css';

const styles = getComputedStyle(document.documentElement);
const getColor = (name) => styles.getPropertyValue(`--color-${name}`);

const [line_opacity, text_opacity] = [0.1, 0.2].map(x => Math.round(x * 255).toString(16).padStart(2, '0'));

export default {
    base: 'vs-dark',
    inherit: true,
    rules: [
        {
            token: 'comment',
            foreground: getColor('gray'),
        },
    ],
    colors: {
        'editor.background': getColor('gray-dark'),
        'editor.foreground': getColor('gray-light'),
        'diffEditor.insertedLineBackground': getColor('green') + line_opacity,
        'diffEditor.insertedTextBackground': getColor('green') + text_opacity,
        'diffEditor.removedLineBackground': getColor('red') + line_opacity,
        'diffEditor.removedTextBackground': getColor('red') + text_opacity,
        'diffEditor.unchangedRegionBackground': getColor('gray-bg'),
        'diffEditor.unchangedCodeBackground': '#0000',
        'sash.hoverBorder': '#0000',
    },
};
