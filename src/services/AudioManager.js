import StorageService from './StorageService';
import {
  ALL_BUTTON_PACKS,
  AMBIENT_PACK_LIBRARY,
  AMBIENT_PACK_OPTIONS,
  BUTTON_SFX_LIBRARY,
  BUTTON_SYNTH_PRESETS,
  MUSIC_PACK_LIBRARY,
  MUSIC_PACK_OPTIONS,
  SAMPLE_BUTTON_PACKS,
  THEME_TO_PACK
} from './AudioRewardCatalog';

const normalizeAmbientPackId = (packId) => (packId === 'dynamic' || AMBIENT_PACK_OPTIONS.includes(packId) ? packId : 'dynamic');
const normalizeMusicPackId = (packId) => (MUSIC_PACK_OPTIONS.includes(packId) ? packId : MUSIC_PACK_OPTIONS[0]);
const normalizeButtonPackId = (packId) => (ALL_BUTTON_PACKS.includes(packId) ? packId : 'analog-soft');

const loadButtonSampleSelection = () => {
  return StorageService.get('buttonSampleSelection', {});
};

const DEFAULT_SETTINGS = {
  ambientEnabled: StorageService.getString('ambientAudioEnabled', 'true') !== 'false',
  ambientSoundPack: normalizeAmbientPackId(StorageService.getString('ambientSoundPack', 'dynamic')),
  ambientVolume: parseFloat(StorageService.getString('ambientVolume', '0.35')),
  sfxEnabled: StorageService.getString('buttonSfxEnabled', 'true') !== 'false',
  buttonSoundPack: StorageService.getString('buttonSoundPack', 'analog-soft'),
  sfxVolume: parseFloat(StorageService.getString('buttonSfxVolume', '0.4')),
  musicEnabled: StorageService.getString('musicEnabled') === 'true',
  musicPack: normalizeMusicPackId(StorageService.getString('musicPack', 'retro-wave-track')),
  musicVolume: parseFloat(StorageService.getString('musicVolume', '0.35')),
  buttonSampleSelection: loadButtonSampleSelection()
};

const getAmbientAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/atmosphere/${file}`;
  }
  return `${base}/audio/atmosphere/${file}`;
};

const getMusicAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/music/${file}`;
  }
  return `${base}/audio/music/${file}`;
};

const getSfxAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/sfx/${file}`;
  }
  return `${base}/audio/sfx/${file}`;
};

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.globalClickHandler = null;
    this.currentAmbient = null;
    this.currentAmbientPack = null;
    this.currentMusic = null;
    this.currentMusicPack = null;
    this.lastThemeId = StorageService.getString('gamepilot-theme', 'relaxed');
    this.ambientBuffers = new Map();
    this.musicBuffers = new Map();
    this.previewTimeout = null;
    this.musicPreviewTimeout = null;
    this.buttonBuffers = new Map();
    this.buttonSampleCursor = {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      buttonSoundPack: normalizeButtonPackId(DEFAULT_SETTINGS.buttonSoundPack),
      buttonSampleSelection: { ...DEFAULT_SETTINGS.buttonSampleSelection }
    };
    this.settings.buttonSoundPack = normalizeButtonPackId(this.settings.buttonSoundPack);
    this.settings.ambientSoundPack = normalizeAmbientPackId(this.settings.ambientSoundPack);
    this.settings.musicPack = normalizeMusicPackId(this.settings.musicPack);
  }

  getSettings() {
    return { ...this.settings };
  }

  getAmbientPacks() {
    return AMBIENT_PACK_OPTIONS.map((id) => ({
      id,
      label: AMBIENT_PACK_LIBRARY[id]?.name || id,
      description: AMBIENT_PACK_LIBRARY[id]?.description || '',
      unlocked: true,
      requiredXP: 0
    }));
  }

  getMusicPacks() {
    return MUSIC_PACK_OPTIONS.map((id) => ({
      id,
      label: MUSIC_PACK_LIBRARY[id]?.name || id,
      description: MUSIC_PACK_LIBRARY[id]?.description || '',
      unlocked: true,
      requiredXP: 0
    }));
  }

  getButtonPacks() {
    return ALL_BUTTON_PACKS.map((id) => ({
      id,
      label: (BUTTON_SFX_LIBRARY[id]?.name || BUTTON_SYNTH_PRESETS[id]?.name || id),
      description: (BUTTON_SFX_LIBRARY[id]?.description || BUTTON_SYNTH_PRESETS[id]?.description || ''),
      unlocked: true,
      requiredXP: 0,
      type: SAMPLE_BUTTON_PACKS.includes(id) ? 'sample' : 'synth'
    }));
  }

  getSamplesForPack(packId) {
    const files = BUTTON_SFX_LIBRARY[packId]?.files || [];
    return files.map((file, index) => ({
      file,
      label: `Sample ${index + 1}`
    }));
  }

  isAmbientUnlocked() {
    return true;
  }

  isMusicUnlocked() {
    return true;
  }

  isAudioUnlocked() {
    return true;
  }

  isButtonPackUnlocked() {
    return true;
  }

  isAmbientPackUnlocked() {
    return true;
  }

  isMusicPackUnlocked() {
    return true;
  }

  resolveUnlockedButtonPack(packId) {
    return normalizeButtonPackId(packId);
  }

  resolveUnlockedAmbientPack(packId) {
    return normalizeAmbientPackId(packId);
  }

  resolveUnlockedMusicPack(packId) {
    return normalizeMusicPackId(packId);
  }

  resolveDynamicAmbientPack(themeId) {
    return THEME_TO_PACK[themeId] || 'campfire';
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.9;
    this.ambientGain = this.audioContext.createGain();
    this.ambientGain.gain.value = this.settings.ambientVolume;
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = this.settings.musicVolume;

    this.ambientGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);

    const resume = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };

    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });

    return this.audioContext;
  }

  init() {
    this.ensureContext();
  }

  bindGlobalClickSfx() {
    if (typeof document === 'undefined' || this.globalClickHandler) return;
    this.globalClickHandler = (event) => {
      if (!this.settings.sfxEnabled) return;
      const target = event.target;
      if (!target) return;
      const clickable = target.closest('button, .btn, [data-sfx]');
      if (clickable && clickable.dataset?.sfx !== 'none') {
        const variant = clickable.dataset?.sfxVariant || 'primary';
        this.playButtonSfx(variant);
      }
    };
    document.addEventListener('click', this.globalClickHandler, true);
  }

  unbindGlobalClickSfx() {
    if (typeof document === 'undefined' || !this.globalClickHandler) return;
    document.removeEventListener('click', this.globalClickHandler, true);
    this.globalClickHandler = null;
  }

  saveSetting(key, value) {
    this.settings[key] = value;
  }

  setAmbientEnabled(enabled) {
    this.saveSetting('ambientEnabled', enabled);
    StorageService.setString('ambientAudioEnabled', enabled ? 'true' : 'false');
    if (!enabled) {
      this.stopAmbient();
    } else {
      this.playAmbientForTheme();
    }
  }

  setAmbientPack(pack) {
    const resolved = normalizeAmbientPackId(pack);
    this.saveSetting('ambientSoundPack', resolved);
    StorageService.setString('ambientSoundPack', resolved);
    this.playAmbientForTheme();
  }

  setAmbientVolume(value) {
    this.saveSetting('ambientVolume', value);
    StorageService.setString('ambientVolume', value.toString());
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.05);
    }
  }

  setMusicEnabled(enabled) {
    this.saveSetting('musicEnabled', enabled);
    StorageService.setString('musicEnabled', enabled ? 'true' : 'false');
    if (!enabled) {
      this.stopMusic();
    } else {
      this.playMusicPack();
    }
  }

  setMusicPack(packId) {
    const resolved = normalizeMusicPackId(packId);
    this.saveSetting('musicPack', resolved);
    StorageService.setString('musicPack', resolved);
    this.playMusicPack(resolved);
  }

  setMusicVolume(value) {
    this.saveSetting('musicVolume', value);
    StorageService.setString('musicVolume', value.toString());
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.05);
    }
  }

  async loadAmbientBuffer(packId) {
    const metadata = AMBIENT_PACK_LIBRARY[packId];
    if (!metadata) {
      throw new Error(`Unknown ambient pack: ${packId}`);
    }
    if (this.ambientBuffers.has(packId)) {
      return this.ambientBuffers.get(packId);
    }
    const ctx = this.ensureContext();
    if (!ctx) return null;

    const assetPath = getAmbientAssetPath(metadata.file);
    const response = await fetch(assetPath);
    if (!response.ok) {
      throw new Error(`Failed to load ambient asset: ${assetPath}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    this.ambientBuffers.set(packId, buffer);
    return buffer;
  }

  async startAmbientPack(packId) {
    // Atmosphere disabled for performance
    return;
  }

  stopAmbient() {
    this.currentAmbient = null;
    this.currentAmbientPack = null;
  }

  playAmbientForTheme(themeId) {
    // Atmosphere disabled for performance
    return;
  }

  async loadMusicBuffer(packId) {
    const metadata = MUSIC_PACK_LIBRARY[packId];
    if (!metadata) {
      throw new Error(`Unknown music pack: ${packId}`);
    }
    if (this.musicBuffers.has(packId)) {
      return this.musicBuffers.get(packId);
    }
    const ctx = this.ensureContext();
    if (!ctx) return null;

    const assetPath = getMusicAssetPath(metadata.file);
    const response = await fetch(assetPath);
    if (!response.ok) {
      throw new Error(`Failed to load music asset: ${assetPath}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    this.musicBuffers.set(packId, buffer);
    return buffer;
  }

  async startMusicPack(packId) {
    // Music disabled for performance
    return;
  }

  stopMusic() {
    this.currentMusic = null;
    this.currentMusicPack = null;
  }

  playMusicPack(packId) {
    // Music disabled for performance
    return;
  }

  previewMusicPack(packId) {
    // Music disabled for performance
    return;
  }

  async loadSfxBuffer(file) {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const assetPath = getSfxAssetPath(file);
    try {
      const response = await fetch(assetPath);
      if (!response.ok) {
        throw new Error(`Failed to load sfx asset: ${assetPath}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await new Promise((resolve, reject) => {
        ctx.decodeAudioData(arrayBuffer, resolve, reject);
      });
      this.buttonBuffers.set(file, buffer);
      return buffer;
    } catch (error) {
      console.error('Error loading sfx buffer', file, error);
      return null;
    }
  }

  triggerSamplePlayback(file) {
    if (!file) return;
    this.loadSfxBuffer(file).then((buffer) => {
      if (!buffer) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = this.settings.sfxVolume;
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
    });
  }

  getAvailableSampleFiles(packId) {
    return BUTTON_SFX_LIBRARY[packId]?.files || [];
  }

  getNextSampleFile(packId) {
    const files = this.getAvailableSampleFiles(packId);
    if (!files.length) return null;
    const cursor = this.buttonSampleCursor[packId] || 0;
    const nextFile = files[cursor % files.length];
    this.buttonSampleCursor[packId] = (cursor + 1) % files.length;
    return nextFile;
  }

  getSelectedButtonSample(packId) {
    const selection = this.settings.buttonSampleSelection?.[packId];
    if (!selection) return null;
    return this.getAvailableSampleFiles(packId).includes(selection) ? selection : null;
  }

  getSampleFileForPlayback(packId) {
    const selected = this.getSelectedButtonSample(packId);
    if (selected) return selected;
    return this.getNextSampleFile(packId);
  }

  previewButtonSample(packId, file) {
    if (!SAMPLE_BUTTON_PACKS.includes(packId)) return;
    if (!this.settings.sfxEnabled) return;
    const files = this.getAvailableSampleFiles(packId);
    const resolvedFile = file && files.includes(file) ? file : this.getSampleFileForPlayback(packId);
    if (!resolvedFile) return;
    this.triggerSamplePlayback(resolvedFile);
  }

  saveButtonSampleSelection(selection) {
    this.settings.buttonSampleSelection = selection;
    StorageService.set('buttonSampleSelection', selection);
  }

  setButtonSampleSelection(packId, file) {
    if (!SAMPLE_BUTTON_PACKS.includes(packId)) return;
    const files = this.getAvailableSampleFiles(packId);
    const next = { ...(this.settings.buttonSampleSelection || {}) };
    if (!file || !files.includes(file)) {
      delete next[packId];
    } else {
      next[packId] = file;
    }
    this.saveButtonSampleSelection(next);
  }

  getButtonSampleSelection() {
    return { ...(this.settings.buttonSampleSelection || {}) };
  }

  playSampleButtonSfx(packId) {
    const file = this.getSampleFileForPlayback(packId);
    if (!file) return;
    this.triggerSamplePlayback(file);
  }

  playSynthButtonSfx(packId, variant = 'primary') {
    const preset = BUTTON_SYNTH_PRESETS[packId] || BUTTON_SYNTH_PRESETS['synth-soft'];
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = preset.type;
    const gain = ctx.createGain();
    const duration = preset.duration;
    const now = ctx.currentTime;
    const freqOffset = variant === 'secondary' ? 0.85 : variant === 'danger' ? 0.65 : 1;
    osc.frequency.setValueAtTime(preset.startFreq * freqOffset, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, preset.endFreq * freqOffset), now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.settings.sfxVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  setSfxEnabled(enabled) {
    this.saveSetting('sfxEnabled', enabled);
    StorageService.setString('buttonSfxEnabled', enabled ? 'true' : 'false');
  }

  setButtonPack(pack) {
    const resolved = normalizeButtonPackId(pack);
    this.saveSetting('buttonSoundPack', resolved);
    StorageService.setString('buttonSoundPack', resolved);
  }

  setSfxVolume(value) {
    this.saveSetting('sfxVolume', value);
    StorageService.setString('buttonSfxVolume', value.toString());
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.02);
    }
  }

  shutdown() {
    this.stopAmbient();
    this.stopMusic();
    this.unbindGlobalClickSfx();
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    if (this.musicPreviewTimeout) {
      clearTimeout(this.musicPreviewTimeout);
      this.musicPreviewTimeout = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (err) {
        // ignore
      }
    }
    this.audioContext = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
  }

  playButtonSfx(variant = 'primary') {
    if (!this.settings.sfxEnabled) return;
    const packId = normalizeButtonPackId(this.settings.buttonSoundPack);
    if (packId !== this.settings.buttonSoundPack) {
      this.saveSetting('buttonSoundPack', packId);
      StorageService.setString('buttonSoundPack', packId);
    }
    if (SAMPLE_BUTTON_PACKS.includes(packId)) {
      this.playSampleButtonSfx(packId);
    } else {
      this.playSynthButtonSfx(packId, variant);
    }
  }
}

export const audioManager = new AudioManager();
