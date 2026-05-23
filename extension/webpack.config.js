const path = require("path")
const webpack = require("webpack")
const CopyPlugin = require("copy-webpack-plugin")

module.exports = (_env, argv) => {
  const isProd = argv && argv.mode === "production"
  const apiUrl =
    process.env.KAIROS_API_URL ||
    (isProd ? "https://api.kairos-bienestar.com" : "http://localhost:8000")

  return {
    entry: {
      background: "./src/background/index.ts",
      "content-scroll": "./src/content-scripts/scroll-detector.ts",
      popup: "./src/popup/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },
    resolve: { extensions: [".ts", ".tsx", ".js"] },
    module: {
      rules: [
        { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
        { test: /\.css$/, use: ["style-loader", "css-loader"] },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        KAIROS_API_URL: JSON.stringify(apiUrl),
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, "src/popup/index.html"),
            to: path.resolve(__dirname, "dist/popup.html"),
          },
        ],
      }),
    ],
    devtool: isProd ? false : "cheap-module-source-map",
  }
}
