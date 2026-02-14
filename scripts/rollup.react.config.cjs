/**
 * Rollup config for the React build (preact aliased to react).
 * Uses rollup-plugin-typescript2 with clean: true to avoid EPERM cache
 * rename issues on Windows.
 */
const path = require("path");
const alias = require("@rollup/plugin-alias");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");

module.exports = {
  input: path.join(__dirname, "..", "src", "index.ts"),
  output: {
    file: path.join(__dirname, "..", "dist", "react.js"),
    format: "cjs",
    sourcemap: false,
  },
  external: ["react", "react-dom"],
  plugins: [
    alias({
      entries: [
        { find: "preact/hooks", replacement: "react" },
        { find: "preact", replacement: "react" },
      ],
    }),
    nodeResolve(),
    commonjs(),
    typescript({
      clean: true,
      tsconfig: path.join(__dirname, "..", "tsconfig.json"),
    }),
  ],
};
