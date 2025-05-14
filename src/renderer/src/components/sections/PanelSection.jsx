import { Button, FormControl, FormGroup, InputLabel, MenuItem, Select } from "@mui/material";
import IconAndText from "../IconAndText";
import Toggler from "../Toggler";
import { faBox, faCut, faDiceFour, faDiceThree, faListCheck, faScroll, faVideo, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { useContext } from "react";
import { DLPalContext, queueDispatchTypes, videoDataReducerTypes } from "../../contexts/DLPalContext";
import isEmpty from "is-empty";
import { getFormat } from "../../lib";

export default function PanelSection() {
  const { queue, data, data_fetch, queueDispatch, dataDispatch, downloading, edit_mode, setQueueOpen } = useContext(DLPalContext);

  return (
    <>
      {
        (!isEmpty(data?.data)) ? (
          <div>
            <div className="grid grid-cols-4">
              <div className="col-span-3">
                <span className="text-lg">
                  <IconAndText icon={faScroll} text={data?.data?.title ?? "Video title"} />
                </span>
                <img className="h-48 rounded-lg mt-2" src={data?.data?.thumbnail ?? "https://picsum.photos/1280/720"} alt="Video thumbnail" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-4 mt-6">
                {(data?.switches?.video) ? (
                  <FormControl>
                    <InputLabel id="video-quality">
                      <IconAndText icon={faVideo} text="Video quality" />
                    </InputLabel>
                    <Select
                      labelId="video-quality"
                      label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Video quality"
                      value={data?.formats?.video}
                      onChange={(e) => dataDispatch({
                        type: videoDataReducerTypes.SET_FORMATS,
                        formats: {
                          video: e.target.value
                        }
                      })}
                      disabled={downloading}
                    >
                      {data?.data?.formats.video.map((f) => (
                        <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : ""}
                {(data?.switches?.audio) ? (
                  <FormControl>
                    <InputLabel id="audio-quality"><IconAndText icon={faVolumeHigh} text="Audio quality" /></InputLabel>
                    <Select
                      labelId="audio-quality"
                      label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Audio quality"
                      value={data?.formats?.audio}
                      onChange={(e) => dataDispatch({
                        type: videoDataReducerTypes.SET_FORMATS,
                        formats: {
                          audio: e.target.value
                        }
                      })}
                      disabled={downloading}
                    >
                      {data?.data?.formats.audio.map((f) => (
                        <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : ""}
                {(data?.switches?.video || data?.switches?.audio) ? (
                  <Button variant="contained" color="secondary" onClick={async () => {
                    window.api.openDirectory().then(async (path) => {
                      if (path) {
                        const payload = {
                          ...data,
                          labels: {}
                        };

                        if (data?.switches?.video) {
                          const format = getFormat("video", data?.formats?.video, data?.data);

                          payload.labels.video = format.label;

                          if (!data?.switches?.merge && format.container != "mp4") payload.switches.video_to_mp4 = data?.switches?.video_to_mp4;
                          else payload.switches.video_to_mp4 = false;
                        } if (data?.switches?.audio) {
                          const format = getFormat("audio", data?.formats?.audio, data?.data);

                          payload.labels.audio = format.label;

                          if (!data?.switches?.merge && format.container != "mp3") payload.switches.audio_to_mp3 = data?.switches?.audio_to_mp3;
                          else payload.switches.audio_to_mp3 = false;
                        } if (!data?.switches?.merge && data?.switches?.keep_files) payload.switches.keep_files = false;

                        queueDispatch({
                          type: queueDispatchTypes.ADD,
                          payload: {
                            position: (queue.length + 1),
                            ...payload
                          }
                        });
                      }
                    });
                  }} disabled={downloading || (queue.some((q) => !isEmpty(data?.data) && q.id == data?.data?.id) && !edit_mode)}>
                    <IconAndText icon={faListCheck} text={(<>&nbsp;{(!edit_mode) ? "ADD TO QUEUE" : "SAVE CHANGES"}</>)} />
                  </Button>
                ) : ""}
                {(queue.length > 0) ? (
                  <div className="w-full">
                    <Button variant="contained" color="secondary" onClick={() => setQueueOpen(true)}>
                      <IconAndText icon={faListCheck} text={`Queue`} />
                    </Button>
                  </div>
                ) : ""}
              </div>
              <div className="flex flex-col gap-4 mt-6">
                <FormGroup>
                  <Toggler checked={data?.switches?.video} changeHook={(checked) => dataDispatch({
                    type: videoDataReducerTypes.SET_SWITCHES,
                    switches: {
                      video: checked
                    }
                  })} icon={faVideo} label="Download video" />
                  {(data?.switches?.video && (!data?.switches?.audio || !data?.switches?.merge)) ? (() => {
                    if (data?.data && data?.data?.format) return "";

                    const format = getFormat("video", data?.formats?.video, data?.data);

                    if (!format || format.container.toLowerCase() == "mp4") return "";

                    return (
                      <Toggler checked={data?.switches?.video_to_mp4} changeHook={(checked) => dataDispatch({
                        type: videoDataReducerTypes.SET_SWITCHES,
                        switches: {
                          video_to_mp4: checked
                        }
                      })} disabled={downloading} icon={faDiceFour} label="Convert video to MP4" />
                    );
                  })() : ""}
                  <Toggler checked={data?.switches?.audio} changeHook={(checked) => dataDispatch({
                    type: videoDataReducerTypes.SET_SWITCHES,
                    switches: {
                      audio: checked
                    }
                  })} disabled={downloading} icon={faVolumeHigh} label="Download audio" />
                  {(data?.switches?.audio && (!data?.switches?.video || !data?.switches?.merge)) ? (() => {
                    if (data?.data && data?.data?.format) return "";

                    const format = getFormat("audio", data?.formats?.audio, data?.data);

                    if (!format || format.container.toLowerCase() == "mp3") return "";

                    return (
                      <Toggler checked={data?.switches?.audio_to_mp3} changeHook={(checked) => dataDispatch({
                        type: videoDataReducerTypes.SET_SWITCHES,
                        switches: {
                          audio_to_mp3: checked
                        }
                      })} disabled={downloading} icon={faDiceThree} label="Convert audio to MP3" />
                    );
                  })() : ""}
                  {(data?.switches?.video && data?.switches?.audio) ? (
                    <Toggler checked={data?.switches?.merge} changeHook={(checked) => dataDispatch({
                      type: videoDataReducerTypes.SET_SWITCHES,
                      switches: {
                        merge: checked
                      }
                    })} disabled={downloading} icon={faCut} label="Merge video and audio" />
                  ) : ""}
                  {(data?.switches?.merge && (data?.switches?.video && data?.switches?.audio)) ? (
                    <Toggler checked={data?.switches?.keep_files} changeHook={(checked) => dataDispatch({
                      type: videoDataReducerTypes.SET_SWITCHES,
                      switches: {
                        keep_files: checked
                      }
                    })} disabled={downloading} icon={faBox} label="Keep separate files" />
                  ) : ""}
                </FormGroup>
              </div>
            </div>
          </div>
        ) : ""
      }
    </>
  );
}