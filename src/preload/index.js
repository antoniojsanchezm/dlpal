import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { ipcRenderer } from "electron/renderer";

// Custom APIs for renderer
const api = {
  fetchData: (url) => ipcRenderer.invoke("fetchData", url),
  openDirectory: (path) => ipcRenderer.invoke("openDirectory", path),
  showItemInFolder: (path) => ipcRenderer.invoke("showItemInFolder", path),
  beginDownload: (queue) => ipcRenderer.invoke("beginDownload", queue),
  listenToMain: (event, callback) => ipcRenderer.on(event, (e, ...args) => callback(...args)),
  clearStore: () => ipcRenderer.invoke("clearStore"),
  openLink: (link) => ipcRenderer.invoke("openLink", link)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}