
import colors from './colors';

const [line_opacity, text_opacity] = [0.1, 0.2].map(x => Math.round(x * 255).toString(16).padStart(2, '0'));

export default {
	base: 'vs-dark',
	rules: [],
	colors: {
		'editor.foreground': colors.gray.light,
		'diffEditor.insertedLineBackground': colors.green + line_opacity,
		'diffEditor.insertedTextBackground': colors.green + text_opacity,
		'diffEditor.removedLineBackground': colors.red + line_opacity,
		'diffEditor.removedTextBackground': colors.red + text_opacity,
	},
};
