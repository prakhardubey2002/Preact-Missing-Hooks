/**
 * Generates dist/entry.cjs which auto-detects Preact vs React at runtime (CJS only).
 * Run after build so dist/index.js and dist/react.js exist.
 */
const fs = require("fs");
const path = require("path");

const content = `"use strict";
/**
 * Auto-detect Preact vs React and re-export the matching build.
 * Used for require('preact-missing-hooks') in Node / CJS bundlers.
 */
function detect() {
  try {
    require.resolve("preact");
    return require("./index.js");
  } catch (_) {
    try {
      require.resolve("react");
      return require("./react.js");
    } catch (_) {
      throw new Error(
        "preact-missing-hooks: Install either \\"preact\\" or \\"react\\" in your project."
      );
    }
  }
}
module.exports = detect();
`;

const outPath = path.join(__dirname, "..", "dist", "entry.cjs");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, "utf8");
console.log("Generated dist/entry.cjs");
