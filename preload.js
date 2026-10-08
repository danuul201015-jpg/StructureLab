const { contextBridge, ipcRenderer } = require('electron');

// app.js проверяет window.nativeSave(name, mime, base64) и ждёт путь файла
contextBridge.exposeInMainWorld('nativeSave', (name, mime, base64) =>
  ipcRenderer.invoke('save-file', name, mime, base64)
);
