const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Electron via Node...');

// Find electron executable
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
const electronCmd = process.platform === 'win32' ? electronPath + '.cmd' : electronPath;

console.log('📱 Electron path:', electronCmd);

// Spawn Electron process
const electronProcess = spawn(electronCmd, [path.join(__dirname, 'electron.js')], {
  stdio: 'inherit',
  shell: true
});

electronProcess.on('error', (error) => {
  console.error('❌ Failed to start Electron:', error);
});

electronProcess.on('close', (code) => {
  console.log(`📱 Electron process exited with code ${code}`);
});

console.log('🎮 Electron should be starting...');
