import { Button, TextField } from "@mui/material";
import { useContext, useState } from "react";
import { DLPalContext, videoDataReducerTypes, dataFetchTypes } from "../../contexts/DLPalContext";
import IconAndText from "../IconAndText";
import { faDownload, faLink, faListCheck, faPlus, faRepeat } from "@fortawesome/free-solid-svg-icons";
import isEmpty from "is-empty";

export default function URLSection() {
  const { data_fetch, dataFetchDispatch, downloading, queue, data, dataDispatch, setQueueOpen, edit_mode } = useContext(DLPalContext);

  const [first_fetch, setFirstFetch] = useState(false);

  return (
    <div className="flex items-center gap-5 w-full mt-1">
      <TextField className="w-3/5" size="small" label={<IconAndText icon={faLink} text="Video URL" />} variant="outlined" error={data_fetch.url.error} helperText={data_fetch.url.helperText} value={data_fetch.url.input} onChange={(e) => dataFetchDispatch({
        type: dataFetchTypes.SET_URL,
        input: e.target.value
      })} disabled={downloading || !isEmpty(data?.data) || data_fetch.loading} />
      {(!data_fetch.url.error && data_fetch.url.input?.length > 1) ? (
        <Button variant="contained" loading={data_fetch.loading} onClick={() => {
          dataFetchDispatch({
            type: dataFetchTypes.ON_LOADING
          });

          window.api.fetchData(data_fetch.url.input).then((data) => {
            dataFetchDispatch({
              type: dataFetchTypes.OFF_LOADING
            });

            if (data.error) {
              let error = "dlpal can not download this video";
              
              if (data.error.match(/private video/g)) error = "dlpal can not download private videos";

              return dataFetchDispatch({
                type: dataFetchTypes.FETCH_ERROR,
                error
              });
            } else {
              setFirstFetch(true);

              dataDispatch({
                type: videoDataReducerTypes.SET_DATA,
                data
              });

              if (isEmpty(data?.switches)) dataDispatch({
                type: videoDataReducerTypes.RESET_SWITCHES
              });

              dataDispatch({
                type: videoDataReducerTypes.SET_FORMATS,
                formats: {
                  video: data.formats.video[0].id,
                  audio: data.formats.audio[0].id
                }
              });
            }
          });
        }} disabled={downloading || (first_fetch && !isEmpty(data?.data))}>
          <IconAndText icon={faDownload} text="Fetch" />
        </Button>
      ) : ""}
      {(!isEmpty(data?.data)) ? (
        <>
          <Button variant="contained" color={(queue.length > 0) ? "success" : "error"} onClick={async () => {
            dataFetchDispatch({
              type: dataFetchTypes.SET_URL,
              input: ""
            });
            
            dataDispatch({
              type: videoDataReducerTypes.RESET_DATA
            });
          }} disabled={edit_mode || downloading}>
            <IconAndText icon={(queue.length > 0) ? faPlus : faRepeat} text={(queue.length > 0) ? "Add" : "Reset"} />
          </Button>
        </>
      ) : ""}
      {(queue.length > 0) ? (
        <div className={(data_fetch.url.error) ? "mb-6" : ""}>
          <Button variant="contained" color="secondary" onClick={() => setQueueOpen(true)}>
            <IconAndText icon={faListCheck} text={`Queue`} />
          </Button>
        </div>
      ) : ""}
    </div>
  );
}