import ytdl from "@distube/ytdl-core"
import fs from "node:fs"
import humanize from "humanize"
import progress_stream from "progress-stream"
import { v4 } from "uuid"
import ffmpeg from "fluent-ffmpeg"
import ffmse from "ffmpeg-static-electron"
import { join } from 'path'

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

export const convertFileSize = (size) => {
  return (size) ? humanize.filesize(size) : "??? size";
}

export function fetchVideoData(url, store) {
  return new Promise(async (resolve, reject) => {
    const video_id = ytdl.getVideoID(url);
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
            label: `${f.qualityLabel} - ${convertBits(f.bitrate).kb}kbps - ${convertFileSize(f.contentLength)}`
          };
        }),
        audio: audio_formats.map((f) => {
          return {
            id: f.id,
            label: `${convertHz(f.audioSampleRate, 1).khz}kHz - ${f.audioBitrate}kbps - ${convertFileSize(f.contentLength)}`
          };
        })
      }
    });
  })
}


export function beginDownload(data, store, sender) {
  return new Promise((resolve, reject) => {
    const { video_id, title, save_path, video_format, audio_format, merge, keep_files } = data;

    const stored = store.get(video_id);

    const url = `https://youtube.com/watch?v=${video_id}`;

    const stored_video_format = stored.formats.video.find((f) => f.id == video_format);
    const stored_audio_format = stored.formats.audio.find((f) => f.id == audio_format);

    const video_progress_handler = progress_stream({
      length: (stored_video_format) ? parseInt(stored_video_format.contentLength) : 0,
      time: 100
    });

    const audio_progress_handler = progress_stream({
      length: (stored_audio_format) ? parseInt(stored_audio_format.contentLength) : 0,
      time: 100
    });

    video_progress_handler.on("progress", (p) => {
      sender("progress", p.percentage);
    });

    audio_progress_handler.on("progress", (p) => {
      sender("progress", p.percentage);
    });

    const makeFilePath = (format, prefix) => join(save_path, `${(prefix) ? `(${prefix}) ` : ""}${title}.${format.container}`);

    const video_path = makeFilePath(stored_video_format, "VIDEO");
    const audio_path = makeFilePath(stored_audio_format, "AUDIO");

    const finish = () => {
      sender("finish");
    };

    if (video_format && !audio_format) {
      sender("action", "Video");

      ytdl(url, {
        format: stored_video_format
      }).pipe(video_progress_handler).pipe(fs.createWriteStream(video_path)).on("finish", () => {
        finish();
      });
    }  else if (audio_format && !video_format) {
      sender("color", "warning");
      sender("action", "Audio");

      ytdl(url, {
        format: stored_audio_format
      }).pipe(audio_progress_handler).pipe(fs.createWriteStream(audio_path)).on("finish", () => {
        finish();
      });
    } else if (video_format && audio_format) {
      sender("action", "Video");
      
      ytdl(url, {
        format: stored_video_format
      }).pipe(video_progress_handler).pipe(fs.createWriteStream(video_path)).on("finish", () => {
        sender("color", "warning");
        sender("progress", 0);
        sender("action", "Audio");
        
        ytdl(url, {
          format: stored_audio_format
        }).pipe(audio_progress_handler).pipe(fs.createWriteStream(audio_path)).on("finish", () => {
          if (merge) {
            sender("color", "success");
            sender("progress", 0);
            sender("action", "Merge");

            ffmpeg.setFfmpegPath(ffmse.path.replace("app.asar", "app.asar.unpacked"));

            const merged_path = makeFilePath({ container: "mp4" });

            ffmpeg()
              .addInput(video_path)
              .addInput(audio_path)
              .addOptions(["-map 0:v", "-map 1:a", "-c:v copy"])
              .format("mp4")
              .on("progress", (p) => {
                sender("progress", p.percent);
              })
              .on("error", (e) => console.error(e))
              .on("end", () => {
                if (!keep_files) {
                  fs.unlink(video_path, () => {
                    fs.unlink(audio_path, () => {
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