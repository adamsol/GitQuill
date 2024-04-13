
import path from 'path';

import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import webpack from 'webpack';

export default {
    entry: {
        app: path.resolve('src/index.js'),
    },
    resolve: {
        alias: {
            '@': path.resolve('src/'),
        },
        extensions: ['.js', '.vue'],
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    'tailwindcss',
                                    'tailwindcss/nesting',
                                ],
                            },
                        },
                    },
                ],
            },
            {
                // https://github.com/webpack/webpack/issues/16660
                test: /\.js$/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
        ],
    },
    plugins: [
        new MonacoWebpackPlugin(),
        new VueLoaderPlugin(),

        new webpack.DefinePlugin({
            // https://github.com/vuejs/core/tree/main/packages/vue#bundler-build-feature-flags
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
        }),
    ],
    performance: {
        hints: false,
    },
};
