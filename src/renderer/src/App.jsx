import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormControlLabel, FormGroup, FormLabel, InputLabel, LinearProgress, MenuItem, Select, Switch, TextField } from '@mui/material';
import getVideoId from 'get-video-id';
import { useEffect, useReducer, useState } from 'react';
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const dataFetchErrors = {
  EMPTY_URL: "The URL can not be empty",
  WRONG_SERVICE: "DLPal only works with YouTube videos"
};

const dataFetchTypes = {
  ON_LOADING: "on_loading",
  OFF_LOADING: "off_loading",
  SET_URL: "set_url"
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
}

function App() {
  const [dataFetchState, dataFetchDispatch] = useReducer(dataFetchReducer, {
    loading: false,
    url: {
      input: "",
      error: true,
      helperText: dataFetchErrors.EMPTY_URL
    }
  });

  const [videoData, setVideoData] = useState(null);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState(null);
  const [selectedAudioFormat, setSelectedAudioFormat] = useState(null);

  const [getVideo, setGetVideo] = useState(true);
  const [getAudio, setGetAudio] = useState(true);
  const [getMerge, setGetMerge] = useState(true);
  const [getKeep, setGetKeep] = useState(false);

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

  const [downloading, setDownloading] = useState(false);
  const [progressValue, setProgressValue] = useState(initial_progress_value);
  const [progressColor, setProgressColor] = useState(initial_progress_color);
  const [progressAction, setProgressAction] = useState(initial_progress_action);

  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  useEffect(() => {
    window.api.listenToMain("progress", (value) => setProgressValue(value));
    window.api.listenToMain("color", (color) => setProgressColor(color));
    window.api.listenToMain("action", (action) => setProgressAction(action));
    window.api.listenToMain("finish", () => {
      setDownloading(false);
      setProgressValue(initial_progress_value);
      setProgressColor(initial_progress_color);
      setProgressAction("");
    });
  });

  return (
    <div>
      <div className="p-8">
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-3xl">DLPal</span>
          </div>
          <div className="flex items-center gap-5 w-full mt-1">
            <TextField className="w-3/5" size="small" label="Video URL" variant="outlined" error={dataFetchState.url.error} helperText={dataFetchState.url.helperText} value={dataFetchState.url.input} onChange={(e) => dataFetchDispatch({
              type: dataFetchTypes.SET_URL,
              input: e.target.value
            })} disabled={downloading || videoData} />
            <Button variant="contained" className={`${(dataFetchState.url.error) ? "invisible" : ""}`} loading={dataFetchState.loading} onClick={() => {
              dataFetchDispatch({
                type: dataFetchTypes.ON_LOADING
              });

              window.api.fetchData(dataFetchState.url.input).then((data) => {
                dataFetchDispatch({
                  type: dataFetchTypes.OFF_LOADING
                });

                setSelectedVideoFormat(data.formats.video[0].id);
                setSelectedAudioFormat(data.formats.audio[0].id);

                setVideoData(data);
              });
            }} disabled={downloading || videoData}>Fetch data</Button>
            {(videoData) ? (
              <Button variant="contained" color="error" onClick={async () => {
                await window.api.clearStore();

                dataFetchDispatch({
                  type: dataFetchTypes.SET_URL,
                  input: ""
                });

                setVideoData(null);
              }} disabled={downloading}>Reset</Button>
            ) : ""}
          </div>
          {
            (videoData) ? (
              <div>
                <div className="grid grid-cols-4">
                  <div className="col-span-3">
                    <span className="text-lg">{videoData.title}</span>
                    <img className="h-48 rounded-lg mt-2" src={videoData.thumbnail} />
                  </div>
                  {(downloading) ? (
                    <div className="flex items-center">
                      <div className="flex flex-col gap-2 w-28">
                        <CircularProgressbarWithChildren styles={{
                          path: {
                            stroke: `rgba(${progress_colors[progressColor]}, 1)`
                          }
                        }} value={progressValue}>
                          <span>{progressValue.toFixed(0)}%</span>
                          <span className="text-xs">{progressAction}</span>
                        </CircularProgressbarWithChildren>
                      </div>
                    </div>
                  ) : ""}
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-4 mt-6">
                    {(getVideo) ? (
                      <FormControl>
                        <InputLabel id="video-quality">Video quality</InputLabel>
                        <Select
                          labelId="video-quality"
                          label="Video quality"
                          value={selectedVideoFormat}
                          onChange={(e) => setSelectedVideoFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {videoData.formats.video.map((f) => (
                            <MenuItem value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(getAudio) ? (
                      <FormControl>
                        <InputLabel id="audio-quality">Audio quality</InputLabel>
                        <Select
                          labelId="audio-quality"
                          label="Audio quality"
                          value={selectedAudioFormat}
                          onChange={(e) => setSelectedAudioFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {videoData.formats.audio.map((f) => (
                            <MenuItem value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(getVideo || getAudio) ? (
                      <Button variant="contained" color="success" onClick={async () => {
                        window.api.openDirectory().then(async (path) => {
                          if (path) {
                            const download_data = {
                              video_id: videoData.id,
                              title: videoData.title.replace(/[&\/\\#,+()$~%.'":*?<>{}\|]/g, ""),
                              save_path: path,
                              merge: getMerge,
                              keep_files: getKeep
                            };

                            if (getVideo) download_data.video_format = selectedVideoFormat;
                            if (getAudio) download_data.audio_format = selectedAudioFormat;

                            setDownloading(true)

                            await window.api.beginDownload(download_data);
                          }
                        });
                      }} disabled={downloading}>BEGIN DOWNLOAD</Button>
                    ) : ""}
                    {(downloading) ? (
                      <LinearProgress variant="determinate" color={progressColor} value={progressValue} />
                    ) : ""}
                  </div>
                  <div className="flex flex-col gap-4 mt-6">
                    <FormGroup>
                      <FormControlLabel control={<Switch checked={getVideo} onChange={(e) => setGetVideo(e.target.checked)} disabled={downloading} />} label="Download video" />
                      <FormControlLabel control={<Switch checked={getAudio} onChange={(e) => setGetAudio(e.target.checked)} disabled={downloading} />} label="Download audio" />
                      <FormControlLabel control={<Switch checked={getMerge} onChange={(e) => setGetMerge(e.target.checked)} disabled={downloading} />} label="Merge video and audio" />
                      {(getMerge) ? (
                        <FormControlLabel control={<Switch checked={getKeep} onChange={(e) => setGetKeep(e.target.checked)} disabled={downloading} />} label="Keep separate files" />
                      ) : ""}
                    </FormGroup>
                  </div>
                </div>
              </div>
            ) : ""
          }
        </div>
      </div>
      <div className="footer uncopyable pr-4 pb-4">
        <span className="text-xs text-gray-500"><span className="text-red-500 hover:font-bold" onClick={() => setDisclaimerOpen(true)}>Disclaimer</span> - Developed by Anventec (Anven)</span>
      </div>
      <Dialog open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)}>
          <DialogTitle>Disclaimer</DialogTitle>
          <DialogContent>
            <DialogContentText>
            <ul>
              <li>DLPal will not be held responsible for what end users do with downloaded content.</li>
              <li className="mt-2">DLPal do not own nor claim to own the rights to any of the content that end users can download.</li>
              <li className="mt-2">DLPal is not associated in any way with YouTube or Google LLC.</li>
              <li className="mt-2">YouTube is a registered trademark of Google LLC.</li>
              <li className="mt-2">DLPal is still a work in progress. Bugs are expected.</li>
            </ul>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisclaimerOpen(false)}>Close</Button>
          </DialogActions>
      </Dialog>
    </div>
  )
}

export default App