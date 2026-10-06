const path = require('path');
const os = require('os');
const fs = require('fs');
const manifest = require('./package.json');

// Single-edition build: one installer, everything included.
function getBuildConfig() {
  const artifactName = 'GamePilot-${version}-${arch}.${ext}';
  return {
    ...manifest.build,
    artifactName,
    directories: { ...manifest.build.directories, output: path.join(os.homedir(), 'gamepilot-dist') },
    linux: { ...manifest.build.linux, artifactName },
    nsis: { ...manifest.build.nsis, artifactName: 'GamePilot-Setup-${version}.${ext}' },
  };
}

async function buildEdition(platform, unpacked = false) {
  const config = getBuildConfig();
  if (!['win', 'mac', 'linux'].includes(platform)) throw new Error('Platform must be win, mac or linux.');
  const { build } = require('vite');
  const builder = require('electron-builder');
  await build({ root: __dirname, configFile: path.join(__dirname, 'vite.config.js') });
  const stamp = JSON.parse(fs.readFileSync(path.join(__dirname, 'dist/renderer', 'edition.json'), 'utf8'));
  if (stamp.version !== manifest.version) {
    throw new Error('Renderer version mismatch. Packaging stopped.');
  }
  const targetPlatform = { win: builder.Platform.WINDOWS, mac: builder.Platform.MAC, linux: builder.Platform.LINUX }[
    platform
  ];
  return builder.build({
    projectDir: __dirname,
    config,
    targets: targetPlatform.createTarget(unpacked ? ['dir'] : undefined),
    publish: 'never',
  });
}

if (require.main === module) {
  const [platform = { win32: 'win', darwin: 'mac', linux: 'linux' }[process.platform], ...flags] =
    process.argv.slice(2);
  if (flags.some((flag) => flag !== '--dir')) {
    console.error('Only --dir is supported as an optional argument.');
    process.exitCode = 1;
  } else {
    buildEdition(platform, flags.includes('--dir')).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = { getBuildConfig, buildEdition };
