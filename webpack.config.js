const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ManifestPlugin = require('webpack-manifest-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const GenerateJsonPlugin = require('generate-json-webpack-plugin')
const path = require('path')
const generatedLangList = require('./lib/langParser')

const isProduction = process.env.NODE_ENV === 'production'
const hash = isProduction ? '.[hash]' : ''

const globals = [
  {
    test: require.resolve('jquery'),
    use: [
      {
        loader: 'expose-loader',
        options: 'jQuery',
      },
      {
        loader: 'expose-loader',
        options: '$',
      },
    ],
  },
  {
    test: require.resolve(
      'jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser'
    ),
    use: [
      {
        loader: 'expose-loader',
        options: 'pluralRuleParser',
      },
    ],
  },
]

module.exports = {
  entry: './src/js/bootstrap.js',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: `[name]${hash}.js`,
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  devServer: {
    contentBase: './out',
    port: 8080,
    host: '0.0.0.0',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                minimize: isProduction,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: () => {
                  return [require('autoprefixer')()]
                },
              },
            },
          ],
        }),
      },
    ].concat(globals),
  },
  plugins: [
    new CleanWebpackPlugin(['out'], {
      exclude: [
        'data.json',
        'data.min.json',
        'data.yml',
        'dates.json',
        'blog_planet.json',
        'index.html',
      ],
    }),
    new CopyWebpackPlugin([
      {
        from: 'static',
        to: '.',
      },
    ]),
    new ExtractTextPlugin(`[name]${hash}.css`),
    new ManifestPlugin(),
    new GenerateJsonPlugin('../src/js/languages.json', generatedLangList),
  ].concat(
    isProduction
      ? [
          new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
          }),
          new UglifyJSPlugin({ sourceMap: true }),
        ]
      : []
  ),
}
