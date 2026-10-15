const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const expandEnvPath = (candidate) =>
  String(candidate || '').replace(/%([^%]+)%/g, (match, key) => process.env[key] || match);

const dirName = (filePath) => {
  try {
    return path.dirname(filePath);
  } catch (error) {
    return '';
  }
};

// Known emulators: exe names for detection + which consoles they cover. Paths
// are checked with env-var expansion; the generic root scan (Desktop,
// Downloads, C:\Emulators, Program Files — one level deep) catches portable
// installs that don't live in a canonical location.
const EMULATOR_DEFS = [
  {
    key: 'retroarch',
    label: 'RetroArch',
    exes: ['retroarch.exe'],
    locations: [
      '%LOCALAPPDATA%\\RetroArch',
      '%ProgramFiles%\\RetroArch',
      '%ProgramFiles(x86)%\\RetroArch',
      'C:\\RetroArch',
      'C:\\RetroArch-Win64',
    ],
    platforms: [
      'NES',
      'SNES',
      'Nintendo 64',
      'GameCube',
      'Wii',
      'Game Boy',
      'Game Boy Color',
      'Game Boy Advance',
      'Nintendo DS',
      'PlayStation',
      'PSP',
      'Sega Genesis',
      'Master System',
      'Game Gear',
      'Saturn',
      'Dreamcast',
      'PC Engine',
      'Arcade',
    ],
    saveDirs: [
      { dir: 'saves', type: 'save', label: 'RetroArch saves (SRAM)' },
      { dir: 'states', type: 'state', label: 'RetroArch savestates' },
    ],
  },
  {
    key: 'duckstation',
    label: 'DuckStation',
    exes: ['duckstation.exe', 'duckstation-qt-x64-releaseltcg.exe', 'duckstation-nogui-x64-releaseltcg.exe'],
    locations: [],
    docDirs: ['DuckStation'],
    platforms: ['PlayStation'],
    saveDirs: [
      { dir: 'savestates', type: 'state', label: 'DuckStation savestates' },
      { dir: 'memcards', type: 'save', label: 'DuckStation memory cards' },
    ],
  },
  {
    key: 'pcsx2',
    label: 'PCSX2',
    exes: ['pcsx2.exe', 'pcsx2-qtx64-avx2.exe', 'pcsx2x64-avx2.exe'],
    locations: ['%ProgramFiles%\\PCSX2', '%ProgramFiles(x86)%\\PCSX2'],
    docDirs: ['PCSX2'],
    platforms: ['PlayStation 2'],
    saveDirs: [
      { dir: 'sstates', type: 'state', label: 'PCSX2 savestates' },
      { dir: 'memcards', type: 'save', label: 'PCSX2 memory cards' },
    ],
  },
  {
    key: 'rpcs3',
    label: 'RPCS3',
    exes: ['rpcs3.exe'],
    locations: [],
    platforms: ['PlayStation 3'],
    saveDirs: [{ dir: 'dev_hdd0\\home', type: 'save', label: 'RPCS3 savedata (all users)' }],
  },
  {
    key: 'ppsspp',
    label: 'PPSSPP',
    exes: ['ppssppwindows.exe', 'ppssppwindows64.exe', 'ppsspp.exe'],
    locations: ['%ProgramFiles%\\PPSSPP'],
    platforms: ['PSP'],
    saveDirs: [
      { dir: 'memstick\\PSP\\SAVEDATA', type: 'save', label: 'PPSSPP savedata' },
      { dir: 'memstick\\PSP\\PPSSPP_STATE', type: 'state', label: 'PPSSPP savestates' },
    ],
  },
  {
    key: 'dolphin',
    label: 'Dolphin',
    exes: ['dolphin.exe'],
    locations: ['%ProgramFiles%\\Dolphin', '%ProgramFiles(x86)%\\Dolphin'],
    docDirs: ['Dolphin Emulator'],
    platforms: ['GameCube', 'Wii'],
    saveDirs: [
      { dir: 'GC', type: 'save', label: 'Dolphin GameCube memory cards' },
      { dir: 'Wii', type: 'save', label: 'Dolphin Wii saves' },
      { dir: 'StateSaves', type: 'state', label: 'Dolphin savestates' },
    ],
  },
  {
    key: 'mgba',
    label: 'mGBA',
    exes: ['mgba.exe'],
    locations: [],
    platforms: ['Game Boy', 'Game Boy Color', 'Game Boy Advance'],
    saveDirs: [{ dir: 'saves', type: 'save', label: 'mGBA saves/snapshots' }],
    romAdjacentSaves: true,
  },
  {
    key: 'project64',
    label: 'Project64',
    exes: ['project64.exe'],
    locations: [],
    platforms: ['Nintendo 64'],
    saveDirs: [{ dir: 'Save', type: 'save', label: 'Project64 saves/states' }],
  },
  {
    key: 'snes9x',
    label: 'Snes9x',
    exes: ['snes9x.exe', 'snes9x-x64.exe'],
    locations: [],
    platforms: ['SNES'],
    saveDirs: [
      { dir: 'Saves', type: 'save', label: 'Snes9x saves' },
      { dir: 'SaveStates', type: 'state', label: 'Snes9x savestates' },
    ],
  },
  {
    key: 'visualboyadvance',
    label: 'VisualBoyAdvance',
    exes: ['visualboyadvance.exe', 'vba-m.exe', 'visualboyadvance-m.exe'],
    locations: [],
    platforms: ['Game Boy', 'Game Boy Color', 'Game Boy Advance'],
    saveDirs: [{ dir: 'save', type: 'save', label: 'VBA saves' }],
    romAdjacentSaves: true,
  },
  {
    key: 'desmume',
    label: 'DeSmuME',
    exes: ['desmume.exe'],
    locations: [],
    platforms: ['Nintendo DS'],
    saveDirs: [
      { dir: 'Battery', type: 'save', label: 'DeSmuME battery saves' },
      { dir: 'States', type: 'state', label: 'DeSmuME savestates' },
    ],
  },
  {
    key: 'citra',
    label: 'Citra',
    exes: ['citra.exe', 'citra-qt.exe'],
    locations: [],
    appdataDirs: ['Citra'],
    platforms: ['Nintendo 3DS'],
    saveDirs: [{ dir: 'sdmc', type: 'save', label: 'Citra emulated SD card (saves)' }],
  },
  {
    key: 'ryujinx',
    label: 'Ryujinx',
    exes: ['ryujinx.exe'],
    locations: [],
    appdataDirs: ['Ryujinx'],
    platforms: ['Nintendo Switch'],
    saveDirs: [{ dir: 'bis\\user\\save', type: 'save', label: 'Ryujinx savedata' }],
  },
  {
    key: 'fusion',
    label: 'Kega Fusion',
    exes: ['fusion.exe'],
    locations: [],
    platforms: ['Sega Genesis', 'Master System', 'Game Gear'],
    saveDirs: [{ dir: 'Saves', type: 'save', label: 'Fusion saves/states' }],
    romAdjacentSaves: true,
  },
];

// Consoles that need BIOS/firmware files to boot. `matchers` are regexes for
// acceptable filenames; `required: false` means "works without, plays better
// with". Dirs are checked relative to the emulator exe plus known
// Documents/AppData dirs.
const BIOS_TABLE = {
  PlayStation: {
    required: true,
    dirs: ['system', 'bios'],
    matchers: [/^scph-?\d+\.(bin|rom)$/i, /^psxonpsp660\.bin$/i, /^bios.*\.bin$/i],
    hint: "PS1 BIOS (e.g. scph1001.bin / scph5501.bin) in the emulator's system/ or bios/ folder",
  },
  'PlayStation 2': {
    required: true,
    dirs: ['bios'],
    matchers: [/^(scph|ps2|pch)[\w-]*\.(bin|rom0|rom1|rom2|erom|nvm)$/i],
    hint: "PS2 BIOS files in the emulator's bios/ folder",
  },
  'Nintendo 3DS': {
    required: true,
    dirs: ['firmware', 'sdmc', 'nand', 'sysdata'],
    matchers: [/^aes_keys\.txt$/i, /^seeddb\.bin$/i, /^shared_font\.bin$/i],
    hint: '3DS firmware/keys (aes_keys.txt, seeddb.bin, shared_font.bin) in the emulator data folder',
  },
  'Nintendo DS': {
    required: false,
    dirs: ['firmware', 'bios', 'system'],
    matchers: [/^bios7\.bin$/i, /^bios9\.bin$/i, /^firmware\.bin$/i],
    hint: 'DS BIOS (bios7.bin, bios9.bin, firmware.bin) — optional but improves compatibility',
  },
  'Game Boy Advance': {
    required: false,
    dirs: ['system', 'bios'],
    matchers: [/^gba_bios\.bin$/i],
    hint: 'gba_bios.bin — optional but improves accuracy on some cores/emulators',
  },
  Saturn: {
    required: true,
    dirs: ['system', 'bios'],
    matchers: [/^saturn.*\.bin$/i, /^sega_101\.bin$/i, /^mpr-.*\.bin$/i, /^stvbios\.bin$/i],
    hint: "Saturn BIOS (e.g. saturn_bios.bin / mpr-17933.bin) in the emulator's system/ or bios/ folder",
  },
  Dreamcast: {
    required: true,
    dirs: ['system', 'system\\dc', 'bios'],
    matchers: [/^dc_boot\.bin$/i, /^boot\.bin$/i],
    hint: "Dreamcast BIOS (dc_boot.bin + dc_flash.bin) in the emulator's system/ folder",
  },
};

const emulatorKeyForPath = (emulatorPath) => {
  const exeName = path.basename(String(emulatorPath || '')).toLowerCase();
  const match = EMULATOR_DEFS.find((def) => def.exes.includes(exeName));
  return match?.key || null;
};

const userDir = (name) => {
  try {
    return app?.getPath ? app.getPath(name) : '';
  } catch (error) {
    return '';
  }
};

// Extra data dirs for emulators that live in Documents/AppData rather than
// next to the exe (Dolphin, PCSX2, DuckStation, Citra, Ryujinx).
const emulatorDataRoots = (def, emuDir) => {
  const roots = [emuDir];
  (def?.docDirs || []).forEach((sub) => {
    const documents = userDir('documents');
    if (documents) roots.push(path.join(documents, sub));
  });
  (def?.appdataDirs || []).forEach((sub) => {
    const appData = process.env.APPDATA;
    if (appData) roots.push(path.join(appData, sub));
  });
  return roots.filter(Boolean);
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('choose-emulator-executable', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Choose emulator executable',
        properties: ['openFile'],
        filters: [
          { name: 'Executable Files', extensions: ['exe', 'bat', 'cmd'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      return result.canceled ? null : result.filePaths?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to choose emulator executable:', error);
      return null;
    }
  });

  ipcMain.handle('choose-rom-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Choose ROM folder',
        properties: ['openDirectory'],
      });

      return result.canceled ? null : result.filePaths?.[0] || null;
    } catch (error) {
      console.error('❌ Failed to choose ROM folder:', error);
      return null;
    }
  });

  ipcMain.handle('scan-emulator-roms', async (_event, payload = {}) => {
    const romFolder = String(payload?.romFolder || '').trim();
    const extensions = new Set(
      (Array.isArray(payload?.extensions) ? payload.extensions : [])
        .map((extension) =>
          String(extension || '')
            .replace(/^\./, '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );

    if (!romFolder || !fs.existsSync(romFolder)) {
      return [];
    }

    const roms = [];
    const maxFiles = 5000;

    const scanDirectory = (currentPath, depth = 0) => {
      if (depth > 3 || roms.length >= maxFiles) {
        return;
      }

      let entries = [];
      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch (error) {
        return;
      }

      entries.forEach((entry) => {
        if (roms.length >= maxFiles) {
          return;
        }

        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(entryPath, depth + 1);
          return;
        }

        if (!entry.isFile()) {
          return;
        }

        const extension = path.extname(entry.name).replace(/^\./, '').toLowerCase();
        if (extensions.size > 0 && !extensions.has(extension)) {
          return;
        }

        roms.push({
          name: entry.name,
          fileName: entry.name,
          path: entryPath,
          extension,
        });
      });
    };

    scanDirectory(romFolder);
    return roms;
  });

  // Detect installed emulators by checking canonical locations plus a bounded
  // one-level scan of common roots (Desktop, Downloads, C:\Emulators).
  ipcMain.handle('detect-emulators', async () => {
    const found = [];
    const seen = new Set();

    const record = (def, exePath) => {
      const resolved = path.normalize(exePath);
      const key = `${def.key}:${resolved.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      found.push({
        key: def.key,
        name: def.label,
        emulatorPath: resolved,
        platforms: def.platforms,
      });
    };

    EMULATOR_DEFS.forEach((def) => {
      (def.locations || []).forEach((location) => {
        const dir = expandEnvPath(location);
        def.exes.forEach((exe) => {
          const exePath = path.join(dir, exe);
          try {
            if (fs.existsSync(exePath)) record(def, exePath);
          } catch (error) {
            /* ignore unreadable paths */
          }
        });
      });
    });

    const roots = [
      userDir('desktop'),
      userDir('downloads'),
      'C:\\Emulators',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
    ].filter(Boolean);
    roots.forEach((root) => {
      let entries = [];
      try {
        entries = fs.readdirSync(root, { withFileTypes: true });
      } catch (error) {
        return;
      }
      const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name));
      // Include the root itself too — some users drop exes straight on the Desktop.
      [root, ...dirs].forEach((dir) => {
        EMULATOR_DEFS.forEach((def) => {
          def.exes.forEach((exe) => {
            const exePath = path.join(dir, exe);
            try {
              if (fs.existsSync(exePath)) record(def, exePath);
            } catch (error) {
              /* ignore */
            }
          });
        });
      });
    });

    return found;
  });

  // BIOS/firmware check for a profile. Payload: { emulatorPath, consolePlatform,
  // customBiosDirs?: [] }. Returns { platform, required, ok, found, missing,
  // checkedDirs, hint } — advisory only; the renderer decides how to surface it.
  ipcMain.handle('emulator-bios-check', async (_event, payload = {}) => {
    const platform = String(payload?.consolePlatform || '').trim();
    const spec = BIOS_TABLE[platform];
    if (!spec) {
      return { platform, required: false, ok: true, found: [], missing: [], checkedDirs: [], hint: '' };
    }

    const emuDir = dirName(payload?.emulatorPath);
    const def = EMULATOR_DEFS.find((entry) => entry.key === emulatorKeyForPath(payload?.emulatorPath));
    const roots = emuDir ? emulatorDataRoots(def, emuDir) : [];
    const checkedDirs = [
      ...roots.flatMap((root) => spec.dirs.map((sub) => path.join(root, sub))),
      ...(Array.isArray(payload?.customBiosDirs) ? payload.customBiosDirs : []).map(String).filter(Boolean),
    ];

    const found = [];
    checkedDirs.forEach((dir) => {
      let names = [];
      try {
        names = fs.readdirSync(dir);
      } catch (error) {
        return;
      }
      names.forEach((name) => {
        if (spec.matchers.some((matcher) => matcher.test(name))) {
          found.push(path.join(dir, name));
        }
      });
    });

    return {
      platform,
      required: Boolean(spec.required),
      ok: found.length > 0,
      found,
      missing: found.length === 0,
      checkedDirs,
      hint: spec.hint || '',
    };
  });

  // Resolve save/savestate candidate dirs for an emulator install. Payload:
  // { emulatorPath, consolePlatform }. Returns labelled locations with exists
  // flags for SaveManager to back up, plus a note for rom-adjacent savers.
  ipcMain.handle('emulator-save-paths', async (_event, payload = {}) => {
    const emuDir = dirName(payload?.emulatorPath);
    const def = EMULATOR_DEFS.find((entry) => entry.key === emulatorKeyForPath(payload?.emulatorPath));
    if (!emuDir) return { locations: [], note: 'No emulator executable configured.' };

    const roots = emuDir ? emulatorDataRoots(def, emuDir) : [];
    const locations = [];
    const addLocation = (dir, type, label) => {
      const resolved = path.normalize(dir);
      if (locations.some((location) => location.path.toLowerCase() === resolved.toLowerCase())) return;
      let exists = false;
      try {
        exists = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
      } catch (error) {
        exists = false;
      }
      locations.push({
        id: `emulator-${type}-${resolved.toLowerCase()}`,
        type,
        source: 'emulator',
        label,
        rawPath: resolved,
        path: resolved,
        resolvedPath: resolved,
        exists,
        canOpen: exists,
      });
    };

    (def?.saveDirs || []).forEach(({ dir, type, label }) => {
      roots.forEach((root) => addLocation(path.join(root, dir), type, label));
    });
    // Generic fallbacks for unknown emulators so manual/custom installs still
    // get a shot at save coverage.
    if (!def) {
      ['saves', 'states', 'savestates', 'memcards'].forEach((dir) => {
        addLocation(path.join(emuDir, dir), dir === 'saves' ? 'save' : 'state', `Emulator ${dir}/`);
      });
    }

    return {
      locations,
      note: def?.romAdjacentSaves
        ? 'This emulator can also store .sav files next to your ROMs — those are not covered by a folder backup.'
        : '',
    };
  });
}

module.exports = { registerIpcHandlers };
