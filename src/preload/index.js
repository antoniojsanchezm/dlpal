import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron/renderer'

// Custom APIs for renderer
const api = {
  fetchData: (url) => ipcRenderer.invoke("fetchData", url),
  openDirectory: () => ipcRenderer.invoke("openDirectory"),
  beginDownload: (data) => ipcRenderer.invoke("beginDownload", data),
  listenToMain: (event, callback) => ipcRenderer.on(event, (e, ...args) => callback(...args)),
  clearStore: () => ipcRenderer.invoke("clearStore"),
  openLink: (link) => ipcRenderer.invoke("openLink", link)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
