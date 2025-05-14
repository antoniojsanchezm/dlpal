import getVideoId from "get-video-id";
import { omit } from "lodash";
import { createContext, useEffect, useReducer, useState } from "react";

export const progress_colors = {
  primary: "144, 202, 249",
  secondary: "206, 147, 216",
  error: "244, 67, 54",
  warning: "255, 167, 38",
  info: "41, 182, 246",
  success: "102, 187, 106",
};

export const dataFetchErrors = {
  EMPTY_URL: "The URL can not be empty",
  WRONG_SERVICE: "dlpal only works with YouTube videos"
};

export const dataFetchTypes = {
  ON_LOADING: "on_loading",
  OFF_LOADING: "off_loading",
  SET_URL: "set_url",
  FETCH_ERROR: "fetch_error"
};

function dataFetchReducer(state, action) {
  const { type } = action;
  const { ON_LOADING, OFF_LOADING, SET_URL, FETCH_ERROR } = dataFetchTypes; // Destructuring the types for better readability
  const { EMPTY_URL, WRONG_SERVICE } = dataFetchErrors; // Destructuring errors for better readability

  if (type == ON_LOADING) return { ...state, loading: true };
  if (type == OFF_LOADING) return { ...state, loading: false };

  if (type == SET_URL) {
    const { input } = action;
    let error = false, helperText = false;

    if (!input || input.length < 1) {
      error = true;
      helperText = EMPTY_URL;
    } else {
      const validation = getVideoId(input);

      if (validation.service != "youtube") {
        error = true;
        helperText = WRONG_SERVICE;
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

  if (type == FETCH_ERROR) {
    const { error } = action;

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

export const queueDispatchTypes = {
  ADD: "add",
  DELETE: "delete",
  EDIT: "edit",
  PROGRESS: "progress",
  CLEAR: "clear"
};

function queueReducer(state, action) {
  const { type } = action;
  const { ADD, DELETE, EDIT, PROGRESS, CLEAR } = queueDispatchTypes; // Destructuring the types for better readability

  if (type == ADD) {
    const { payload } = action;

    return [...state, payload];
  }

  if (type == CLEAR) return [];

  if (type == EDIT) {
    const { id, payload } = action;

    const element = state.find((s) => s.data.id == id);

    if (element) {
      const excluded = state.filter((s) => s.data.id != id);

      const modified = [...excluded, {
        position: element.position,
        ...payload
      }];

      modified.sort((a, b) => a.position - b.position);

      return modified;
    }
  }

  if (type == PROGRESS) {
    const { id, progress } = action; 

    const element = state.find((s) => s.data.id == id);

    if (element) {
      const excluded = state.filter((s) => s.data.id != id);

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

    return state.filter((s) => s.data.id != id);
  }

  return state;
}

export const videoDataReducerTypes = {
  SET_SWITCHES: "set_switches",
  RESET_SWITCHES: "reset_switches",
  SET_FORMATS: "set_formats",
  SET_DATA: "set_data",
  RESET_DATA: "reset_data",
  SET_OPTIONS: "set_options",
  REPLACE: "replace",
  SET_LABELS: "set_labels"
};

const videoDataReducerDefaultSwitches = {
  video: true,
  audio: true,
  merge: true,
  keep_files: false,
  video_to_mp4: true,
  audio_to_mp3: true
};

function videoDataReducer(state, action) {
  const { type } = action;
  const { SET_SWITCHES, RESET_SWITCHES, SET_FORMATS, SET_DATA, RESET_DATA, SET_OPTIONS, REPLACE, SET_LABELS } = videoDataReducerTypes;

  if (type == REPLACE) {
    const { payload } = action;

    return omit(payload, ["progress", "position", "labels"]);
  }

  if (type == SET_SWITCHES) {
    const { switches } = action;

    return {
      ...state,
      switches: {
        ...state.switches,
        ...switches
      }
    };
  }
  
  if (type == RESET_SWITCHES) {
    return {
      ...state,
      switches: videoDataReducerDefaultSwitches
    };
  }
  
  if (type == SET_FORMATS) {
    const { formats } = action;

    return {
      ...state,
      formats: {
        ...state.formats,
        ...formats
      }
    };
  }

  if (type == SET_LABELS) {
    const { labels } = action;

    return {
      ...state,
      labels: {
        ...state.labels,
        ...labels
      }
    };
  }
  
  if (type == SET_DATA) {
    const { data } = action;

    return {
      ...state,
      data
    };
  }

  if (type == SET_OPTIONS) {
    const { options } = action;
    
    return {
      ...state,
      download: options
    };
  }

  if (type == RESET_DATA) return {};

  return state;
}

const log_reducers = false;

function logReducer(fn) {
  return (...args) => {
    if (log_reducers) console.log("BEFORE", args);

    const result = fn(...args);

    if (log_reducers) console.log("AFTER", result);

    return result;
  }; 
}

export const DLPalContext = createContext();

export default function DLPalContextProvider({ children }) {
  const [data_fetch, dataFetchDispatch] = useReducer(logReducer(dataFetchReducer), {
    loading: false,
    url: {
      input: "",
      error: true,
      helperText: dataFetchErrors.EMPTY_URL
    }
  });

  const [data, dataDispatch] = useReducer(logReducer(videoDataReducer), {});

  const [queue, queueDispatch] = useReducer(logReducer(queueReducer), []);
  const [queue_open, setQueueOpen] = useState(false);
  const [edit_mode, setEditMode] = useState(false);

  const [disclaimer_open, setDisclaimerOpen] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [first_render_made, setFirstRenderMade] = useState(false);

  const [show_toast, setShowToast] = useState(false);
  
  useEffect(() => {
    // TODO: Option for chapters
    // TODO: Option for playlists

    if (!first_render_made) { // Avoid event listener event leak (multiple listeners because of the re-rendering of React's strict mode)
      window.api.listenToMain("download_progress", (id, progress) => {
        queueDispatch({
          type: queueDispatchTypes.PROGRESS,
          id,
          progress
        });
      });

      window.api.listenToMain("finish_queue", (downloads) => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5 * 1000);

        setDownloading(false);
      });

      setFirstRenderMade(true);
    }
  }, []);
  
  return (
    <DLPalContext.Provider value={{
      data_fetch,
      dataFetchDispatch,
      data,
      dataDispatch,
      queue,
      queueDispatch,
      queue_open,
      setQueueOpen,
      edit_mode,
      setEditMode,
      downloading,
      setDownloading,
      disclaimer_open,
      setDisclaimerOpen,
      show_toast
    }}>
      {children}
    </DLPalContext.Provider>
  );
}