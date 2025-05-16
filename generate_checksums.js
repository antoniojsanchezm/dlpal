const { readdirSync, lstatSync } = require("fs-extra");
const { resolve, join } = require("path");
const checksum = require("checksum");

const ignored = [
  "builder-effective-config.yaml",
  "builder-debug.yml"
];

const dist = resolve("dist");

const files = readdirSync(dist).filter((f) => lstatSync(join(dist, f)).isFile() && !ignored.includes(f));

console.log(`**CHECKSUM${(files.length > 1) ? "S" : ""} (SHA-256):**\n`);

files.forEach((f) => {
  const path = join(dist, f);

  checksum.file(path, {
    algorithm: "sha256"
  }, (err, hash) => {
    if (!err) console.log(`- **${f}** | \`${hash}\``);
  });
});