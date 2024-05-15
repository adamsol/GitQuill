
import colors from './colors';

const [line_opacity, text_opacity] = [0.1, 0.2].map(x => Math.round(x * 255).toString(16).padStart(2, '0'));

export default {
	base: 'vs-dark',
	inherit: true,
	rules: [
		{
			token: 'comment',
			foreground: colors.gray.DEFAULT,
		},
	],
	colors: {
		'editor.background': colors.gray.dark,
		'editor.foreground': colors.gray.light,
		'diffEditor.insertedLineBackground': colors.green + line_opacity,
		'diffEditor.insertedTextBackground': colors.green + text_opacity,
		'diffEditor.removedLineBackground': colors.red + line_opacity,
		'diffEditor.removedTextBackground': colors.red + text_opacity,
		'diffEditor.unchangedRegionBackground': colors.gray.bg,
		'diffEditor.unchangedCodeBackground': '#0000',
	},
};
