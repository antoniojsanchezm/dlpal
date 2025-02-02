// Updating ffmpeg binaries to ffmpeg-static-electron
// Credits to eugeneware for the binaries

const download = require("download");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const binaries_path = path.resolve("node_modules", "ffmpeg-static-electron", "bin");

const last_ver = "b6.0";

const translations = {
  mac: "darwin",
  win: "win32"
};

const endings = {
  win: ".exe"
};

const operative_systems = fs.readdirSync(binaries_path);

operative_systems.forEach((os) => {
  const os_path = path.join(binaries_path, os);

  const archs = fs.readdirSync(os_path);

  archs.forEach((arch) => {
    const arch_path = path.join(os_path, arch);

    const file_name = `ffmpeg-${(translations[os]) ? translations[os] : os}-${arch}.gz`;
    const file_path = path.join(arch_path, file_name);
    const target_name = `ffmpeg${(endings[os]) ? endings[os] : ""}`;
    const target_path = path.join(arch_path, target_name);
    const dl_url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${last_ver}/${file_name}`;

    console.log(os, arch, "downloading...");

    fs.unlink(target_path, () => {
      download(dl_url, arch_path).then(() => {
        const gunzip = zlib.createGunzip();

        const input = fs.createReadStream(file_path);
        const output = fs.createWriteStream(target_path);

        input.pipe(gunzip).pipe(output).on("finish", () => {
          fs.unlink(file_path, () => {
            console.log(file_name, "ready!");
          });
        });
      });
    });
  });
});