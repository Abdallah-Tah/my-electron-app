const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  updateRecords: (callback) => ipcRenderer.on("update-records", callback),
  updateStatus: (callback) => ipcRenderer.on("update-status", callback),
  reprint: (id) => ipcRenderer.send("reprint", id),
});
