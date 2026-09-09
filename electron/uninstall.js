const { shell } = require('electron');
const { execFile: childExecFile } = require('child_process');

// Build the safest possible uninstall plan per platform. We always prefer
// the launcher's own deeplink because it leaves cloud saves, registry, and
// per-launcher metadata in a clean state. Programs & Features is the
// universal fallback for anything we can't identify.
function buildUninstallPlan(game) {
  const platform = String(game?.platform || '').toLowerCase();
  const appid = String(game?.appid || '').trim();
  const launchId = String(game?.launchId || '').trim();
  const installDir = String(game?.installDir || '').trim();

  if (platform === 'steam' && appid) {
    return {
      method: 'deeplink',
      url: `steam://uninstall/${appid}`,
      label: 'Steam',
      message:
        'Steam will open its built-in uninstall confirmation. Cloud saves and Steam Workshop subscriptions are preserved.',
    };
  }
  if ((platform === 'epic' || platform === 'epic games') && launchId) {
    return {
      method: 'deeplink',
      url: `com.epicgames.launcher://apps/${launchId}?action=launch`,
      label: 'Epic Games Launcher',
      message:
        'Epic Games Launcher will open this game. Click ⋮ → Uninstall to remove it. Cloud saves are preserved on your Epic account.',
    };
  }
  if (platform === 'gog' || platform === 'gog galaxy') {
    if (appid) {
      return {
        method: 'deeplink',
        url: `goggalaxy://openGameView/${appid}`,
        label: 'GOG Galaxy',
        message:
          'GOG Galaxy will open this game. Use the “⋮ → Manage Installation → Uninstall” option to remove it cleanly.',
      };
    }
  }
  if (platform === 'ea' || platform === 'origin') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'EA / Programs & Features',
      message:
        'EA App handles uninstalls through Windows Programs & Features. The list will open — find the title and select Uninstall.',
    };
  }
  if (platform === 'ubisoft' || platform === 'uplay' || platform === 'ubisoft connect') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Ubisoft / Programs & Features',
      message: 'Open Ubisoft Connect → Library → Game → ⋮ → Uninstall, or remove it from Programs & Features.',
    };
  }
  if (platform === 'battle.net' || platform === 'blizzard') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Battle.net / Programs & Features',
      message: 'Use Battle.net → Game → ⚙ Settings (cog) → Uninstall, or remove via Programs & Features.',
    };
  }
  if (platform === 'xbox' || platform === 'microsoft store' || platform === 'microsoft') {
    return {
      method: 'deeplink',
      url: 'ms-settings:appsfeatures',
      label: 'Apps & Features',
      message:
        'Windows opens Apps & Features. Locate the game and choose Uninstall — the Xbox app does not own the package directly.',
    };
  }
  if (platform === 'rockstar' || platform === 'rockstar games') {
    return {
      method: 'cmd',
      cmd: 'appwiz.cpl',
      label: 'Rockstar / Programs & Features',
      message: 'Rockstar Games Launcher uninstalls go through Programs & Features.',
    };
  }
  if (platform === 'curseforge' && installDir) {
    return {
      method: 'open-folder',
      target: installDir,
      label: 'CurseForge instance folder',
      message:
        'CurseForge instances are uninstalled inside CurseForge itself (… → Delete Profile). Opening the folder lets you verify what’s on disk first.',
    };
  }
  if (installDir) {
    return {
      method: 'manual',
      target: installDir,
      cmd: 'appwiz.cpl',
      label: 'Manual',
      message:
        'GamePilot will open both Programs & Features and the install folder so you can choose how to remove it. GamePilot never deletes files itself.',
    };
  }
  return {
    method: 'cmd',
    cmd: 'appwiz.cpl',
    label: 'Programs & Features',
    message:
      'GamePilot couldn’t identify a launcher-specific uninstall path. Programs & Features will open so you can find and remove the title.',
  };
}

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('build-uninstall-plan', async (_event, game) => {
    try {
      if (process.platform === 'linux') {
        const isSteamGame = String(game?.platform || '').toLowerCase() === 'steam';
        return {
          ok: true,
          plan: isSteamGame
            ? {
                method: 'deeplink',
                url: 'steam://open/games',
                label: 'Steam Library',
                message: 'GamePilot will open your Steam Library. Use the game’s Manage menu to uninstall it safely.',
              }
            : {
                method: 'unsupported',
                label: 'Unsupported on Linux',
                message:
                  'This launcher is not supported in the Steam-first Linux beta. Manage the game with its original launcher.',
              },
        };
      }
      return { ok: true, plan: buildUninstallPlan(game) };
    } catch (err) {
      return { ok: false, error: err.message || 'plan-failed' };
    }
  });

  ipcMain.handle('start-uninstall', async (_event, payload) => {
    if (process.platform === 'linux') {
      const linuxGame = payload?.game || payload;
      if (String(linuxGame?.platform || '').toLowerCase() !== 'steam') {
        return {
          ok: false,
          error: 'This launcher is not supported in the Steam-first Linux beta.',
        };
      }
      try {
        await shell.openExternal('steam://open/games');
        return { ok: true, plan: { method: 'deeplink', label: 'Steam Library', url: 'steam://open/games' } };
      } catch (error) {
        return { ok: false, error: error.message || 'Could not open Steam.' };
      }
    }
    const game = payload?.game || payload;
    const plan = buildUninstallPlan(game);

    // Helper: spawn a command with argument array (safe from injection).
    const spawnArgs = (cmd, args) =>
      new Promise((resolve, reject) => {
        childExecFile(cmd, args, (err) => (err ? reject(err) : resolve()));
      });

    // Helper: open Programs & Features reliably. `control appwiz.cpl` is more
    // robust than bare `appwiz.cpl` which can fail silently.
    const openAppWiz = () => spawnArgs('control', ['appwiz.cpl']);

    // Helper: open a custom protocol URL (steam://, com.epicgames.launcher://,
    // etc.) via the Windows `start` command. This is MORE reliable than
    // shell.openExternal for custom protocols because Electron's openExternal
    // can silently succeed without actually launching the handler.
    const openProtocol = async (url) => {
      // Try `start` first — it goes through the Windows shell which properly
      // resolves protocol handlers. Using execFile with arg array prevents
      // command injection via malicious protocol URLs.
      try {
        await spawnArgs('cmd', ['/c', 'start', '', url]);
        return true;
      } catch (startErr) {
        console.warn(`[Uninstall] start command failed for ${url}:`, startErr.message);
      }
      // Try explorer.exe — it can also resolve protocol handlers and is
      // sometimes more reliable than `start` for custom protocols like
      // com.epicgames.launcher://
      try {
        await spawnArgs('explorer', [url]);
        return true;
      } catch (explorerErr) {
        console.warn(`[Uninstall] explorer failed for ${url}:`, explorerErr.message);
      }
      // Fall back to shell.openExternal
      try {
        await shell.openExternal(url);
        return true;
      } catch (extErr) {
        console.warn(`[Uninstall] shell.openExternal failed for ${url}:`, extErr.message);
        return false;
      }
    };

    const tryFallback = async (reason) => {
      console.warn(`[Uninstall] ${plan.label} primary method failed (${reason}), falling back to Programs & Features.`);
      try {
        await openAppWiz();
        if (plan.target) await shell.openPath(plan.target).catch(() => {});
        return { ok: true, plan: { ...plan, method: 'cmd', label: `${plan.label} (fallback)`, fallback: true } };
      } catch (fallbackErr) {
        return {
          ok: false,
          error: `Could not open ${plan.label} or Programs & Features. ${fallbackErr.message}`,
          plan,
        };
      }
    };

    try {
      if (plan.method === 'deeplink') {
        const success = await openProtocol(plan.url);
        if (!success) {
          return tryFallback('All protocol launch methods failed');
        }
      } else if (plan.method === 'cmd') {
        // Use `control appwiz.cpl` instead of bare `appwiz.cpl` for reliability.
        const cmd = plan.cmd === 'appwiz.cpl' ? 'control' : plan.cmd;
        const cmdArgs = plan.cmd === 'appwiz.cpl' ? ['appwiz.cpl'] : [];
        try {
          await spawnArgs(cmd, cmdArgs);
        } catch (cmdErr) {
          return tryFallback(`cmd failed: ${cmdErr.message}`);
        }
      } else if (plan.method === 'open-folder') {
        await shell.openPath(plan.target);
      } else if (plan.method === 'manual') {
        // Belt and braces: open both — user picks whichever path actually works.
        spawnArgs('control', ['appwiz.cpl']).catch((e) => console.warn('[Uninstall] appwiz.cpl error:', e.message));
        if (plan.target)
          await shell.openPath(plan.target).catch((e) => console.warn('[Uninstall] openPath error:', e.message));
      }
      return { ok: true, plan };
    } catch (err) {
      console.warn('[Uninstall] dispatch failed:', err.message);
      return { ok: false, error: err.message || 'dispatch-failed', plan };
    }
  });
}

module.exports = { registerIpcHandlers, buildUninstallPlan };
