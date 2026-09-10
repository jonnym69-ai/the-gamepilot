/**
 * Window manager: creates and tracks the main BrowserWindow and the
 * game-bar overlay window. Exports getters so other modules can
 * reference the current main window without holding a direct reference.
 */

const { app, BrowserWindow, shell, Menu, powerMonitor } = require('electron');
const path = require('path');

let mainWindow = null;
let gameBarWindow = null;

const getMainWindow = () => mainWindow;
const getGameBarWindow = () => gameBarWindow;

function createGameBarOverlayWindow() {
  if (gameBarWindow && !gameBarWindow.isDestroyed()) {
    gameBarWindow.focus();
    return;
  }

  gameBarWindow = new BrowserWindow({
    width: 320,
    height: 120,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'public', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  gameBarWindow.loadURL(
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/#/gamebar'
      : `file://${path.join(__dirname, '..', 'dist', 'renderer', 'index.html')}#/gamebar`
  );

  gameBarWindow.once('ready-to-show', () => {
    gameBarWindow.show();
  });

  gameBarWindow.on('closed', () => {
    gameBarWindow = null;
  });
}

function createWindow(deps = {}) {
  const { onWindowClosed } = deps;

  console.log('🏗️ Creating Electron window...');

  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'GamePilot',
      webPreferences: {
        preload: path.join(__dirname, '..', 'public', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
      show: true,
    });

    console.log('📱 Window created successfully, ID:', mainWindow.id);

    mainWindow.loadURL(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '..', 'dist', 'renderer', 'index.html')}`
    );

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url).catch((error) => console.error('Failed to open external window URL:', error));
      }
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      const developmentOrigin = 'http://localhost:3000';
      const isAllowedNavigation =
        process.env.NODE_ENV === 'development' ? url.startsWith(developmentOrigin) : url.startsWith('file://');
      if (!isAllowedNavigation) {
        event.preventDefault();
      }
    });

    mainWindow.webContents.on('console-message', (_event, _level, message) => {
      if (typeof message === 'string' && message.includes('[PERF]')) {
        console.log(message);
      }
    });

    mainWindow.on('ready-to-show', () => {
      console.log('🎯 Window ready to show');
      mainWindow.show();
    });

    mainWindow.on('closed', () => {
      console.log('❌ Main window closed');
      if (typeof onWindowClosed === 'function') {
        onWindowClosed();
      }
      mainWindow = null;
    });

    // Notify renderer when the system is shutting down so it can end
    // active sessions before the process is killed.
    powerMonitor.on('shutdown', () => {
      console.log('⚡ System shutdown imminent — notifying renderer to end sessions');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-shutdown');
      }
    });

    // Set up application menu
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (error) {
    console.error('❌ Error creating window:', error);
    console.error('❌ Error stack:', error.stack);
    process.exit(1);
  }
}

module.exports = {
  getMainWindow,
  getGameBarWindow,
  createWindow,
  createGameBarOverlayWindow,
};
