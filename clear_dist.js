const { rmSync } = require("fs-extra");
const { resolve } = require("path");

rmSync(resolve("dist"), {
  force: true,
  recursive: true
});