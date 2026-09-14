const path = require('path');
const os = require('os');
const fs = require('fs');
const { getEditionBuildConfig, buildEdition } = require('../build-edition');
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

test.each(['free', 'pro'])('%s packaging keeps the existing application identity and runtime paths', (edition) => {
  const config = getEditionBuildConfig(edition);
  expect(config.appId).toBe('com.gamepilot.app');
  expect(config.productName).toBe('GamePilot');
  expect(config.extraMetadata.main).toBe('electron.js');
  expect(config.extraMetadata.gamepilotEdition).toBe(edition);
  expect(config.nsis.deleteAppDataOnUninstall).toBe(false);
  expect(config.files.filter((entry) => typeof entry === 'object')).toEqual([
    {
      from: edition === 'pro' ? 'dist/renderer-pro' : 'dist/renderer',
      to: 'dist/renderer',
      filter: ['**/*'],
    },
  ]);
  expect(config.files).not.toContain('dist/renderer/**/*');
  expect(config.directories.output).toBe(path.join(os.homedir(), 'gamepilot-dist', edition));
});

test('editions have separate output directories and clearly named artifacts', () => {
  const free = getEditionBuildConfig('free');
  const pro = getEditionBuildConfig('pro');
  expect(free.directories.output).not.toBe(pro.directories.output);
  expect(free.nsis.artifactName).toBe(`GamePilot-Free-Setup-\${version}.\${ext}`);
  expect(pro.nsis.artifactName).toBe(`GamePilot-Pro-Setup-\${version}.\${ext}`);
  expect(free.linux.artifactName).not.toBe(pro.linux.artifactName);
});

test.each(['', 'PRO', 'basic', '../pro', undefined])('invalid edition %s is rejected', (edition) => {
  expect(() => getEditionBuildConfig(edition)).toThrow('Edition must be free or pro.');
});

test('default packaging commands explicitly build Free', () => {
  expect(manifest.scripts['build-electron-win']).toBe('node build-edition.js free win');
  expect(manifest.scripts['build-electron-linux']).toBe('node build-edition.js free linux');
  expect(manifest.scripts.build).toBe('vite build --mode free');
});

test.each(['free', 'pro'])('%s packaging builds its renderer first and never publishes', async (edition) => {
  const vite = require('vite');
  const builder = require('electron-builder');
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ edition, version: manifest.version }));
  await buildEdition(edition, 'win');
  expect(vite.build).toHaveBeenCalledWith(expect.objectContaining({ mode: edition }));
  expect(builder.build).toHaveBeenCalledWith(
    expect.objectContaining({
      publish: 'never',
      config: expect.objectContaining({ extraMetadata: expect.objectContaining({ gamepilotEdition: edition }) }),
    })
  );
  expect(vite.build.mock.invocationCallOrder[0]).toBeLessThan(builder.build.mock.invocationCallOrder[0]);
});

test('renderer build failure stops packaging', async () => {
  require('vite').build.mockRejectedValueOnce(new Error('Build failed'));
  await expect(buildEdition('pro', 'win')).rejects.toThrow('Build failed');
  expect(require('electron-builder').build).not.toHaveBeenCalled();
});

test.each([
  { edition: 'free', version: manifest.version },
  { edition: 'pro', version: '0.0.0' },
])('mismatched renderer stamp stops Pro packaging', async (stamp) => {
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(stamp));
  await expect(buildEdition('pro', 'win')).rejects.toThrow('Renderer edition/version mismatch');
  expect(require('electron-builder').build).not.toHaveBeenCalled();
});

test('invalid platform stops before building', async () => {
  await expect(buildEdition('free', 'invalid')).rejects.toThrow('Platform must be');
  expect(require('vite').build).not.toHaveBeenCalled();
});
