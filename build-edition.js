const path = require('path');
const os = require('os');
const fs = require('fs');
const manifest = require('./package.json');

function getEditionBuildConfig(edition) {
  if (!['free', 'pro'].includes(edition)) throw new Error('Edition must be free or pro.');
  const label = edition === 'pro' ? 'Pro' : 'Free';
  const artifactName = `GamePilot-${label}-\${version}-\${arch}.\${ext}`;
  return {
    ...manifest.build,
    artifactName,
    extraMetadata: { ...manifest.build.extraMetadata, gamepilotEdition: edition },
    directories: { ...manifest.build.directories, output: path.join(os.homedir(), 'gamepilot-dist', edition) },
    files: [
      ...manifest.build.files.filter((pattern) => pattern !== 'dist/renderer/**/*'),
      { from: edition === 'pro' ? 'dist/renderer-pro' : 'dist/renderer', to: 'dist/renderer', filter: ['**/*'] },
    ],
    linux: { ...manifest.build.linux, artifactName },
    nsis: { ...manifest.build.nsis, artifactName: `GamePilot-${label}-Setup-\${version}.\${ext}` },
  };
}

async function buildEdition(edition, platform, unpacked = false) {
  const config = getEditionBuildConfig(edition);
  if (!['win', 'mac', 'linux'].includes(platform)) throw new Error('Platform must be win, mac or linux.');
  const { build } = require('vite');
  const builder = require('electron-builder');
  await build({ root: __dirname, configFile: path.join(__dirname, 'vite.config.js'), mode: edition });
  const renderer = config.files[config.files.length - 1].from;
  const stamp = JSON.parse(fs.readFileSync(path.join(__dirname, renderer, 'edition.json'), 'utf8'));
  if (stamp.edition !== edition || stamp.version !== manifest.version) {
    throw new Error('Renderer edition/version mismatch. Packaging stopped.');
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
  const [edition = 'free', platform = { win32: 'win', darwin: 'mac', linux: 'linux' }[process.platform], ...flags] =
    process.argv.slice(2);
  if (flags.some((flag) => flag !== '--dir')) {
    console.error('Only --dir is supported as an optional argument.');
    process.exitCode = 1;
  } else {
    buildEdition(edition, platform, flags.includes('--dir')).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = { getEditionBuildConfig, buildEdition };
