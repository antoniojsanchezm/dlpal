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
              container: f.container,
              label: `${f.qualityLabel} @ ${convertBits(f.bitrate).kb}kbps (${convertFileSize(f.contentLength)}) (.${f.container})`
            };
          }),
          audio: audio_formats.map((f) => {
            return {
              id: f.id,
              container: f.container,
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

/**
 * Executes an array of promises one by one
 * @param {Array} promises Array of promises
 * @returns Promise resolving at the last one
 */

export function promisesAtOnce(promises) {
  let p = Promise.resolve();

  promises.forEach((promise) => {
    p = p.then(() => promise());
  });

  return p;
}

class Download {
  constructor({ data: { id: video_id }, download: { video_format, audio_format, save_path, title, merge, keep_files, video_to_mp4, audio_to_mp3 } }, url, store, communicate) {
    this.video_id = video_id;
    if (video_format) this.video_format = video_format;
    if (audio_format) this.audio_format = audio_format;
    this.save_path = save_path;
    this.title = title;
    this.merge = merge;
    this.keep_files = keep_files;
    if (video_to_mp4) this.video_to_mp4 = video_to_mp4;
    if (audio_to_mp3) this.audio_to_mp3 = audio_to_mp3;
    this.url = url;
    this.store = store;
    this.communicate = communicate;
  }

  /**
   * Makes a save path for a file
   * @param {string} container Extension of the file, "mp4", "mp3", "webm"
   * @param {string} prefix Prefix of the file
   * @returns File path for saving
   */

  makePath(container, prefix) {
    return join(this.save_path, `${(prefix) ? `(${prefix}) ` : ""}${this.title}.${container}`);
  }

  /**
   * Gets a format from the store
   * @param {string} type "video" or "audio"
   * @param {string} id Format ID
   * @returns Format object directly from the store
   */

  getFormat(type, id) {
    const stored = this.store.get(this.video_id);

    return stored.formats[type].find((f) => f.id == id);
  }

  /**
   * Gets the format from the store, instances the progress handler and makes the file save path
   * @param {string} type "video" or "audio"
   * @param {string} id Format ID
   * @returns Object with the format from the store, the progress handler and the save path
   */

  makeFormat(type, format_id) {
    const stored_format = this.getFormat(type, format_id);

    const progress_handler = progress_stream({
      length: stored_format.contentLength,
      time: 250
    });

    progress_handler.on("progress", (p) => {
      this.setProgress({
        value: (p.transferred / stored_format.contentLength) * 100
      });
    });

    let prefix = undefined;
    
    if ((this.options.both && !this.options.merge) || this.audio_to_mp3 || this.video_to_mp4) prefix = type.toUpperCase();

    const file_path = this.makePath(stored_format.container, type.toUpperCase(), prefix);

    return {
      format: stored_format,
      handler: progress_handler,
      path: file_path
    };
  }

  /**
   * Sends the progress of the download to the frontend
   * @param {object} progress Progress object with "value", "action", "color", "completed", "saved_at", etc.
   */

  setProgress(progress) {
    this.communicate("download_progress", this.video_id, progress);
  }

  /**
   * Resets the progress of the download (useful when doing multiple actions)
   */

  resetProgress() {
    this.setProgress({
      value: 0
    });
  }

  /**
   * Downloads the video in a given format
   * @param {string} type "video" or "audio"
   * @param {string} id Format ID
   * @returns Promise, resolving with the file path when the data is downloaded
   */
  
  downloadFormat(type, id) {
    return new Promise((resolve) => {
      const { format, handler, path } = this.makeFormat(type, id);
      
      ytdl(this.url, {
        format
      }).pipe(handler).pipe(fs.createWriteStream(path)).on("finish", () => {
        resolve(path);
      });
    });
  }

  /**
   * Sets the initial progress and starts the download of a given format
   * @param {string} type "video" or "audio"
   * @param {string} id Format ID
   * @param {string} color Color for the progress bar, "error", "info", "success", etc.
   * @param {string} action Label for the action, "Merging", "Downloading", "Converting", etc.
   * @returns Promise, resolving with the file path when the data is downloaded
   */

  makeAction(type, format_id, color, action) {
    return new Promise((resolve) => {
      this.setProgress({
        color,
        action
      });

      this.downloadFormat(type, format_id).then((path) => {
        this.resetProgress();

        resolve(path);
      });
    });
  }

  /**
   * Downloads the audio format
   * @returns Promise, resolving with the file path when the data is downloaded
   */

  downloadAudio() {
    return this.makeAction("audio", this.audio_format, "warning", "Downloading");
  }

  /**
   * Downloads the video format
   * @returns Promise, resolving with the file path when the data is downloaded
   */

  downloadVideo() {
    return this.makeAction("video", this.video_format, "primary", "Downloading");
  }

  /**
   * Converts a file to another format through FFMPEG
   * @param {string} path Path of the source file
   * @param {object} format Format object from the store
   * @param {string} container Target extension, "mp3", "mp4", "webm", etc.
   * @returns Promise, resolving with the converted file path when the file is converted
   */

  convertFileTo(path, format, container) {
    return new Promise((resolve) => {
      this.setProgress({
        color: "error",
        action: "Converting"
      });

      ffmpeg.setFfmpegPath(ffmse.path.replace("app.asar", "app.asar.unpacked"));

      const new_path = this.makePath(container);

      ffmpeg()
      .addInput(path)
      .format(container)
      .on("progress", ffmpegOnProgress((p) => {
        this.setProgress({
          value: p * 100
        });
      }, format.approxDurationMs))
      .on("error", (e) => console.error(e))
      .on("end", () => {
        fs.unlink(path, () => {
          resolve(new_path);
        });
      })
      .saveToFile(new_path);
    });
  }

  /**
   * Merges a video file with an audio file
   * @param {string} vpath Path of the video file
   * @param {string} apath Path of the audio file
   * @param {object} vformat Video format from the store
   * @returns Promise, resolving with the merged file path when the merging is done
   */

  mergeVideoAndAudio(vpath, apath, vformat) {
    return new Promise((resolve) => {
      this.setProgress({
        color: "error",
        action: "Merging"
      });

      ffmpeg.setFfmpegPath(ffmse.path.replace("app.asar", "app.asar.unpacked"));

      const merged_path = this.makePath("mp4");

      ffmpeg()
      .addInput(vpath)
      .addInput(apath)
      .addOptions(["-map 0:v", "-map 1:a", "-c:v copy"])
      .format("mp4")
      .on("progress", ffmpegOnProgress((p) => {
        this.setProgress({
          value: p * 100
        });
      }, vformat.approxDurationMs))
      .on("error", (e) => console.error(e))
      .on("end", () => {
        if (!this.keep_files) {
          fs.unlink(vpath, () => {
            fs.unlink(apath, () => {
              resolve(merged_path);
            });
          });
        } else resolve(merged_path);
      })
      .saveToFile(merged_path);
    });
  }

  /**
   * Manages the download options and starts the downloads
   * @returns Promise, resolving when all the downloads necessary are done
   */

  download() {
    return new Promise((resolve) => {
      const finishOperation = (path) => {
        this.setProgress({
          completed: true,
          saved_at: path
        });

        resolve();
      };

      if (this.options.only_video) {
        this.downloadVideo().then((path) => {
          if (this.video_to_mp4) {
            const vformat = this.getFormat("video", this.video_format);

            this.convertFileTo(path, vformat, "mp4").then((new_path) => {
              finishOperation(new_path);
            });
          } else {
            finishOperation(path);
          }
        });
      } else if (this.options.only_audio) {
        this.downloadAudio().then((path) => {
          if (this.audio_to_mp3) {
            const aformat = this.getFormat("audio", this.audio_format);

            this.convertFileTo(path, aformat, "mp3").then((new_path) => {
              finishOperation(new_path);
            });
          } else {
            finishOperation(path);
          }
        });
      } else if (this.options.both) {
        this.downloadVideo().then((vpath) => {
          this.downloadAudio().then((apath) => {
            if (this.merge) {
              const vformat = this.getFormat("video", this.video_format);

              this.mergeVideoAndAudio(vpath, apath, vformat).then((mpath) => {
                finishOperation(mpath);
              });
            } else {
              const promises = [];

              if (this.audio_to_mp3) {
                const aformat = this.getFormat("audio", this.audio_format);

                if (vformat.container != "mp3") promises.push(() => this.convertFileTo(apath, aformat, "mp3"));
              }

              if (this.video_to_mp4) {
                const vformat = this.getFormat("video", this.video_format);

                if (vformat.container != "mp4") promises.push(() => this.convertFileTo(vpath, vformat, "mp4"));
              }

              promisesAtOnce(promises).then((last_path) => {
                finishOperation(last_path);
              });
            }
          });
        });
      }
    });
  }

  /**
   * Download options (directly from some of the frontend's switches)
   */

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
  return new Promise((resolve, reject) => {
    try {
      const promises = [];
    
      data.forEach((video) => {
        const url = `https://youtube.com/watch?v=${video.id}`;

        const download = new Download(video, url, store, communicate);

        promises.push(() => download.download());
      });

      promisesAtOnce(promises).then(() => {
        communicate("finish_queue", data.length);

        resolve();
      });
    } catch(e) {
      reject(e);
    }
  });
}