/**
 * Fills the winget + Scoop manifest templates in packaging/templates/ with the
 * current package.json version and the SHA-256 of the built NSIS installer.
 *
 * Usage:
 *   node scripts/generate-packaging-manifests.js [--installer <path>]
 *
 * Default installer path: ~/gamepilot-dist/GamePilot-Setup.exe (the output of
 * `npm run build-electron-win`).
 *
 * Output:
 *   packaging/winget/Moz.GamePilot/<version>/{version,installer,locale} manifests
 *   packaging/scoop/gamepilot.json
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = require(path.join(root, 'package.json'));

const parseArgs = (argv) => {
  const options = { installer: path.join(os.homedir(), 'gamepilot-dist', 'GamePilot-Setup.exe') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--installer' && argv[i + 1]) {
      options.installer = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--installer=')) {
      options.installer = arg.slice('--installer='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  options.installer = path.resolve(options.installer);
  return options;
};

const main = () => {
  const { installer } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(installer)) {
    console.error(`Installer not found: ${installer}`);
    console.error('Build it first (npm run build-electron-win) or pass --installer <path>.');
    process.exitCode = 1;
    return;
  }

  const version = manifest.version;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex').toUpperCase();
  const date = new Date().toISOString().slice(0, 10);
  const fill = (text) =>
    text.replaceAll('{VERSION}', version).replaceAll('{SHA256}', sha256).replaceAll('{DATE}', date);

  const templatesDir = path.join(root, 'packaging', 'templates');
  const written = [];

  const wingetOutDir = path.join(root, 'packaging', 'winget', 'Moz.GamePilot', version);
  fs.mkdirSync(wingetOutDir, { recursive: true });
  const wingetFiles = [
    'Moz.GamePilot.yaml',
    'Moz.GamePilot.installer.yaml',
    'Moz.GamePilot.locale.en-US.yaml',
  ];
  for (const name of wingetFiles) {
    const source = path.join(templatesDir, 'winget', name);
    const target = path.join(wingetOutDir, name);
    fs.writeFileSync(target, fill(fs.readFileSync(source, 'utf8')));
    written.push(target);
  }

  const scoopDir = path.join(root, 'packaging', 'scoop');
  fs.mkdirSync(scoopDir, { recursive: true });
  const scoopTarget = path.join(scoopDir, 'gamepilot.json');
  fs.writeFileSync(scoopTarget, fill(fs.readFileSync(path.join(templatesDir, 'scoop', 'gamepilot.json'), 'utf8')));
  written.push(scoopTarget);

  console.log(`GamePilot v${version} — installer SHA-256 ${sha256}`);
  written.forEach((file) => console.log(`  wrote ${path.relative(root, file)}`));
};

main();
