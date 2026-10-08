const { app, BrowserWindow, protocol, net, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const WWW = path.join(__dirname, 'www');

// Схема app:// нужна, чтобы fetch("demos/...") работал так же, как в APK
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#10151d',
    autoHideMenuBar: true,
    title: 'StructureLab',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Аналог кнопки «Назад» из Android: Esc закрывает окно справки
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(
      `document.addEventListener('keydown', e => {
         if (e.key === 'Escape' && typeof window.handleNativeBack === 'function') window.handleNativeBack();
       });`
    ).catch(() => {});
  });

  win.loadURL('app://local/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '' || rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // Сохранение файла через системный диалог (вместо AndroidBridge.saveFile)
  ipcMain.handle('save-file', async (event, name, mime, base64) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showSaveDialog(win, { defaultPath: name });
    if (res.canceled || !res.filePath) return 'отменено';
    await fs.promises.writeFile(res.filePath, Buffer.from(base64, 'base64'));
    return res.filePath;
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
