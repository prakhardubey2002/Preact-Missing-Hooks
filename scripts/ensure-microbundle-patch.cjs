/**
 * Patches microbundle to pass clean: true to rollup-plugin-typescript2.
 * In rpt2, "clean" disables the RollingCache (noCache), avoiding EPERM rename
 * failures on Windows during UMD/CJS/ESM builds.
 */
const fs = require("fs");
const path = require("path");

const cliPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "microbundle",
  "dist",
  "cli.js",
);

if (!fs.existsSync(cliPath)) {
  console.warn(
    "ensure-microbundle-patch: microbundle not installed, skipping patch",
  );
  process.exit(0);
}

const src = fs.readFileSync(cliPath, "utf8");
const marker = "clean: true,";

if (src.includes(marker)) {
  process.exit(0);
}

const needle =
  "(useTypescript || emitDeclaration) && typescript__default['default']({";
const replacement = `${needle} clean: true,`;

if (!src.includes(needle)) {
  console.error(
    "ensure-microbundle-patch: microbundle cli.js format changed; update the patch script",
  );
  process.exit(1);
}

fs.writeFileSync(cliPath, src.replace(needle, replacement), "utf8");
console.log(
  "Patched microbundle (rollup-plugin-typescript2 clean:true for Windows EPERM)",
);
