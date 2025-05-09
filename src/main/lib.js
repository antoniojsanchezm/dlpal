import ytdl from "@distube/ytdl-core";
import fs from "node:fs";
import humanize from "humanize";
import progress_stream from "progress-stream";
import { v4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import ffmse from "ffmpeg-static-electron";
import { join } from "path";

/**
 * Converts a given quantity from bits to kilobytes, megabytes and gigabytes
 * @param {number} bits Bits quantity
 * @param {number} fixed Fixed number of decimals
 * @param {boolean} exact If you want the exact numbers (not cropped ones)
 * @returns Object with b, kb, mb and gb
 */

export const convertBits = (bits, fixed = 0, exact = false) => {
  const data = {
    b: bits,
    kb: bits / 1024,
    mb: bits / 1024 / 1024,
    gb: bits / 1024 / 1024 / 1024
  };

  if (!exact) Object.entries(data).forEach(([unit, value]) => {
    data[unit] = value.toFixed(fixed);
  });

  return data;
};

/**
 * Converts a given quantity from hertz to kilohertz and megahertz
 * @param {number} hz Hertz quantity
 * @param {number} fixed Fixed number of decimals
 * @param {boolean} exact If you want the exact numbers (not cropped ones)
 * @returns Object with hz, khz and mhz
 */

export const convertHz = (hz, fixed = 0, exact = false) => {
  hz = parseInt(hz);

  const data = {
    hz: hz,
    khz: hz / 1000,
    mhz: hz / 1000 / 1000
  };

  if (!exact) Object.entries(data).forEach(([unit, value]) => {
    data[unit] = value.toFixed(fixed);
  });

  return data;
};

/**
 * Humanizes a file size
 * @param {number} size Size of the file
 * @returns Humanized size of the files
 */

export const convertFileSize = (size) => {
  return (size) ? humanize.filesize(size) : "??? size";
};

/**
 * Fetchs data from a given YouTube video URL
 * @param {string} url YouTube video URL
 * @param {Map} store Map where the temp data is stored
 * @returns Promise, resolving an object with some useful data of the video and the video and audio available formats
 */

export function fetchVideoData(url, store) {
  return new Promise(async (resolve, reject) => {
    const video_id = ytdl.getVideoID(url);
    
    try {
      const basic_info = await ytdl.getBasicInfo(url);
      const extended_info = await ytdl.getInfo(url);

      const details = basic_info.videoDetails;
      const formats = extended_info.formats;

      const isOnlyVideo = (format) => format.hasVideo && !format.hasAudio && format.contentLength;
      const isOnlyAudio = (format) => !format.hasVideo && format.hasAudio && format.contentLength;

      const video_formats = formats.filter(isOnlyVideo).map((f) => ({ ...f, id: v4() }));
      const audio_formats = formats.filter(isOnlyAudio).map((f) => ({ ...f, id: v4() }));

      store.set(video_id, {
        id: video_id,
        formats: {
          video: video_formats,
          audio: audio_formats
        }
      });

      resolve({
        id: video_id,
        title: details.title,
        thumbnail: details.thumbnails[details.thumbnails.length - 1].url,
        formats: {
          video: video_formats.map((f) => {
            return {
              id: f.id,
              label: `${f.qualityLabel} - ${convertBits(f.bitrate).kb}kbps - ${convertFileSize(f.contentLength)} (.${f.container})`
            };
          }),
          audio: audio_formats.map((f) => {
            return {
              id: f.id,
              label: `${convertHz(f.audioSampleRate, 1).khz}kHz - ${f.audioBitrate}kbps - ${convertFileSize(f.contentLength)} (.${f.container})`
            };
          })
        }
      });
    } catch (e) {
      resolve({
        error: e.toString()
      });
    }
  })
}

/**
 * Begins the download of a single file
 * @param {object} data Download data
 * @param {Map} store Map where the temp data is stored
 * @param {function} sender Sender function to communicate between backend -> frontend
 * @returns Promise, never resolving
 */

export function beginDownload(data, store, sender) {
  return new Promise((resolve, reject) => {
    const { video_id, title, save_path, video_format, audio_format, merge, keep_files } = data;

    const stored = store.get(video_id);

    const url = `https://youtube.com/watch?v=${video_id}`;

    const downloadVideo = Boolean(video_format);
    const downloadAudio = Boolean(audio_format);

    const onlyDownloadVideo = downloadVideo && !downloadAudio;
    const onlyDownloadAudio = downloadAudio && !downloadVideo;
    const downloadBoth = downloadVideo && downloadAudio;

    const makeFilePath = (format, prefix) => join(save_path, `${(prefix) ? `(${prefix}) ` : ""}${title}.${format.container}`);

    const makeFormatData = (type, id) => {
      const stored_format = stored.formats[type].find((f) => f.id == id);

      const progress_handler = progress_stream({
        length: stored_format.contentLength,
        time: 100
      });

      progress_handler.on("progress", (p) => {
        sender("progress", p.percentage);
      });

      const file_path = makeFilePath(stored_format, type.toUpperCase());

      return {
        format: stored_format,
        handler: progress_handler,
        path: file_path
      };
    };

    const finish = () => {
      sender("finish");
    };
    
    if (onlyDownloadVideo) {
      const video_data = makeFormatData("video", video_format);

      sender("action", "Video");

      ytdl(url, {
        format: video_data.format
      }).pipe(video_data.handler).pipe(fs.createWriteStream(video_data.path)).on("finish", () => {
        finish();
      });
    } else if (onlyDownloadAudio) {
      const audio_data = makeFormatData("audio", audio_format);

      sender("color", "warning");
      sender("action", "Audio");

      ytdl(url, {
        format: audio_data.format
      }).pipe(audio_data.handler).pipe(fs.createWriteStream(audio_data.path)).on("finish", () => {
        finish();
      });
    } else if (downloadBoth) {
      const video_data = makeFormatData("video", video_format);
      
      sender("action", "Video");
      
      ytdl(url, {
        format: video_data.format
      }).pipe(video_data.handler).pipe(fs.createWriteStream(video_data.path)).on("finish", () => {
        const audio_data = makeFormatData("audio", audio_format);
        
        sender("color", "warning");
        sender("progress", 0);
        sender("action", "Audio");
        
        ytdl(url, {
          format: audio_data.format
        }).pipe(audio_data.handler).pipe(fs.createWriteStream(audio_data.path)).on("finish", () => {
          if (merge) {
            sender("color", "success");
            sender("progress", 0);
            sender("action", "Merge");

            ffmpeg.setFfmpegPath(ffmse.path.replace("app.asar", "app.asar.unpacked"));

            const merged_path = makeFilePath({ container: "mp4" });

            ffmpeg()
              .addInput(video_data.path)
              .addInput(audio_data.path)
              .addOptions(["-map 0:v", "-map 1:a", "-c:v copy"])
              .format("mp4")
              .on("progress", (p) => {
                sender("progress", p.percent);
              })
              .on("error", (e) => console.error(e))
              .on("end", () => {
                if (!keep_files) {
                  fs.unlink(video_data.path, () => {
                    fs.unlink(audio_data.path, () => {
                      finish();
                    });
                  });
                } else finish();
              })
              .saveToFile(merged_path);
          } else finish();
        });
      });
    }

    resolve();
  });
}