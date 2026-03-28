const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "util": require.resolve("util/"),
    "os": require.resolve("os-browserify/browser"),
    "path": require.resolve("path-browserify"),
    "process": require.resolve("process/browser.js"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "stream": require.resolve("stream-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "url": require.resolve("url/"),
    "fs": false,
    "child_process": false,
    "net": false,
    "tls": false,
    "dns": false
  });
  config.resolve.fallback = fallback;
  
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    })
  ]);
  
  config.ignoreWarnings = [/Failed to parse source map/];
  
  return config;
};
