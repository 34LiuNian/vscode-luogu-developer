/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check
'use strict';

const resolve = require('path').resolve;
const terser = require('terser-webpack-plugin');
const fs = require('fs');
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/* build icon
 * 放这里可能不太合适 改天再换
 */
(async function () {
  console.log('Building icon fonts...');
  try {
    fs.mkdirSync(resolve('dist'));
  } catch {
    /* empty */
  }
  const fontPath = 'dist/icon.woff';
  /**@type {Record<string,{"description": string,"default":{"fontPath": "dist/icon.woff","fontCharacter": string}}>}*/
  const iconData = JSON.parse(
    fs.readFileSync(resolve('package.json')).toString()
  ).contributes.icons;
  const fontBinary = (
    await require('webfont').webfont({
      files: Object.entries(iconData).map(
        ([name]) => `productIcons/${name}.svg`
      ),
      formats: ['woff'],
      glyphTransformFn: obj => {
        (obj.unicode || (obj.unicode = ['']))[0] = String.fromCharCode(
          parseInt(iconData[obj.name].default.fontCharacter.substring(1), 16)
        );
        return obj;
      },
      normalize: true,
      sort: false
    })
  ).woff;
  if (!fontBinary) throw new Error('fontBinary is null');
  fs.writeFileSync(resolve(fontPath), new Uint8Array(fontBinary));
  console.log('Icon fonts built!');
})();

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @returns {WebpackConfig}
 */
function getBaseConfig(mode) {
  return {
    mode,
    externals: {
      vscode: 'commonjs vscode'
    },
    devtool: mode === 'development' && 'inline-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': resolve('src'),
        '@w': resolve('webview'),
        '@r': resolve('resources'),
        'luogu-api': resolve('luogu-api-docs', 'luogu-api.d.ts')
      }
    },
    optimization:
      mode == 'production'
        ? {
            minimize: true,
            usedExports: true,
            innerGraph: true,
            minimizer: [
              new terser({
                parallel: true,
                terserOptions: {
                  format: { comments: false }
                },
                extractComments: false
              })
            ]
          }
        : {},
    plugins: [
      // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
      //   analyzerPort: 'auto'
      // })
    ]
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @returns {WebpackConfig}
 */
function getExtensionConfig(mode) {
  return {
    ...getBaseConfig(mode),
    target: ['node', 'es2020'],
    entry: './src/extension.ts',
    output: {
      filename: 'extension.js',
      path: resolve('dist'),
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: resolve('tsconfig.extension.json')
              }
            }
          ]
        }
      ]
    },
    plugins: [
      // @ts-ignore
      // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)()
    ]
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {WebpackConfig['entry']} entry
 * @returns {WebpackConfig}
 */
function GetWebviewConfig(mode, entry) {
  return {
    ...getBaseConfig(mode),
    entry,
    target: ['web', 'es2020'],
    output: {
      filename: '[name].js',
      path: resolve('dist')
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: resolve('tsconfig.webview.json')
            }
          }
        },
        {
          test: /\.css$/,
          exclude: /\.lazy\.css$/,
          use: [{ loader: 'style-loader' }, 'css-loader']
        },
        {
          test: /\.lazy\.css$/,
          use: [
            {
              loader: 'style-loader',
              options: { injectType: 'lazySingletonStyleTag' }
            },
            'css-loader'
          ]
        },
        {
          test: /\.(woff2|woff|eot|ttf|otf|svg)$/,
          type: 'asset'
        }
      ]
    }
  };
}

module.exports =
  /**
   * @param {{ mode: 'production' | 'development' | 'none' | undefined; }} argv
   * @returns { Promise<WebpackConfig[]> }
   */
  function (env, argv) {
    const mode = argv.mode || 'none';
    return Promise.all([
      getExtensionConfig(mode),
      GetWebviewConfig(
        mode,
        Object.fromEntries(
          fs
            .readdirSync('./webview/views')
            .map(s => [`webview-${s}`, `./webview/views/${s}`])
        )
      )
    ]);
  };
