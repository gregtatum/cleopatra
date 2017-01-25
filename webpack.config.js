const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const OfflinePlugin = require('offline-plugin');

const baseConfig = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
    }),
    new webpack.LoaderOptionsPlugin({
      options: {
        worker: {
          output: {
            filename: '[hash].worker.js',
            chunkFilename: '[id].[hash].worker.js',
          },
        },
      },
    }),
    new HtmlWebpackPlugin({
      title: 'perf.html',
      template: 'res/index.html',
      favicon: 'res/favicon.png',
    }),
  ],
  resolve: {
    alias: {
      'redux-devtools/lib': path.join(__dirname, '..', '..', 'src'),
      'redux-devtools': path.join(__dirname, '..', '..', 'src'),
      'react': path.join(__dirname, 'node_modules', 'react'),
    },
    extensions: ['.js'],
  },
  module: {
    rules: [{
      test: /\.js$/,
      loaders: ['babel-loader'],
      exclude: /node_modules/,
      include: __dirname,
    }, {
      test: /\.json$/,
      loaders: ['json-loader'],
      exclude: /node_modules/,
      include: __dirname,
    }, {
      test: /\.css?$/,
      loaders: ['style-loader', 'css-loader?minimize'],
      exclude: /node_modules/,
      include: __dirname,
    }, {
      test: /\.jpg$/,
      exclude: /node_modules/,
      loader: 'file-loader',
    }, {
      test: /\.png$/,
      exclude: /node_modules/,
      loader: 'file-loader',
    }, {
      test: /\.svg$/,
      exclude: /node_modules/,
      loader: 'file-loader',
    }],
  },
};

if (process.env.NODE_ENV === 'production') {
  baseConfig.plugins.push(
    new OfflinePlugin({
      relativePaths: false,
      AppCache: false,
      ServiceWorker: {
        scope: '/',
        events: true,
      },
      cacheMaps: [
        {
          requestTypes: null,
          match: function (url, request) {
            return url.origin === location.origin ? url.origin + '/' : null;
          },
        },
      ],
    }));
} else if (process.env.NODE_ENV === 'development') {
  baseConfig.devtool = 'source-map';
  baseConfig.entry = ['webpack-dev-server/client?http://localhost:4242'].concat(baseConfig.entry);
}

module.exports = [
  {
    entry: [
      './index',
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[hash].bundle.js',
      chunkFilename: '[id].[hash].bundle.js',
      publicPath: '/',
    },
  },
  {
    entry: [
      './src/worker/index',
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'worker.js',
      publicPath: '/',
    },
  },
].map(config => Object.assign({}, baseConfig, config));
