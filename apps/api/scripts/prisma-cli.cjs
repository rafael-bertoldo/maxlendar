const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const prismaCli = resolve(__dirname, "../../../node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  env: { ...process.env, RUST_LOG: "info" },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
