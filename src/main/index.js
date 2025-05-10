import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { beginDownload, fetchVideoData } from './lib';

function createWindow() {
  const main_window = new BrowserWindow({
    width: 900,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    menu: null,
    ...(["linux", "win32"].includes(process.platform) ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  main_window.on("ready-to-show", () => main_window.show());

  main_window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) main_window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  else main_window.loadFile(join(__dirname, "../renderer/index.html"));

  return main_window
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window));

  const window = createWindow();
  
  /**
   * Events between APP > NODE
   * Remember that functions here are treated as promises in app
   */

  const store = new Map();

  const sender = (...args) => window.webContents.send(...args);
  
  ipcMain.handle("fetchData", (e, url) => fetchVideoData(url, store));

  ipcMain.handle("beginDownload", (e, data) => beginDownload(data, store, sender, process.resourcesPath));

  ipcMain.handle("openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"]
    });

    if (canceled) return;
    else return filePaths[0];
  });
  
  ipcMain.handle("showItemInFolder", async (e, item) => {
    return shell.showItemInFolder(item);
  });

  ipcMain.handle("clearStore", () => store.clear());

  ipcMain.handle("openLink", (e, link) => shell.openExternal(link));

  // ---------------------

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});