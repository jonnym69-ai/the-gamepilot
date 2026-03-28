const { app, BrowserWindow } = require('electron');

console.log('🔧 SIMPLE TEST - Electron starting...');

function createWindow() {
  console.log('🏗️ Creating simple test window...');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'TEST WINDOW - Can you see me?',
    show: true
  });
  
  console.log('📱 Window created, ID:', win.id);
  console.log('📱 Window visible:', win.isVisible());
  
  // Load a simple HTML page
  win.loadURL('data:text/html,<html><body style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; font-family: Arial; text-align: center; padding: 50px;"><h1>🎮 ELECTRON TEST WORKS! 🎮</h1><p>If you can see this, Electron is working!</p><p>Window ID: ' + win.id + '</p></body></html>');
  
  win.show();
  win.focus();
  win.center();
  
  console.log('📱 Window should be visible now!');
}

app.whenReady().then(() => {
  console.log('🚀 App ready, creating test window...');
  createWindow();
});

console.log('📱 Script loaded - waiting for app ready...');
