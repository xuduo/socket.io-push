module.exports = {
  entry: './index.js',
  output: {
    library: 'PushClient',
    libraryTarget: 'umd',
    path:'./',
    filename: 'push-client-1.0.js'
  },
  externals: {
    global: glob()
  }
};

/**
 * Populates `global`.
 *
 * @api private
 */

function glob () {
  return 'typeof self !== "undefined" ? self : ' +
    'typeof window !== "undefined" ? window : ' +
    'typeof global !== "undefined" ? global : {}';
}
