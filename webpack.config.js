const path = require('path')

module.exports = env => {
  return {
    mode: env === 'production' ? 'production' : 'development',
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      filename: 'lean-script.min.js',
      path: path.resolve(__dirname, 'dist'),
      library: 'LS',
      libraryExport: "default",
      libraryTarget: 'umd'
    }
  }
}