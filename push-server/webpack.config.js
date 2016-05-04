module.exports = {
  entry: './lib/client/push-client.js',
  output: {
    library: 'PushClient',
    libraryTarget: 'umd',
    path:'static/js/',
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
