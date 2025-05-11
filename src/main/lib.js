import ytdl from "@distube/ytdl-core";
import fs from "fs-extra";
import humanize from "humanize";
import progress_stream from "progress-stream";
import { v4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import ffmse from "ffmpeg-static-electron";
import { join } from "path";
import ffmpegOnProgress from "ffmpeg-on-progress";

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
              label: `${f.qualityLabel} @ ${convertBits(f.bitrate).kb}kbps (${convertFileSize(f.contentLength)}) (.${f.container})`
            };
          }),
          audio: audio_formats.map((f) => {
            return {
              id: f.id,
              label: `${convertHz(f.audioSampleRate, 1).khz}kHz @ ${f.audioBitrate}kbps (${convertFileSize(f.contentLength)}) (.${f.container})`
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

class Download {
  constructor(video_id, video_format, audio_format, save_path, title, url, store, communicate) {
    this.video_id = video_id;
    if (video_format) this.video_format = video_format;
    if (audio_format) this.audio_format = audio_format;
    this.save_path = save_path;
    this.title = title;
    this.url = url;
    this.store = store;
    this.communicate = communicate;
  }

  makePath(container, prefix) {
    return join(this.save_path, `${(prefix) ? `(${prefix}) ` : ""}${this.title}.${container}`);
  }

  makeFormat(type, format_id) {
    const stored = this.store.get(this.video_id);
    console.log(stored, this.store, this.video_id)

    const stored_format = stored.formats[type].find((f) => f.id == format_id);

    const progress_handler = progress_stream({
      length: stored_format.contentLength,
      time: 250
    });

    progress_handler.on("progress", (p) => {
      this.communicate("download_progress", this.video_id, {
        value: (p.transferred / stored_format.contentLength) * 100
      });
    });

    const file_path = this.makePath(stored_format.container, type.toUpperCase());

    return {
      format: stored_format,
      handler: progress_handler,
      path: file_path
    };
  }
  
  downloadFormat(type, id) {
    return new Promise((resolve) => {
      const { format, handler, path } = this.makeFormat(type, id);
      
      console.log("DOWNLOADING", type, id, path);
      ytdl(this.url, {
        format
      }).pipe(handler).pipe(fs.createWriteStream(path)).on("finish", () => {
        console.log("DOWNLOADED", path);

        resolve();
      });
    });
  }

  downloadAudio() {
    return new Promise((resolve) => {
      this.communicate("download_progress", this.video_id, {
        color: "warning",
        action: "Audio"
      });

      this.downloadFormat("audio", this.audio_format).then(() => {
        this.communicate("download_progress", this.video_id, {
          value: 0
        });

        resolve();
      });
    });
  }

  downloadVideo() {
    return new Promise((resolve) => {
      this.communicate("download_progress", this.video_id, {
        color: "primary",
        action: "Video"
      });

      this.downloadFormat("video", this.video_format).then(() => {
        this.communicate("download_progress", this.video_id, {
          value: 0
        });

        resolve();
      });
    });
  }

  mergeVideoAndAudio() {
    return new Promise((resolve) => {
      this.communicate("download_progress", this.video_id, {
        color: "success"
      });
    });
  }

  download() {
    console.log("DOWNLOADING", this.options);
    return new Promise((resolve) => {
      const finishOperation = () => this.communicate("download_progress", this.video_id, {
        completed: true
      });

      if (this.options.only_video) {
        this.downloadVideo().then(() => {
          finishOperation();
          resolve();
        });
      } else if (this.options.only_audio) {
        this.downloadAudio().then(() => {
          finishOperation();
          resolve();
        });
      } else if (this.options.both) {
        this.downloadVideo().then(() => {
          this.downloadAudio().then(() => {
            finishOperation();
            resolve();
          });
        });
      }
    });
  }

  get options() {
    const download_video = Boolean(this.video_format);
    const download_audio = Boolean(this.audio_format);

    const only_video = download_video && !download_audio;
    const only_audio = download_audio && !download_video;
    const both = download_video && download_audio;

    return {
      download_video,
      download_audio,
      only_video,
      only_audio,
      both
    };
  }
}

/**
 * Begins the download of a single file
 * @param {object} data Download data
 * @param {Map} store Map where the temp data is stored
 * @param {function} sender Sender function to communicate between backend -> frontend
 * @returns Promise, never resolving
 */

export function beginDownload(data, store, communicate) {
  console.log(data);
  return new Promise((resolve, reject) => {
    const promises = [];
    
    data.forEach((video) => {
      const { id: video_id, download: { title, save_path, video_format, audio_format, merge, keep_files } } = video;

      const url = `https://youtube.com/watch?v=${video_id}`;

      const download = new Download(video_id, video_format, audio_format, save_path, title, url, store, communicate);

      promises.push(() => download.download());
    });

    const download_all = () => {
      let p = Promise.resolve();

      promises.forEach((promise) => {
        p = p.then(() => promise());
      });

      return p;
    };

    download_all().then(() => {
      console.log(data.length, "DOWNLOADS READY");

      communicate("finish_queue");

      resolve();
    });
  });
}