import { useContext } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import IconAndText from "../IconAndText";
import { DLPalContext, progress_colors, queueDispatchTypes, videoDataReducerTypes } from "../../contexts/DLPalContext";
import { faCheckCircle, faClock, faFileDownload, faList, faListCheck, faPencil, faRepeat, faTimes, faTrash, faVideo, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import truncate from "truncate";
import { omit } from "lodash";

export default function QueueDialog() {
  const { queue_open, setQueueOpen, queue, queueDispatch, downloading, setDownloading, edit_mode, setEditMode, dataDispatch } = useContext(DLPalContext);

  return (
    <Dialog fullScreen open={queue_open} onClose={() => setQueueOpen(false)}>
      <DialogTitle className="bg-[#020617]">
        <IconAndText icon={faListCheck} text="Queue" />
        <div className="flex items-center gap-4 text-gray-400 text-sm mt-2.5">
          <div>
            <IconAndText icon={faClock} text={"Pending: " + queue.filter((q) => !q.progress || (q.progress?.value && !q.progress?.completed)).length} />
          </div>
          <div>
            <IconAndText icon={faCheckCircle} text={"Completed: " + queue.filter((q) => q.progress?.completed).length} />
          </div>
          <div>
            <IconAndText icon={faList} text={"Total: " + queue.length} />
          </div>
        </div>
      </DialogTitle>
      <DialogContent className="bg-[#020617]">
        <div className="flex flex-col gap-2">
          {(queue.length > 0) ? queue.map((element) => {
            let progress = 0, color = progress_colors.success, styles = {};

            if (element.progress) {
              if (!element.progress.completed && element.progress.value && element.progress.color) {
                color = progress_colors[element.progress.color];
                progress = element.progress.value.toFixed(0);
                styles.background = `linear-gradient(90deg, rgba(${color}, 0.55) ${progress}%, rgba(74, 85, 101, 1) 0%)`;
              }
            }

            return (
              <div key={element.data.id}>
                <div className={`flex items-center ${(element.progress?.completed) ? "bg-green-900 hover:bg-green-800" : "bg-gray-600"} text-white p-3 rounded-lg`} style={styles}>
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-4 text-xl text-white">
                        {(!downloading) ? (
                          <>
                            {(!element.progress?.completed && !edit_mode) ? (
                              <FontAwesomeIcon className="hover:text-gray-400" icon={faPencil} onClick={() => {
                                setEditMode(true);

                                dataDispatch({
                                  type: videoDataReducerTypes.REPLACE,
                                  payload: element
                                });

                                setQueueOpen(false);
                              }} />
                            ) : "" }
                            <FontAwesomeIcon className="hover:text-gray-400" icon={faTrash} onClick={() => {
                              if (queue.length == 1) setQueueOpen(false);

                              queueDispatch({
                                type: queueDispatchTypes.DELETE,
                                id: element.data.id
                              });
                            }} />
                          </>
                        ) : ""}
                      </div>
                      <div className="flex items-center gap-4" onClick={async () => {
                        if (element.progress?.completed && element.progress?.saved_at) {
                          await window.api.showItemInFolder(element.progress.saved_at);
                        }
                      }}>
                        <img src={element.data.thumbnail} className="rounded-xl w-28 uncopyable" alt="Video thumbnail" />
                        <div className="grid grid-cols-2 gap-6 uncopyable">
                          <div className="flex items-center">
                            <span className="text-sm">
                              {truncate(element.data.title, 100)}
                              &nbsp;&nbsp;
                              {(element.progress) ? (element.progress.completed) ? (
                                <FontAwesomeIcon icon={faCheckCircle} />
                              ) : (element.progress.value) ? (
                                <span className="font-bold">{element.progress?.action}:&nbsp;&nbsp;{element.progress?.value.toFixed(0)}%</span>
                              ) : "" : ""}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <div className="flex flex-col text-gray-400 text-sm">
                              {(element.switches?.video) ? (
                                <div>
                                  <IconAndText icon={faVideo} text={element.labels?.video} />
                                </div>
                              ) : ""}
                              {(element.switches?.audio) ? (
                                <div>
                                  <IconAndText icon={faVolumeHigh} text={element.labels?.audio} />
                                </div>
                              ) : ""}
                              <div className="flex items-center gap-2 text-xs">
                                {(element.switches?.video && !element.switches?.audio) ? <span>Only video</span> : ""}
                                {(element.switches?.audio && !element.switches?.video) ? <span>Only audio</span> : ""}
                                {(element.switches?.merge) ? <span>Merge</span> : ""}
                                {(element.switches?.keep_files) ? <span>Keep files</span> : ""}
                                {(element.switches?.video_to_mp4) ? <span>Video to MP4</span> : ""}
                                {(element.switches?.audio_to_mp3) ? <span>Audio to MP3</span> : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : ""}
        </div>
      </DialogContent>
      <DialogActions className="bg-[#020617]">
          <Button color="error" onClick={() => {
            setQueueOpen(false);
            
            queueDispatch({
              type: queueDispatchTypes.CLEAR
            });
          }} disabled={downloading}><IconAndText icon={faRepeat} text="Clear queue" /></Button>
          <Button color="success" onClick={() => {
            setDownloading(true);
            window.api.beginDownload(queue.filter((q) => !(q.progress && q.progress.completed)).map((q) => omit(q, ["progress", "labels"])));
          }} disabled={downloading}><IconAndText icon={faFileDownload} text="Begin download" /></Button>
          <Button onClick={() => setQueueOpen(false)}><IconAndText icon={faTimes} text="Close" /></Button>
      </DialogActions>
  </Dialog>
  );
}