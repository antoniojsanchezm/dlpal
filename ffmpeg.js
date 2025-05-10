// Updating ffmpeg binaries to ffmpeg-static-electron
// Credits to eugeneware for the binaries

const { default: got } = require("got");
const { pipeline } = require("stream/promises");
const fs = require("fs-extra");
const path = require("path");
const zlib = require("zlib");

const binaries_path = path.resolve("node_modules", "ffmpeg-static-electron", "bin");

const last_ver = "b6.0";

const ignore_os = ["linux", "mac"];

const translations = {
  mac: "darwin",
  win: "win32"
};

const endings = {
  win: ".exe"
};

const operative_systems = fs.readdirSync(binaries_path).filter((os) => !ignore_os.includes(os));

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

    console.log("Downloading:", file_name);

    fs.unlink(target_path, async () => {
      const stream = got.stream(dl_url);

      stream.on("end", (e) => {
        console.log("Stream from request has ended!");
      });

      stream.on("error", (err) => {
          console.log("Stream from request error:", err);
      });

      const writer = fs.createWriteStream(file_path);

      writer.on("finish", () => {
        const gunzip = zlib.createGunzip();

        const input = fs.createReadStream(file_path);
        const output = fs.createWriteStream(target_path);

        input.pipe(gunzip).pipe(output).on("finish", () => {
          fs.unlink(file_path, () => {
            console.log(file_name, "ready!");
          });
        });
      });

      writer.on("error", (err) => console.log("File writer error:", err.message));

      writer.on("end", () => console.log("File writer end!"));

      writer.on("close", () => console.log("File writer closed!"));

      await pipeline(stream, writer);
    });
  });
});