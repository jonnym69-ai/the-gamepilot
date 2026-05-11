// UninstallCoachService.js
// Thin renderer wrapper around the main-process uninstall handoff.
//
// Critical contract: GamePilot NEVER deletes files. Every call here either
// opens a launcher deeplink (steam://uninstall, com.epicgames.launcher://…),
// shells out to Programs & Features (appwiz.cpl), or opens the install
// folder in Explorer for manual review. The actual deletion is always
// performed by the platform's official uninstaller. This keeps cloud saves,
// registry keys, and per-launcher state in a clean, supported state.

class UninstallCoachService {
  // Returns the uninstall plan for previewing in the confirm modal without
  // actually triggering it. The plan tells the UI which uninstaller will
  // open and what message to show the user.
  static async previewPlan(game) {
    const api = window.electronAPI?.buildUninstallPlan;
    if (!api) {
      return {
        ok: false,
        error: 'electron-only',
        plan: {
          method: 'unsupported',
          label: 'Desktop only',
          message: 'Uninstall hand-off is only available in the desktop app.'
        }
      };
    }
    try {
      const result = await api(game);
      return result || { ok: false, error: 'no-plan' };
    } catch (err) {
      return { ok: false, error: err.message || 'preview-failed' };
    }
  }

  static async start(game) {
    const api = window.electronAPI?.startUninstall;
    if (!api) return { ok: false, error: 'electron-only' };
    try {
      return await api({ game });
    } catch (err) {
      return { ok: false, error: err.message || 'start-failed' };
    }
  }
}

export default UninstallCoachService;
