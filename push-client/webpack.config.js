const ENV = process.env.NODE_ENV;
const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        library: 'PushClient',
        libraryTarget: 'umd',
        path: './',
        filename: 'push-client-1.0.js'
    },
    externals: {
        global: glob()
    },
    devtool: '#source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                include: path.resolve(__dirname, './'),
                loaders: ['babel'],
            }],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(ENV),
        }),
    ]
};

/**
 * Populates `global`.
 *
 * @api private
 */

function glob() {
    return 'typeof self !== "undefined" ? self : ' +
        'typeof window !== "undefined" ? window : ' +
        'typeof global !== "undefined" ? global : {}';
}
