import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is, } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { beginDownload, fetchVideoData } from './lib';
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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

  main_window.removeMenu();

  main_window.on("ready-to-show", () => main_window.show());

  main_window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) main_window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  else main_window.loadFile(join(__dirname, "../renderer/index.html"));

  return main_window
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.electron");

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window));

  const window = createWindow();
  
  /**
   * Events between APP > NODE
   * Remember that functions here are treated as promises in app
   */

  const store = new Map();

  const communicate = (...args) => window.webContents.send(...args);
  
  ipcMain.handle("fetchData", (e, url) => fetchVideoData(url, store));

  ipcMain.handle("beginDownload", (e, queue) => beginDownload(queue, store, communicate));

  ipcMain.handle("openDirectory", async (path) => {
    const options = {
      properties: ["openDirectory"]
    };

    // if (path) options.defaultPath = path;

    const { canceled, filePaths } = await dialog.showOpenDialog(window, options);

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

  // Automatic updates

  if (!is.dev) {
    autoUpdater.checkForUpdates();

    autoUpdater.on("update-available", (info) => {
      dialog.showMessageBox({
        type: "info",
        title: `Update available (${app.getVersion()} -> ${info.version})`,
        message: `A new version (${info.version}) of the app is available. Do you want to update now?`,
        buttons: ["Yes, update", "No, keep this version"],
      }).then(async (res) => {
        if (res.response === 0) await autoUpdater.downloadUpdate();
      });
    });

    autoUpdater.on("update-downloaded", (e) => {
      dialog.showMessageBox({
        type: "info",
        title: `Update downloaded successfully!`,
        message: `The update for the new version has been downloaded. Do you want to update now? This will close the app and your downloads will be canceled.`,
        buttons: ["Yes, close and update", "No, install on next launch"],
      }).then((res) => {
        if (res.response === 0) autoUpdater.quitAndInstall();
      });
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});