const path = require('path');
const os = require('os');
const fs = require('fs');
const { getBuildConfig, buildEdition } = require('../build-edition');
const manifest = require('../package.json');

jest.mock('vite', () => ({ build: jest.fn().mockResolvedValue(undefined) }));
jest.mock('electron-builder', () => ({
  build: jest.fn().mockResolvedValue([]),
  Platform: {
    WINDOWS: { createTarget: jest.fn(() => 'windows-targets') },
    MAC: { createTarget: jest.fn(() => 'mac-targets') },
    LINUX: { createTarget: jest.fn(() => 'linux-targets') },
  },
}));

afterEach(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());

test('packaging keeps the existing application identity and runtime paths', () => {
  const config = getBuildConfig();
  expect(config.appId).toBe('com.gamepilot.app');
  expect(config.productName).toBe('GamePilot');
  expect(config.extraMetadata.main).toBe('electron.js');
  expect(config.nsis.deleteAppDataOnUninstall).toBe(false);
  expect(config.files).toContain('dist/renderer/**/*');
  expect(config.files.filter((entry) => typeof entry === 'object')).toEqual([]);
  expect(config.directories.output).toBe(path.join(os.homedir(), 'gamepilot-dist'));
});

test('a single installer is produced with a neutral name', () => {
  const config = getBuildConfig();
  expect(config.artifactName).toBe(`GamePilot-\${arch}.\${ext}`);
  expect(config.nsis.artifactName).toBe(`GamePilot-Setup.\${ext}`);
  expect(config.linux.artifactName).toBe(`GamePilot-\${arch}.\${ext}`);
  expect(config.artifactName).not.toMatch(/free|pro/i);
  expect(config.nsis.artifactName).not.toMatch(/free|pro/i);
});

test('packaging commands build the single edition', () => {
  expect(manifest.scripts['build-electron-win']).toBe('node build-edition.js win');
  expect(manifest.scripts['build-electron-linux']).toBe('node build-edition.js linux');
  expect(manifest.scripts.build).toBe('vite build');
  Object.values(manifest.scripts).forEach((script) => {
    expect(script).not.toMatch(/mode (free|pro)/);
  });
});

test('packaging builds the renderer first and never publishes', async () => {
  const vite = require('vite');
  const builder = require('electron-builder');
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ edition: 'standard', version: manifest.version }));
  await buildEdition('win');
  expect(vite.build).toHaveBeenCalledWith(
    expect.objectContaining({ root: expect.any(String), configFile: expect.any(String) })
  );
  expect(builder.build).toHaveBeenCalledWith(
    expect.objectContaining({
      publish: 'never',
      config: expect.objectContaining({ appId: 'com.gamepilot.app', productName: 'GamePilot' }),
    })
  );
  expect(vite.build.mock.invocationCallOrder[0]).toBeLessThan(builder.build.mock.invocationCallOrder[0]);
});

test('renderer build failure stops packaging', async () => {
  require('vite').build.mockRejectedValueOnce(new Error('Build failed'));
  await expect(buildEdition('win')).rejects.toThrow('Build failed');
  expect(require('electron-builder').build).not.toHaveBeenCalled();
});

test('mismatched renderer stamp stops packaging', async () => {
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ edition: 'standard', version: '0.0.0' }));
  await expect(buildEdition('win')).rejects.toThrow('Renderer version mismatch');
  expect(require('electron-builder').build).not.toHaveBeenCalled();
});

test('invalid platform stops before building', async () => {
  await expect(buildEdition('invalid')).rejects.toThrow('Platform must be');
  expect(require('vite').build).not.toHaveBeenCalled();
});
