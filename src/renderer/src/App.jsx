import { faBox, faCheckCircle, faCut, faDownload, faFileDownload, faLink, faListCheck, faPencil, faRepeat, faScroll, faTrash, faVideo, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormGroup, InputLabel, LinearProgress, MenuItem, Select, TextField } from "@mui/material";
import { useEffect, useReducer, useState } from "react";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";
import getVideoId from "get-video-id";
import Toggler from "./components/Toggler";
import IconAndText from "./components/IconAndText";
import DisclaimerAppName from "./components/DisclaimerAppName";
import { ToastContainer, toast } from "react-toastify";
import "react-circular-progressbar/dist/styles.css";
import SuccessToast from "./components/SuccessToast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import truncate from "truncate";

const dataFetchErrors = {
  EMPTY_URL: "The URL can not be empty",
  WRONG_SERVICE: "dlpal only works with YouTube videos"
};

const dataFetchTypes = {
  ON_LOADING: "on_loading",
  OFF_LOADING: "off_loading",
  SET_URL: "set_url",
  FETCH_ERROR: "fetch_error"
};

function dataFetchReducer(state, action) {
  const type = action.type;

  if (type == dataFetchTypes.ON_LOADING) return { ...state, loading: true };
  if (type == dataFetchTypes.OFF_LOADING) return { ...state, loading: false };

  if (type == dataFetchTypes.SET_URL) {
    const { input } = action;
    let error = false, helperText = false;

    if (!input || input.length < 1) {
      error = true;
      helperText = dataFetchErrors.EMPTY_URL;
    } else {
      const validation = getVideoId(input);

      if (validation.service != "youtube") {
        error = true;
        helperText = dataFetchErrors.WRONG_SERVICE;
      }
    }

    return {
      ...state,
      url: {
        ...state.url,
        input,
        error,
        helperText
      }
    };
  }

  if (type == dataFetchTypes.FETCH_ERROR) {
    const error = action.error;

    return {
      ...state,
      url: {
        ...state.url,
        error: true,
        helperText: error
      }
    };
  }
}

const queueDispatchTypes = {
  ADD: "add",
  DELETE: "delete",
  EDIT: "edit",
  PROGRESS: "progress"
};

function queueReducer(state, action) {
  const reduced = ((state, action) => {
    const { type } = action;
    const { ADD, DELETE, EDIT, PROGRESS } = queueDispatchTypes; // Destructuring the types for better readability

    if (type == ADD) {
      const { payload } = action;

      return [...state, payload];
    }

    if (type == EDIT) {
      const { id, payload } = action;

      const element = state.find((s) => s.id == id);

      if (element) {
        const excluded = state.filter((s) => s.id != id);

        const modified = [...excluded, {
          ...element,
          ...payload
        }];

        modified.sort((a, b) => a.position - b.position);

        return modified;
      }
    }

    if (type == PROGRESS) {
      const { id, progress } = action; 

      const element = state.find((s) => s.id == id);

      if (element) {
        const excluded = state.filter((s) => s.id != id);

        const modified = [...excluded, {
          ...element,
          progress: {
            ...element.progress,
            ...progress
          }
        }];

        modified.sort((a, b) => a.position - b.position);

        return modified;
      }
    }

    if (type == DELETE) {
      const { id } = action;

      return state.filter((s) => s.id != id);
    }

    return state;
  })(state, action);

  console.log(state, reduced, action);

  return reduced;
}

/**
 * Normalizes/modifies a progress value
 * @param {number} progress Progress of the stream
 * @param {function} modifier Modifier function to mutate the progress
 * @returns Normalized or modified progress
 */

function makeProgressValue(progress, modifier) {
  console.log(progress)
  if (!progress || progress < 0) return 0;
  else {
    if (progress > 100) return 100;
    else return (modifier) ? modifier(progress) : progress;
  }
};

function App() {
  const [data_fetch_state, dataFetchDispatch] = useReducer(dataFetchReducer, {
    loading: false,
    url: {
      input: "",
      error: true,
      helperText: dataFetchErrors.EMPTY_URL
    }
  });

  const [first_render_made, setFirstRenderMade] = useState(false);

  const [video_data, setVideoData] = useState(null);
  const [selected_video_format, setSelectedVideoFormat] = useState(null);
  const [selected_audio_format, setSelectedAudioFormat] = useState(null);

  const [get_video, setGetVideo] = useState(true);
  const [get_audio, setGetAudio] = useState(true);
  const [get_merge, setGetMerge] = useState(true);
  const [get_keep, setGetKeep] = useState(false);

  const initial_progress_value = 0;
  const initial_progress_color = "secondary";
  const initial_progress_action = "";

  const progress_colors = {
    primary: "144, 202, 249",
    secondary: "206, 147, 216",
    error: "244, 67, 54",
    warning: "255, 167, 38",
    info: "41, 182, 246",
    success: "102, 187, 106",
  };

  useEffect(() => {
    console.log(video_data)
  }, [video_data]);

  const [downloading, setDownloading] = useState(false);
  const [progress_value, setProgressValue] = useState(initial_progress_value);
  const [progress_color, setProgressColor] = useState(initial_progress_color);
  const [progress_action, setProgressAction] = useState(initial_progress_action);

  const [disclaimer_open, setDisclaimerOpen] = useState(false);

  const [queue, queueDispatch] = useReducer(queueReducer, []);
  const [queue_open, setQueueOpen] = useState(false);

  useEffect(() => {
    // TODO: Option for chapters
    // TODO: Option for converting audio/video to a specific format
    // TODO: Option for playlists
    // TODO: Add queue feature

    if (!first_render_made) { // Avoid event listener event leak (multiple listeners because of the re-rendering of React's strict mode)
      window.api.listenToMain("download_progress", (id, progress) => {
        queueDispatch({
          type: queueDispatchTypes.PROGRESS,
          id,
          progress
        });
      });

      window.api.listenToMain("finish_queue", () => setDownloading(false));

      /*window.api.listenToMain("finish", (saved_path) => {
        setDownloading(false);
        setProgressValue(initial_progress_value);
        setProgressColor(initial_progress_color);
        setProgressAction("");

        toast(SuccessToast, {
          position: "bottom-right",
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: false,
          theme: "dark",
          onClick: () => window.api.showItemInFolder(saved_path)
        });
      });*/

      setFirstRenderMade(true);
    }
  }, []);

  return (
    <div>
      <div className="p-8">
        <div className="flex flex-col gap-5">
          <div className="uncopyable">
            <span className="text-3xl">dlpal</span>
          </div>
          <div className="flex items-center gap-5 w-full mt-1">
            <TextField className="w-3/5" size="small" label={<IconAndText icon={faLink} text="Video URL" />} variant="outlined" error={data_fetch_state.url.error} helperText={data_fetch_state.url.helperText} value={data_fetch_state.url.input} onChange={(e) => dataFetchDispatch({
              type: dataFetchTypes.SET_URL,
              input: e.target.value
            })} disabled={downloading || Boolean(video_data)} />
            <Button variant="contained" className={`${(data_fetch_state.url.error) ? "invisible" : ""}`} loading={data_fetch_state.loading} onClick={() => {
              dataFetchDispatch({
                type: dataFetchTypes.ON_LOADING
              });

              window.api.fetchData(data_fetch_state.url.input).then((data) => {
                dataFetchDispatch({
                  type: dataFetchTypes.OFF_LOADING
                });

                if (data.error) {
                  if (data.error.match(/private video/g)) return dataFetchDispatch({
                    type: dataFetchTypes.FETCH_ERROR,
                    error: "dlpal can not download private videos"
                  });

                  return dataFetchDispatch({
                    type: dataFetchTypes.FETCH_ERROR,
                    error: "dlpal can not download this video"
                  });
                } else {
                  setSelectedVideoFormat(data.formats.video[0].id);
                  setSelectedAudioFormat(data.formats.audio[0].id);
  
                  setVideoData(data);
                }
              });
            }} disabled={downloading || Boolean(video_data)}>
              <IconAndText icon={faDownload} text="Fetch" />
            </Button>
            {(video_data) ? (
              <>
                <Button variant="contained" color="error" onClick={async () => {
                  dataFetchDispatch({
                    type: dataFetchTypes.SET_URL,
                    input: ""
                  });
                  
                  setVideoData(null);
                }} disabled={downloading}>
                  <IconAndText icon={faRepeat} text="Reset" />
                </Button>
              </>
            ) : ""}
            {(queue.length > 0) ? (
              <Button variant="contained" color="secondary" onClick={() => setQueueOpen(true)}>
                <IconAndText icon={faListCheck} text={`Queue`} />
              </Button>
            ) : ""}
          </div>
          {
            (video_data) ? (
              <div>
                <div className="grid grid-cols-4">
                  <div className="col-span-3">
                    <span className="text-lg">
                      <IconAndText icon={faScroll} text={video_data.title} />
                    </span>
                    <img className="h-48 rounded-lg mt-2" src={video_data.thumbnail} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-4 mt-6">
                    {(get_video) ? (
                      <FormControl>
                        <InputLabel id="video-quality"><IconAndText icon={faVideo} text="Video quality" /></InputLabel>
                        <Select
                          labelId="video-quality"
                          label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Video quality"
                          value={selected_video_format}
                          onChange={(e) => setSelectedVideoFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {video_data.formats.video.map((f) => (
                            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(get_audio) ? (
                      <FormControl>
                        <InputLabel id="audio-quality"><IconAndText icon={faVolumeHigh} text="Audio quality" /></InputLabel>
                        <Select
                          labelId="audio-quality"
                          label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Audio quality"
                          value={selected_audio_format}
                          onChange={(e) => setSelectedAudioFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {video_data.formats.audio.map((f) => (
                            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(get_video || get_audio) ? (
                      <Button variant="contained" color="secondary" onClick={async () => {
                        window.api.openDirectory().then(async (path) => {
                          if (path) {
                            const payload = {
                              position: queue.length + 1,
                              ...video_data,
                              download: {
                                title: video_data.title.replace(/[&\/\\#,+()$~%."":*?<>{}\|]/g, ""),
                                save_path: path,
                                merge: get_merge,
                                keep_files: get_keep
                              },
                              labels: {}
                            };

                            const getFormat = (type, id) => video_data.formats[type].find((f) => f.id == id);

                            if (get_video) {
                              const format = getFormat("video", selected_video_format);

                              payload.download.video_format = selected_video_format;

                              if (format) payload.labels.video_format = format.label;
                            } if (get_audio) {
                              const format = getFormat("audio", selected_audio_format);

                              payload.download.audio_format = selected_audio_format;

                              if (format) payload.labels.audio_format = format.label;
                            }

                            queueDispatch({
                              type: queueDispatchTypes.ADD,
                              payload
                            });

                            //setDownloading(true)

                            //await window.api.beginDownload(download_data);
                          }
                        });
                      }} disabled={downloading}>
                        <IconAndText icon={faListCheck} text={(<>&nbsp;ADD TO QUEUE</>)} />
                      </Button>
                    ) : ""}
                  </div>
                  <div className="flex flex-col gap-4 mt-6">
                    <FormGroup>
                      <Toggler checked={get_video} changeHook={setGetVideo} disabled={downloading} icon={faVideo} label="Download video" />
                      <Toggler checked={get_audio} changeHook={setGetAudio} disabled={downloading} icon={faVolumeHigh} label="Download audio" />
                      {(get_video && get_audio) ? (
                        <Toggler checked={get_merge} changeHook={setGetMerge} disabled={downloading} icon={faCut} label="Merge video and audio" />
                      ) : ""}
                      {(get_merge && (get_video && get_audio)) ? (
                        <Toggler checked={get_keep} changeHook={setGetKeep} disabled={downloading} icon={faBox} label="Keep separate files" />
                      ) : ""}
                    </FormGroup>
                  </div>
                </div>
              </div>
            ) : ""
          }
        </div>
      </div>
      <div className="footer uncopyable pr-4 pb-4 flex flex-col gap-1 justify-end">
        <span className="text-xs text-blue-300 hover:font-bold hover:underline" onClick={async () => {
          await window.api.openLink("https://github.com/antoniojsanchezm/dlpal/releases");
        }}>dlpal v1.0.5</span>
        <span className="text-xs text-gray-500"><span className="text-red-500 hover:font-bold hover:underline" onClick={() => setDisclaimerOpen(true)}>Disclaimer</span> - <span className="hover:font-bold hover:underline" onClick={async () => {
          await window.api.openLink("https://github.com/antoniojsanchezm/");
        }}>Developed by Antonio S.</span></span>
      </div>
      <Dialog open={disclaimer_open} onClose={() => setDisclaimerOpen(false)}>
          <DialogTitle>Disclaimer</DialogTitle>
          <DialogContent>
            <DialogContentText className="flex flex-col gap-4">
              <span><DisclaimerAppName /> will NOT be held responsible for what end users do with downloaded content.</span>
              <span><DisclaimerAppName /> does NOT own nor claim to own the rights to any of the content that end users can download.</span>
              <span><DisclaimerAppName /> is NOT associated in any way with YouTube or Google LLC.</span>
              <span>YouTube is a registered trademark of Google LLC.</span>
              <span><DisclaimerAppName /> is still a work in progress. Bugs are expected.</span>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisclaimerOpen(false)}>Close</Button>
          </DialogActions>
      </Dialog>
      <Dialog maxWidth="xl" open={queue_open} onClose={() => setQueueOpen(false)}>
          <DialogTitle>Queue ({queue.length})</DialogTitle>
          <DialogContent>
            <DialogContentText className="grid grid-cols-2 gap-4">
              {(queue.length > 0) ? queue.map((element) => {
                return (
                  <div className={`flex flex-col gap-2 w-full ${(element.progress) ? (element.progress.completed) ? "bg-green-900" : "bg-gray-600" : "bg-gray-600"} text-white p-3 rounded-lg`}>
                    <div className="flex items-center gap-4">
                      <img src={element.thumbnail} className="rounded-xl w-28" alt="" />
                      {(element.progress) ? (
                        <div className="w-16">
                          <CircularProgressbarWithChildren styles={{
                            path: {
                              stroke: `rgba(${(!element.progress.completed) ? progress_colors[element.progress.color] : progress_colors.success}, 1)`
                            }
                          }} value={(!element.progress.completed) ? makeProgressValue(element.progress.value) : 100}>
                            {(!element.progress.completed) ? (
                              <>
                                <span>{makeProgressValue(element.progress.value, (v) => v.toFixed(0))}%</span>
                                <span className="text-xs">{element.progress.action}</span>
                              </>
                            ) : (
                              <span className="text-xl text-green-400"><FontAwesomeIcon icon={faCheckCircle} /></span>
                            )}
                          </CircularProgressbarWithChildren>
                        </div>
                      ) : ""}
                    </div>
                    <span className="text-lg mt-1">
                      {truncate(element.title, 28)}
                      {(!downloading) ? (
                        <span className="text-gray-400">
                          &nbsp;
                          &nbsp;
                          <FontAwesomeIcon icon={faPencil} />
                          &nbsp;
                          &nbsp;
                          <FontAwesomeIcon icon={faTrash} />
                        </span>
                      ) : ""}
                    </span>
                    <div className="flex items-center gap-12">
                      <div className="flex flex-col text-gray-400 text-sm ml-1">
                        {(element.download.video_format) ? (
                          <div>
                            <IconAndText icon={faVideo} text={element.labels.video_format} />
                          </div>
                        ) : ""}
                        {(element.download.audio_format) ? (
                          <div>
                            <IconAndText icon={faVolumeHigh} text={element.labels.audio_format} />
                          </div>
                        ) : ""}
                      </div>
                    </div>
                  </div>
                );
              }) : ""}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQueueOpen(false)}>Close</Button>
            <Button color="success" onClick={() => {
              setDownloading(true);
              window.api.beginDownload(queue.filter((q) => !q.completed));
            }} disabled={downloading}>Begin download</Button>
          </DialogActions>
      </Dialog>
      <ToastContainer />
    </div>
  )
}

export default App;